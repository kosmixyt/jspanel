import type { Domain } from "@prisma/client";
import { $ } from "bun"
import fs from "fs"

const keyTablePath = "/etc/opendkim/key.table"
const signingTablePath = "/etc/opendkim/signing.table"
const postfixConfigPath = "/etc/postfix/main.cf";

export class DKIM {
    public static async addDomain(domain: Domain) {
        const dkimPath = `/etc/opendkim/keys/${domain.domain}`
        if (!fs.existsSync(dkimPath)) {
            fs.mkdirSync(dkimPath, { recursive: true })
        }
        let append = `mail._domainkey.${domain.domain} ${domain.domain}:mail:/etc/opendkim/keys/${domain.domain}/mail.private\n`;
        fs.appendFileSync(keyTablePath, append)
        append = `${domain.domain} mail._domainkey.${domain.domain}\n`
        fs.appendFileSync(signingTablePath, append)
        const cmd = await $`sudo opendkim-genkey -s mail -d ${domain.domain}`.cwd(dkimPath)
        await $`sudo chown opendkim:opendkim mail.private`.cwd(dkimPath)
        await $`sudo systemctl restart opendkim`;
        // add to trusted hosts
        fs.appendFileSync("/etc/opendkim/trusted.hosts", `\n${domain.domain}\n*.${domain.domain}\n`)
        console.log(`DKIM keys generated for domain ${domain.domain}:`)
    }
    public static setupPostfix() {
        const postfixConfig = `
milter_default_action = accept
milter_protocol = 6
smtpd_milters = local:/var/lib/opendkim/opendkim.sock
non_smtpd_milters = \$smtpd_milters
    `;
        fs.appendFileSync(postfixConfigPath, postfixConfig);
        $`sudo systemctl restart opendkim`;
        $`sudo systemctl restart postfix`;
    }
    public static async restart() {
        console.log(`Restarting DKIM...`);
        await $`systemctl restart opendkim`.quiet();
        await $`systemctl restart postfix`.quiet();
        console.log(`DKIM restarted.`);
    }
}