import type { Domain, MailBox, Prisma, User } from "@prisma/client";
import { getDatabase, MailserverName } from "scripts/setup";
import { db } from "~/server/db";
import { DKIM } from "./dkim/dkim";
import { execSync } from "child_process";
import { DovecotManager } from "./dovecot/setup";




export interface DomainAddConfig {
    dkimSetup: boolean;
}

export class MailManager {


    public static async addDomain(domain: Domain, user: User, config: DomainAddConfig, ssl: Prisma.SslGetPayload<{ include: { domains: true } }>) {
        const local = await getDatabase()
        const [results] = await local.execute(`INSERT INTO ${MailserverName}.virtual_domains (name) VALUES (?)`, [domain.domain])
        if (config.dkimSetup) {
            await this.EnableDkimForDomain(domain)
        }
        await DovecotManager.AddSsl([domain], ssl)
        console.log(results)
    }
    public static async removeDomain(domain: Domain) {
        const local = await getDatabase()
        await local.execute(`DELETE FROM ${MailserverName}.virtual_domains WHERE name = ?`, [domain.domain])
        await DKIM.removeDomain(domain)
        const mailboxes = await db.mailBox.findMany({
            where: {
                domainId: domain.id
            },
            include: { Domain: true }
        })
        for (const mailbox of mailboxes) {
            await this.deleteMailbox(mailbox)
        }
    }

    public static async EnableDkimForDomain(domain: Domain) {
        await DKIM.addDomain(domain)
    }
    public static async DisableDkimForDomain(domain: Domain) {
        await DKIM.removeDomain(domain)
    }
    public static async createMailbox(domain: Domain, user: User, username: string, password: string): Promise<MailBox> {
        const local = await getDatabase()
        const email = `${username}@${domain.domain}`
        const existingUser = await local.execute(`SELECT id FROM ${MailserverName}.virtual_users WHERE email = ?`, [email])
        if (existingUser[1].length > 0) {
            throw new Error(`Mailbox ${email} already exists`)
        }
        var hashedPassword = execSync(`doveadm pw -s SHA512-CRYPT -p "${password}"`, { encoding: 'utf8' }).trim();
        hashedPassword = hashedPassword.replace("{SHA512-CRYPT}", "")
        console.log(`Creating mailbox for ${email} with password ${password} (hashed: ${hashedPassword})`)
        const [results] = await local.execute(`INSERT INTO ${MailserverName}.virtual_users (domain_id, password, email) VALUES ((SELECT id FROM ${MailserverName}.virtual_domains WHERE name = ?), ?, ?)`, [domain.domain, hashedPassword, email])
        const mail = await db.mailBox.create({
            data: {
                username,
                // currently storing password in plain text, will change later
                password_hash: password,
                Owner: {
                    connect: {
                        id: user.id
                    }
                },
                Domain: {
                    connect: {
                        id: domain.id
                    }
                }
            }
        })
        return mail;
    }
    public static async deleteMailbox(mailbox: Prisma.MailBoxGetPayload<{ include: { Domain: true } }>) {
        const local = await getDatabase()
        const email = `${mailbox.username}@${mailbox.Domain.domain}`
        await local.execute(`DELETE FROM ${MailserverName}.virtual_users WHERE email = ?`, [email])
        await db.mailBox.delete({
            where: {
                id: mailbox.id
            }
        })
    }

}