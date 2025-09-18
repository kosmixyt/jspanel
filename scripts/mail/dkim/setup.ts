import { $ } from "bun"
import fs from "fs"



const RequiredPackages = [
    "opendkim",
    "opendkim-tools"
]
const assetsPath = "/workspace/scripts/mail/dkim/assets"
const TrustedHostsPath = "/etc/opendkim/trusted.hosts"
export async function Setup() {
    console.log("Installing required packages...")
    await $`apt-get install -y ${RequiredPackages}`
    console.log("Setting up OpenDKIM...")


    // add postfix to opendkim group
    await $`sudo gpasswd -a postfix opendkim`;
    // create opendkim spool dir
    await $`sudo mkdir -p /var/spool/postfix/opendkim`
    await $`sudo chown opendkim:postfix /var/spool/postfix/opendkim`
    fs.mkdirSync("/etc/opendkim/keys", { recursive: true })


    // oveerride default config
    fs.copyFileSync(`${assetsPath}/opendkim.conf.kosmix`, "/etc/opendkim.conf")


    const TrustedHosts = `
127.0.0.1
localhost
::1
`
    fs.writeFileSync(TrustedHostsPath, TrustedHosts)
}

Setup()