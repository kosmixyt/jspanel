import { db } from "~/server/db";
import { sslManager } from "./certbot/ssl";
import { DovecotManager, SetupDovecot } from "./mail/dovecot/setup";
import { SetupPostfix } from "./mail/postfix/setup";
import { SetupMysql } from "./mysql/setup";
import { DKIM } from "./mail/dkim/dkim";
import { SetupCertbot } from "./certbot/setup";
import { SetupDkim } from "./mail/dkim/setup";

export async function Setup() {
    // await SetupMysql({
    //     dbName: "mailserver",
    //     dbPassword: "mailserverpassword",
    //     dbUser: "mailuser",
    //     rootPassword: "rootpassword",
    // })
    // const user = await db.user.create({
    //     data: {
    //         email: "flo.cl25spt@gmail.com",
    //         Admin: true,
    //         name: "Admin",
    //     }
    // })
    // if (!user) {
    //     throw new Error("No admin user found. Please create an admin user first.");
    // }
    // const domain = await db.domain.create({
    //     data: {
    //         domain: "kosmix.me",
    //         Owner: { connect: { id: user.id } },
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //     }
    // })
    const domain = await db.domain.findFirstOrThrow({ where: { domain: "kosmix.me" } })
    const user = await db.user.findFirstOrThrow({ where: { Admin: true } })
    console.log("Created default domain: example.com")
    await SetupCertbot();
    // const ssl = await sslManager.requestCertificate([domain], user.email ?? "flo.cl25spt@gmail.com", user)
    const ssl = await db.ssl.findFirstOrThrow({
        where: { domains: { some: { id: domain.id } }, }
        , include: { domains: true }
    })
    // DKIM.addDomain(domain)

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

}
Setup()