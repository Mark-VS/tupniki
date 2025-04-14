
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import https from "https";
import { readFileSync } from "node:fs";

const HTTP_PORT = 3001;
const HTTPS_PORT = 3002;

const { CERT, CERT_KEY, PASSPHRASE } = process.env;
if (!CERT || !CERT_KEY) throw new Error("fuck");

const serverOptions = {
    cert: readFileSync(CERT),
    key: readFileSync(CERT_KEY),
    passphrase: PASSPHRASE
}
const app = express();

const httpServer = http.createServer((req, res) => {
    const host = req.headers.host?.split(":")[0];
    const redirectUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: redirectUrl });
    res.end();
});
const httpsServer = https.createServer(serverOptions, app);

app.get("/", (req, res) => {
    res.status(200).send("Ты зашёл на главную страничку.");
});
app.get("/kaka", (req, res) => {
    res.status(200).send("Ты зашёл на страничку КАКА.");
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${HTTP_PORT}`);
});
httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
});