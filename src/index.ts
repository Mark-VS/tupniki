
import express from "express";
import type { Response, Request, NextFunction } from "express";
// import dotenv from "dotenv";
import dotenvFlow from "dotenv-flow";
// dotenv.config();
dotenvFlow.config();
import mariadb from "mariadb";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt, { Algorithm } from "jsonwebtoken";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, VerifiedCallback } from "passport-jwt";

import http from "http";
import https from "https";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path"

import type { SafeUser, FullUser, UserRole, UserColor, JwtPayload } from "./types/user.js";
import type { NicknameInterface } from "./types/nickname.js";

const HTTP_PORT = process.env.NODE_ENV === "development" ? 3001 : 80;
const HTTPS_PORT = process.env.NODE_ENV === "development" ? 3002 : 443;
const PAGES = "pages";
const MAIN_PAGE = "index.html";
const LOGIN_PAGE = "login.html";
const REG_PAGE = "reg.html";
const PROTECTED_PAGE = "protected.ejs";
const NIKI_PAGE = "niki.html";
const NICKINFO_PAGE = "nickinfo.ejs";
const NICKINFO_TEST_PAGE = "nickinfo.html";

console.log("HTTP-port: ", HTTP_PORT);
console.log("HTTPS-port: ", HTTPS_PORT);

const { CERT, CERT_KEY, PASSPHRASE } = process.env;
if (!CERT || !CERT_KEY) throw new Error("Переменные среды не определены.");
const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;
const TOKEN_EXPIRATION = 60; // 1 минута


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __root = join(__dirname, "..");

const mainPage = join(__root, PAGES, MAIN_PAGE);
const loginPage = join(__root, PAGES, LOGIN_PAGE);
const regPage = join(__root, PAGES, REG_PAGE);
// const nikiPage = NIKI_PAGE;
const nikiPage = join(__root, PAGES, NIKI_PAGE);
// veiws
const protectedPage = PROTECTED_PAGE;
const nickInfoPage = NICKINFO_PAGE;
const nickInfoTestPage = join(__root, PAGES, NICKINFO_TEST_PAGE);    // временная

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
const urlEncodedParser = express.urlencoded({ extended: true });
app.use(express.static("assets"));
// app.use(express.static(join(__dirname, "assets")));
app.set("view engine", "ejs");
// Указываем путь к папке с шаблонами - дефолтное значение
app.set("views", join(__root, "views"));

const httpServer = http.createServer((req, res) => {
    const host = req.headers.host?.split(":")[0];
    const redirectUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: redirectUrl });
    res.end();
});
const httpsServer = https.createServer(serverOptions, app);

async function findUserByName(str: string): Promise <FullUser | null> {
    let conn;
    const sqlQuery = "SELECT * FROM users WHERE name = ?";
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

async function findNicknameByName(str: string): Promise <NicknameInterface | null> {
    let conn;
    const sqlQuery = "SELECT * FROM nicknames WHERE nickname = ?;";
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(sqlQuery, str);
        if (!rows[0])
            return null;
        return rows[0];
    } catch(err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}
async function getNicknames(): Promise<NicknameInterface[] | null> {
    let conn;
    const sqlQuery = "SELECT * FROM nicknames;";
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(sqlQuery);
        if (!rows)
            return null;
        return rows;
    } catch(err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
}


const opts = {
    jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.token
    ]),
    secretOrKey: "secret",
    algorithms: ["HS256"] as Algorithm[]
}
passport.use(new JwtStrategy(opts, async (jwt_payload: JwtPayload, done: VerifiedCallback): Promise<void> => {
    try {
        const user: FullUser | null = await findUserByName(jwt_payload.data);
        if (!user)
            return done(null, false);
        const { pass, ...rest } = user;
        const safeUser: SafeUser = rest;
        return done(null, safeUser);
    } catch(err) {
        return done(err, false);
    }
}));

const requireAuthCustom = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate("jwt", { session: false }, (err: Error | null, user: SafeUser) => {
        if (err || !user) {
            res.status(401).send("Ты не аутентифицирован.");
            return;
        }
        req.user = user;
        next();
    })(req, res, next);
}

app.get("/", (req, res) => {
    res.status(200).sendFile(mainPage);
});
app.get("/get_user", async (req, res) => {
    const pupel: FullUser | null = await findUserByName("Mark_SW");
    if (pupel === null) {
        res.status(200).send("Ничего не нашлось.");
        return;
    }
    res.status(200).send(pupel.name);
});

