import type { Domain } from "@prisma/client";
import { $ } from "bun";
import fs from "fs"
import os from "os";
import { PostfixManager } from "./manager";




const RequiredPackages = [
    "postfix",
    "postfix-mysql",
]
const postfixPath = "/etc/postfix"
const assetPath = '/workspace/scripts/mail/postfix/assets'
const savePath = '/workspace/scripts/mail/postfix/save'


export interface SetupPostfixOptions {
    // domain name
    domain: Domain;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    // testEmail: string;
    // testDomain: string;
}

function replaceHostnameInMainCf(newHostname: string) {
    const content = fs.readFileSync(`${postfixPath}/main.cf`, "utf8");
    const updatedContent = content.replace(/example\.com/g, newHostname);
    fs.writeFileSync(`${postfixPath}/main.cf`, updatedContent, "utf8");
}
function replaceTextInFile(filePath: string, searchedValues: string[], replaceValues: string[]) {
    let content = fs.readFileSync(filePath, "utf8");
    searchedValues.forEach((value, index) => {
        const replaceValue = replaceValues[index] || "";
        const regex = new RegExp(value, "g");
        content = content.replace(regex, replaceValue);
    });
    fs.writeFileSync(filePath, content, "utf8");
}

export async function SetupPostfix(config: SetupPostfixOptions) {

    // await $`apt update`.quiet();
    // console.log("Installing required packages...");
    // await $`DEBIAN_FRONTEND=noninteractive apt install -y ${RequiredPackages}`.quiet();
    // console.log("Installed required packages");
    // $`echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections`.quiet();
    // $`echo "postfix postfix/mailname string ${config.domain.domain}" | debconf-set-selections`.quiet();
    fs.copyFileSync(`${postfixPath}/main.cf`, `${savePath}/main.cf.bak`);
    fs.copyFileSync(`${postfixPath}/master.cf`, `${savePath}/master.cf.bak`);
    fs.copyFileSync(`${assetPath}/main.cf.kosmix`, `${postfixPath}/main.cf`);
    replaceHostnameInMainCf(config.domain.domain);
    const files = [
        "mysql-virtual-mailbox-domains.cf.kosmix",
        "mysql-virtual-mailbox-maps.cf.kosmix",
        "mysql-virtual-alias-maps.cf.kosmix",
        "mysql-virtual-email2email.cf.kosmix"
    ]
    for (const file of files) {
        const finalFilename = file.replace(".kosmix", "")
        fs.copyFileSync(`${assetPath}/${file}`, `${postfixPath}/${finalFilename}`);
        replaceTextInFile(`${postfixPath}/${finalFilename}`, ["mail_user", "mail_password", "mail_name"], [config.dbUser, config.dbPassword, config.dbName]);
    }
    // restart postfix service
    PostfixManager.addSsl(config.domain.domain, `/etc/letsencrypt/live/${config.domain.domain}/fullchain.pem`, `/etc/letsencrypt/live/${config.domain.domain}/privkey.pem`)
    await $`systemctl restart postfix`.quiet();


    await $`sed -i '18,39s/^#//' ${postfixPath}/master.cf`;
    await $`chmod -R o-rwx ${postfixPath}`;
    PostfixManager.restart()
}


