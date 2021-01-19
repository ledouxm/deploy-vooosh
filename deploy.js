const HexToWords = require("guid-in-words");
const postgres = require("postgres");
const hostile = require("hostile");
const { exec } = require("child_process");

const sql = postgres("postgres://username:password@host:port/database", {
    host: "localhost", // Postgres ip address or domain name
    port: 5432, // Postgres server port
    database: "vooosh", // Name of database to connect to
    username: "vooosh", // Username of database user
    password: "admin", // Password of database user
});

const deploy = async (branchName) => {
    //GENERER RANDOMURL
    const randomStr = HexToWords.randomGuid();
    const randomUrl = `${randomStr}.mledoux.fr`;

    //CREER DB (name = RANDOMURL)
    console.log("creating db", randomUrl);
    sql`CREATE DATABASE ${randomUrl}`;

    //SET VIRTUAL HOST (127.0.0.1 RANDOMURL)
    try {
        console.log("setting virtual host");
        await hostile.set("127.0.0.1", randomUrl);
    } catch (e) {
        console.error("Error setting virtual host", e);
        exit(0);
    }

    //CREER DOSSIER /app/[RANDOMURL]
    try {
        console.log(`mkdir ./app/${randomStr}`);
        await exec(`mkdir ./app/${randomStr}`);
    } catch (e) {
        console.error("Error creating folder", e);
        exit(0);
    }

    //CLONE BRANCHE process.argv[2]
    try {
        console.log(
            `git clone --single-branch --branch ${branchName} git@github.com:ledouxm/vooosh`
        );
        await exec(
            `git clone --single-branch --branch ${branchName} git@github.com:ledouxm/vooosh`
        );
    } catch (e) {
        console.error("Error cloning repo", e);
        exit(0);
    }

    //COPIER template-docker-compose DANS /app/[randomUrl] en changeant la variable VIRTUAL_HOST
    const template = fs.readFileSync("./template-dockerfile");
    const appDockerfile = template.replace("{{DB_NAME}}", randomStr);
    fs.writeFileSync(`./app/${randomStr}/Dockerfile`, appDockerfile);

    //LANCER docker-compose DU SERVEUR
    try {
        process.chdir(`./app/${randomStr}`);
        await exec(`docker build -t ${randomStr} ./`);
        await exec(`docker run -d -e VIRTUAL_HOST=${randomUrl} ${randomStr}`);
    } catch (e) {
        console.error("Error starting docker compose", e);
        exit(0);
    }
};

deploy(process.argv[2]);