app.get("/login", (req, res) => {
    res.status(200).sendFile(loginPage);
});
app.post("/login", urlEncodedParser, async (req, res) => {
    try {
        const { loginField, passField } = req.body;
        const user: FullUser | null = await findUserByName(loginField);
        if (user === null) {
            res.status(404).send("Ошибка: Пользователь не найден");
            return;
        }
        if (!await bcrypt.compare(passField, user.pass)) {
            res.status(403).send("Ошибка: Неправильный пароль.");
            return;    
        }
        
        const token = jwt.sign({ data: user.name }, "secret", {
            expiresIn: TOKEN_EXPIRATION,
            algorithm: "HS256"
        });
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            secure: true,
            maxAge: TOKEN_EXPIRATION * 1000
        });
        
        res.status(200).send("Ответ на форму! " + "loginField: " + loginField);
    } catch (err) {
        res.status(200).send("Ошибка: " + err);
    }
});

app.get("/nicknames", async (req, res) => {
    const nickArray = await getNicknames();
    if (nickArray === null) {
        res.status(200).send("ничего не найдено.");
        return;
    }
    /*
    for (let i=0; i<rrr.length; i++) {
        console.log(rrr[i]);
    }
    */
    
    const ddd = nickArray[5].reg+"Z";
    const aaa = nickArray[5].reg;
    console.log(ddd);
    console.log(aaa);
    
    res.status(200).sendFile(nikiPage);
  
});


app.get("/getkukuruza", async (req, res) => {
    const nickArray = await getNicknames();
    if (nickArray === null) {
        res.status(200).json({ error: "Ошибочка.", rrr: null });
        return;
    }
    res.status(200).json({ error: null, rrr: nickArray });
});
app.get("/kukuruza", async (req, res) => {
    res.status(200).sendFile(nikiPage);
});

/*
app.get("/nickinfo", async (req, res) => {
    const nicknameToFind = req.query.nickname
    console.log(nicknameToFind);
    if (typeof nicknameToFind !== "string") {
        res.status(200).send("Ты нифига не передал.");
        return;  
    }
    if (!nicknameToFind) {
        res.status(200).send("Пустая строка");
        return;
    }

    const lll: NicknameInterface | null = await findNicknameByName(nicknameToFind);
    if (!lll) {
        res.status(200).send(`Никнейм "${nicknameToFind}" не найден в базе данных.`);
        return;
    }
    res.status(200).render(nickInfoPage, { nick: lll });
   
});
*/


app.get("/nickinfo", async (req, res) => {
    try {
        const nicknameToFind = req.query.nickname
        console.log(nicknameToFind);
        if (typeof nicknameToFind !== "string")
            throw new Error("Ты нифига не передал.");
        if (!nicknameToFind)
            throw new Error("Пустая строка.");
        const lll: NicknameInterface | null = await findNicknameByName(nicknameToFind);
        if (!lll)
            throw new Error(`Никнейм "${nicknameToFind}" не найден в базе данных.`);
        res.status(200).render(nickInfoPage, { nick: lll });
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).send(err.message);
        } else {
            res.status(500).send("Произошла неизвестная ошибка.");
        }
    }
    
});

// Временная страничка - создание nickInfoPage
app.get("/testinfo", (req, res) => {
    res.status(200).sendFile(nickInfoTestPage);
});



app.get("/protected", cookieParser(), requireAuthCustom, (req, res) => {
    const cUser = req.user?.name;
    res.status(200).render(protectedPage, { myKey: cUser });
});
    
app.get("/reg", (req, res) => {
    res.status(200).sendFile(regPage);
});
app.post("/reg", urlEncodedParser, async (req, res) => {
    let conn;
    const sqlQuery = `INSERT INTO users VALUES(DEFAULT, ?, ?, "mark-sw@yandex.ru", "user", "blue");`;
    try {
        const { regField,  passField} = req.body;
        if (!regField || !passField) {
            throw new Error("regField, или passField не определены.");
        }
        // Создаём соль и хэш на её основе.
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(passField, salt);
        
        conn = await pool.getConnection();
        const rows = await conn.query(sqlQuery, [regField, hash]);
        console.log("res: ", rows);
        
    } catch(err) {
        throw err;
    } finally {
        if (conn) conn.end();
    }
    res.status(200).send("Ответ на форму регистрации.");
});

app.get("/kakasha/:kaka/:perd", (req, res) => {
    const shusha = req.params.kaka;
    const shusha2 = req.params.perd;
    console.log(shusha);
    console.log(shusha2);
    res.status(200).send("ffafa: " + shusha + ", " + shusha2);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${HTTP_PORT}`);
});
httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
});