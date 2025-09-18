import { db } from "~/server/db";
import { sslManager } from "./certbot/ssl";
import { DovecotManager, SetupDovecot } from "./mail/dovecot/setup";
import { SetupPostfix } from "./mail/postfix/setup";
import { SetupMysql } from "./mysql/setup";

export async function Setup() {
    const user = await db.user.findFirstOrThrow({ where: { Admin: true } })
    if (!user) {
        throw new Error("No admin user found. Please create an admin user first.");
    }
    const domain = await db.domain.findFirstOrThrow({
        include: {},
        where: { domain: "kosmix.me" }
    })
    console.log("Created default domain: example.com")
    // const ssl = await sslManager.requestCertificate([domain], user.email ?? "flo.cl25spt@gmail.com", user)
    const ssl = await db.ssl.findFirstOrThrow({
        include: { domains: true },
        where: { domains: { some: { domain: "kosmix.me" } } }
    })


    // await SetupPostfix({
    //     domain: domain,
    //     dbName: "mailserver",
    //     dbPassword: "mailserverpassword",
    //     dbUser: "mailuser",
    // })
    //     rootPassword: "rootpassword",
    //     dbName: "mailserver",
    //     dbPassword: "mailserverpassword",
    //     dbUser: "mailuser",
    // await SetupDovecot({
    //     mailserverDb: "mailserver",
    //     mailserverPassword: "mailserverpassword",
    //     mailserverUser: "mailuser",
    //     mainDomain: domain,
    //     ssl,
    // })
    // DovecotManager.AddSsl([domain], ssl)

}
Setup()