const HexToWords = require("guid-in-words");
const { Client } = require("pg");
const hostile = require("hostile");
const { execSync, exec } = require("child_process", { stdio: ["pipe", "pipe", "pipe"] });
const fs = require("fs");
let sql;
try {
    sql = new Client({
        host: "localhost", // Postgres ip address or domain name
        port: 5432, // Postgres server port
        database: "vooosh", // Name of database to connect to
        user: "vooosh", // Username of database user
        password: "admin", // Password of database user
    });

    sql.connect();
} catch (e) {
    console.error("Error connecting to db");
    process.exit(0);
}

const deploy = async (branchName) => {
    //GENERER RANDOMURL
    const randomStr = HexToWords.randomGuid().words.split(" ").slice(0, 3).join("-");
    const randomUrl = `${randomStr}.mledoux.fr`;
    console.log(randomStr, randomUrl);

    //CREER DB (name = RANDOMURL)
    try {
        const query = `CREATE DATABASE "${randomStr}"`;
        console.log(query);
        await sql.query(query);

        console.log("db created");
        sql.end();
    } catch (e) {
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
        execSync(
            `git clone --single-branch --branch ${branchName} git@github.com:astahmer/vooosh ./app/${randomStr}`
        );
    } catch (e) {
        console.error("Error cloning repo", e);
        process.exit(0);
    }

    //COPIER template-docker-compose DANS /app/[randomUrl] en changeant la variable VIRTUAL_HOST
    console.log("reading template docker file");
    const templateDockerfile = fs.readFileSync("./template-dockerfile", "utf-8");
    fs.writeFileSync(`./app/${randomStr}/Dockerfile`, templateDockerfile);
    const templateDockerCompose = fs.readFileSync("./template-docker-compose.yml", "utf-8");
    const newDockerCompose = templateDockerCompose
        .replace("{{VIRTUAL_HOST}}", randomUrl)
        .replace("{{DB_NAME}}", randomStr);
    fs.writeFileSync(`./app/${randomStr}/docker-compose.yml`, newDockerCompose);
    //	console.log('red', template);
    //const appDockerfile = template.replace("{{DB_NAME}}", randomStr);
    //LANCER docker-compose DU SERVEUR
    try {
        process.chdir(`./app/${randomStr}`);
        console.log("building");
        execSync("docker-compose up -d").toString();
        console.log("running");
    } catch (e) {
        console.error("Error starting docker compose", e);
        process.exit(0);
    }
};

deploy(process.argv[2]);
