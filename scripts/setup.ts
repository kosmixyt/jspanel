import { db } from "~/server/db";
import { SSLManager } from "./certbot/ssl";
import { DovecotManager, SetupDovecot } from "./mail/dovecot/setup";
import { SetupPostfix } from "./mail/postfix/setup";
import { SetupMysql } from "./mysql/setup";
import { DKIM } from "./mail/dkim/dkim";
import { SetupCertbot } from "./certbot/setup";
import { SetupDkim } from "./mail/dkim/setup";
import type { User } from "@prisma/client";
import mysql from "mysql2/promise"
import { MailManager } from "./mail/manager";
import { DomainManager } from "./domains/domains";

let localDatabase: null | mysql.Connection = null
export const mysqlLocalDbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'rootpassword',
}
export const MailserverName = "mailserver"
export async function getDatabase() {
    if (localDatabase) return localDatabase
    localDatabase = await mysql.createConnection({
        ...mysqlLocalDbConfig,
        multipleStatements: true,
    })
    return localDatabase
}


export async function Setup() {
    await SetupMysql({
        dbName: "mailserver",
        dbPassword: "mailserverpassword",
        dbUser: "mailuser",
        rootPassword: "rootpassword",
    })
    const user = await getAdminUser()
    const domain = await getMainDomain(user)
    console.log("Created default domain: kosmix.me")
    await SetupCertbot();
    // const ssl = await sslManager.requestCertificate([domain], user.email ?? "flo.cl25spt@gmail.com", user)
    const ssl = await db.ssl.findFirstOrThrow({
        where: { domains: { some: { id: domain.id } }, }
        , include: { domains: true }
    })

    await SetupPostfix({
        domain: domain,
        dbName: "mailserver",
        dbPassword: "mailserverpassword",
        dbUser: "mailuser",
    })
    await SetupDovecot({
        mailserverDb: "mailserver",
        mailserverPassword: "mailserverpassword",
        mailserverUser: "mailuser",
        mainDomain: domain,
        ssl,
    })
    await SetupDkim()
    DKIM.setupPostfix()
    DovecotManager.AddSsl([domain], ssl)
    DKIM.addDomain(domain)
    // restart dkim and postfix
    await DovecotManager.restart()
    await DKIM.restart()
}
// Setup()

async function getAdminUser() {
    let user = await db.user.findFirstOrThrow({ where: { Admin: true } })
    if (!user) {
        user = await db.user.create({
            data: {
                email: "admin@example.com",
                name: "Admin",
                Admin: true,
            }
        })
    }
    return user;
}
async function getMainDomain(user: User) {
    let domain = await db.domain.findFirst({ where: { domain: "kosmix.me" } })
    if (!domain) {
        domain = await db.domain.create({
            data: {
                domain: "kosmix.me",
                Owner: {
                    connect: {
                        id: user.id
                    }

                }
            }
        })
        console.log("Created default domain: kosmix.me")
    }
    return domain;
}
async function main() {
    console.log("Starting setup...")
    const connection = await getDatabase();
    console.log("Connected to database")
    const user = await getAdminUser()
    const domain = await DomainManager.addDomain("test2.kosmix.me", user, { enableEmail: true, emailConfig: { dkimSetup: true }, requestSsl: true })
    DomainManager.NewMailBox(domain, user, "test", "testpassword")
}
main()