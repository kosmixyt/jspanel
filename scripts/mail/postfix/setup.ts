import type { Domain } from "@prisma/client";
import { $ } from "bun";
import fs from "fs"
import os from "os";




const RequiredPackages = [
    "postfix",
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
    console.log("Installing required packages...");
    await $`DEBIAN_FRONTEND=noninteractive apt install -y ${RequiredPackages}`.quiet();
    console.log("Installed required packages");
    $`echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections`.quiet();
    $`echo "postfix postfix/mailname string ${config.domain.domain}" | debconf-set-selections`.quiet();
    fs.copyFileSync(`${postfixPath}/main.cf`, `${savePath}/main.cf.bak`);
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



    const masterCfExcerpt = `
    smtp      inet  n       -       n       -       -       smtpd
    #smtp      inet  n       -       -       -       1       postscreen
    #smtpd     pass  -       -       -       -       -       smtpd
    #dnsblog   unix  -       -       -       -       0       dnsblog
    #tlsproxy  unix  -       -       -       -       0       tlsproxy
    submission inet n       -       y      -       -       smtpd
        -o syslog_name=postfix/submission
        -o smtpd_tls_security_level=encrypt
        -o smtpd_sasl_auth_enable=yes
        -o smtpd_sasl_type=dovecot
        -o smtpd_sasl_path=private/auth
        -o smtpd_reject_unlisted_recipient=no
        -o smtpd_client_restrictions=permit_sasl_authenticated,reject
        -o milter_macro_daemon_name=ORIGINATING
    smtps     inet  n       -       -       -       -       smtpd
        -o syslog_name=postfix/smtps
        -o smtpd_tls_wrappermode=yes
        -o smtpd_sasl_auth_enable=yes
        -o smtpd_sasl_type=dovecot
        -o smtpd_sasl_path=private/auth
        -o smtpd_client_restrictions=permit_sasl_authenticated,reject
        -o milter_macro_daemon_name=ORIGINATING
    `;

    const masterCfPath = `${postfixPath}/master.cf`;
    let masterCfContent = fs.readFileSync(masterCfPath, "utf8");

    // Replace the block starting with "smtp      inet" and ending before the next non-indented line after "smtps"
    masterCfContent = masterCfContent.replace(
        /smtp\s+inet.*?smtps\s+inet[\s\S]+?(?=^[^ \t]|$)/m,
        masterCfExcerpt
    );

    fs.writeFileSync(masterCfPath, masterCfContent, "utf8");
    // restart postfix service
    await $`systemctl restart postfix`.quiet();


    // const domainCheck = await $`sudo postmap -q ${config.testDomain} mysql:/etc/postfix/mysql-virtual-mailbox-domains.cf`.text();
    // if (domainCheck.trim()) {
    //     console.log("Postfix is working (domain check)");
    // } else {
    //     return console.error("Postfix is not working (domain check)");
    // }
    // const emailCheck = await $`sudo postmap -q ${config.testEmail} mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf`.text();
    // if (emailCheck.trim()) {
    //     console.log("Postfix is working (email check)");
    // } else {
    //     return console.error("Postfix is not working (email check)");
    // }

    fs.copyFileSync(`${postfixPath}/master.cf`, `${postfixPath}/master.cf.orig`);
    await $`sed -i '18,39s/^#//' ${postfixPath}/master.cf`;
    await $`chmod -R o-rwx ${postfixPath}`;
    await $`systemctl restart postfix`.quiet();
}

