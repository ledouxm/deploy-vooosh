const HexToWords = require("guid-in-words");
const postgres = require("postgres");
const hostile = require("hostile");
const { execSync, exec } = require("child_process", { stdio: ['pipe', 'pipe', 'pipe'] });
const fs = require('fs');
let sql;
try{
	sql = postgres("postgres://username:password@host:port/database", {
	    host: "localhost", // Postgres ip address or domain name
	    port: 5432, // Postgres server port
	    database: "vooosh", // Name of database to connect to
	    username: "vooosh", // Username of database user
	    password: "admin", // Password of database user
	});
}catch(e){
	console.error("Error connecting to db");
	process.exit(0);
}

const deploy = async (branchName) => {
    //GENERER RANDOMURL
    const randomStr = HexToWords.randomGuid().words.split(' ').slice(0, 3).join('-');
    const randomUrl = `${randomStr}.mledoux.fr`;
	console.log(randomStr, randomUrl);

    //CREER DB (name = RANDOMURL)
	try{
	    console.log("creating db", randomUrl);
	    sql`CREATE DATABASE ${randomUrl}`;
	} catch(e){
		console.error("Error creating db", e);
		process.exit(0);
	}
    //SET VIRTUAL HOST (127.0.0.1 RANDOMURL)
    try {
        console.log("setting virtual host");
        hostile.set("127.0.0.1", randomUrl);
    } catch (e) {
        console.error("Error setting virtual host", e);
        process.exit(0);
    }

    //CREER DOSSIER /app/[RANDOMURL]
    try {
        console.log(`mkdir ./app/${randomStr}`);
        execSync(`mkdir -p ./app/${randomStr}`);
    } catch (e) {
        console.error("Error creating folder", e);
        process.exit(0);
    }

    //CLONE BRANCHE process.argv[2]
    try {
        console.log(
            `git clone --single-branch --branch ${branchName} git@github.com:ledouxm/vooosh`
        );
        execSync(`git clone --single-branch --branch ${branchName} git@github.com:astahmer/vooosh ./app/${randomStr}`);
    } catch (e) {
        console.error("Error cloning repo", e);
        process.exit(0);
    }

    //COPIER template-docker-compose DANS /app/[randomUrl] en changeant la variable VIRTUAL_HOST
	console.log("reading template docker file");
    const template = fs.readFileSync("./template-dockerfile", 'utf-8');
//	console.log('red', template);
//const appDockerfile = template.replace("{{DB_NAME}}", randomStr);
    fs.writeFileSync(`./app/${randomStr}/Dockerfile`, template);
    //LANCER docker-compose DU SERVEUR
    try {
        process.chdir(`./app/${randomStr}`);
	console.log('building');
        exec(`docker build -t ${randomStr} ./`, (error, stdout, stderr) => {
	  if (error) {
	    console.error(`exec error: ${error}`);
	    return;
	  }
	  console.log(`stdout: ${stdout}`);
	  console.error(`stderr: ${stderr}`);
	});
        console.log('running');
	//execSync(`docker run -d -e VIRTUAL_HOST=${randomUrl} ${randomStr}`).toString();
    } catch (e) {
        console.error("Error starting docker compose", e);
        process.exit(0);
    }
};

deploy(process.argv[2]);
