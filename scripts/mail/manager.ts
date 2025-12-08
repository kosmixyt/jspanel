import type { Domain, MailBox, Prisma, User } from "@prisma/client";
import { MailserverName } from "scripts/setup";
import { db } from "~/server/db";
import { DKIM } from "./dkim/dkim";
import { execSync } from "child_process";
import { DovecotManager } from "./dovecot/setup";
import { MysqlManager } from "scripts/mysql/manager";
import { Config } from "scripts/config/config";
import { DnsRecord, ParseDnsRecord } from "./dns";




export interface DomainAddConfig {
    dkimSetup: boolean;
}
export interface DomainAddResult {
    DnsRecords: DnsRecord[];
}
export class MailManager {

    public static async addDomain(domain: Domain, user: User, config: DomainAddConfig, ssl?: Prisma.SslGetPayload<{ include: { domains: true } }>): Promise<DomainAddResult> {
        const records: DnsRecord[] = []
        const local = await MysqlManager.getDatabase()
        const [results] = await local.execute(`INSERT INTO ${MailserverName}.virtual_domains (name) VALUES (?)`, [domain.domain])
        if (config.dkimSetup) {
            const dkimRecord = await DKIM.addDomain(domain)
            records.push(dkimRecord)
        }
        if (ssl) {
            await DovecotManager.AddSsl([domain], ssl)
        }
        const spfRecord = await this.SpfRecord(domain.domain)
        records.push(spfRecord)
        // dmarc record
        const dmarcRecord = new DnsRecord(`_dmarc.${domain.domain}`, 'TXT', `v=DMARC1; p=quarantine; rua=mailto:postmaster@${domain.domain}; ruf=mailto:postmaster@${domain.domain}; fo=1`)
        records.push(dmarcRecord)
        return {
            DnsRecords: records
        }
    }
    public static async removeDomain(domain: Domain) {
        const local = await MysqlManager.getDatabase()
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
    public static async DomainExists(domainName: string): Promise<boolean> {
        const local = await MysqlManager.getDatabase()
        const [rows] = await local.execute(`SELECT id FROM ${MailserverName}.virtual_domains WHERE name = ?`, [domainName])
        if (Array.isArray(rows) && rows.length > 0) {
            return true
        }
        return false
    }
    public static async createMailbox(domain: Domain, user: User, username: string, password: string): Promise<MailBox> {
        // check if domain exists in mysql
        if(!await this.DomainExists(domain.domain)) {
            throw new Error(`Domain ${domain.domain} does not exist in mysql`)
        }
        const local = await MysqlManager.getDatabase()
        const email = `${username}@${domain.domain}`
        const [rows] = await local.execute(`SELECT id FROM ${MailserverName}.virtual_users WHERE email = ?`, [email])
        if (Array.isArray(rows) && rows.length > 0) {
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
        const local = await MysqlManager.getDatabase()
        const email = `${mailbox.username}@${mailbox.Domain.domain}`
        await local.execute(`DELETE FROM ${MailserverName}.virtual_users WHERE email = ?`, [email])
        await db.mailBox.delete({
            where: {
                id: mailbox.id
            }
        })
    }
    public static async SpfRecord(domainName: string): Promise<DnsRecord> {
        const ips = await Config.getIps();
        let spfValue: string;

        if (!ips || ips.length === 0) {
            spfValue = 'v=spf1 mx ~all';
        } else {
            const parts = ips.map(ip => ip.includes(':') ? `ip6:${ip}` : `ip4:${ip}`);
            spfValue = `v=spf1 ${parts.join(' ')} mx ~all`;
        }
        return new DnsRecord(domainName, 'TXT', spfValue);
    }

}