
import express from "express";
// import dotenv from "dotenv";
import dotenvFlow from "dotenv-flow";
// dotenv.config();
dotenvFlow.config();
import mariadb from "mariadb";

import http from "http";
import https from "https";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path"

import { SafeUser, User, UserRole, UserColor } from "./types/user.js";

const HTTP_PORT = process.env.NODE_ENV === "development" ? 3001 : 80;
const HTTPS_PORT = process.env.NODE_ENV === "development" ? 3002 : 443;
const PAGES = "pages";
const MAIN_PAGE = "index.html";
const LOGIN_PAGE = "login.html";

console.log("HTTP-port: ", HTTP_PORT);
console.log("HTTPS-port: ", HTTPS_PORT);


const { CERT, CERT_KEY, PASSPHRASE } = process.env;
if (!CERT || !CERT_KEY) throw new Error("Переменные среды не определены.");
const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __root = join(__dirname, "..");

const mainPage = join(__root, PAGES, MAIN_PAGE);
const loginPage = join(__root, PAGES, LOGIN_PAGE);

const serverOptions = {
    cert: readFileSync(CERT),
    key: readFileSync(CERT_KEY),
    passphrase: PASSPHRASE
}
const pool = mariadb.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    connectionLimit: 5
});

const app = express();
app.use(express.static("assets"));

const httpServer = http.createServer((req, res) => {
    const host = req.headers.host?.split(":")[0];
    const redirectUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: redirectUrl });
    res.end();
});
const httpsServer = https.createServer(serverOptions, app);

async function findUserByName(str: string): Promise <User | null> {
    let conn;
    const sqlQuery = "SELECT * FROM users WHERE user = ?";
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(sqlQuery, str);
        if (!rows[0]) {
            return null;
        }
        return rows[0];
    } catch(err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}

app.get("/", (req, res) => {
    console.log("Мистер жопа");
    console.log(process.env.NODE_ENV);
    res.status(200).sendFile(mainPage);
});
app.get("/get_user", async (req, res) => {
    const pupel: User | null = await findUserByName("Mark_SW");
    if (pupel === null) {
        res.status(200).send("Ничего не нашлось.");
        return;
    }
    res.status(200).send(pupel.user);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${HTTP_PORT}`);
});
httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
});