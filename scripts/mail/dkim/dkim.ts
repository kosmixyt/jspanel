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
    public static async removeDomain(domain: Domain) {
        const dkimPath = `/etc/opendkim/keys/${domain.domain}`
        if (fs.existsSync(dkimPath)) {
            fs.rmSync(dkimPath, { recursive: true, force: true })
        }
        let keyTable = fs.readFileSync(keyTablePath, 'utf-8')
        keyTable = keyTable.split('\n').filter(line => !line.includes(domain.domain)).join('\n')
        fs.writeFileSync(keyTablePath, keyTable)
        let signingTable = fs.readFileSync(signingTablePath, 'utf-8')
        signingTable = signingTable.split('\n').filter(line => !line.includes(domain.domain)).join('\n')
        fs.writeFileSync(signingTablePath, signingTable)
        let trustedHosts = fs.readFileSync("/etc/opendkim/trusted.hosts", 'utf-8')
        trustedHosts = trustedHosts.split('\n').filter(line => !line.includes(domain.domain)).join('\n')
        fs.writeFileSync("/etc/opendkim/trusted.hosts", trustedHosts)
        await $`sudo systemctl restart opendkim`;
        console.log(`DKIM keys removed for domain ${domain.domain}`);
    }
    public static async setupPostfix() {
        // Créer le répertoire pour le socket dans le chroot Postfix
        await $`sudo mkdir -p /var/spool/postfix/var/run`.quiet();
        await $`sudo chown opendkim:postfix /var/spool/postfix/var/run`.quiet();
        await $`sudo chmod 755 /var/spool/postfix/var/run`.quiet();

        // La configuration milter est maintenant dans le fichier main.cf.kosmix
        // Elle sera copiée lors du déploiement de la configuration Postfix

        await $`sudo systemctl restart opendkim`;
        await $`sudo systemctl restart postfix`;
    }
    public static async restart() {
        console.log(`Restarting DKIM...`);
        await $`systemctl restart opendkim`.quiet();
        await $`systemctl restart postfix`.quiet();
        console.log(`DKIM restarted.`);
    }
}