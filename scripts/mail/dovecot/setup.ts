import { $ } from "bun";
import os from "os";
import readline from "readline/promises"
import validator from "validator"
import fs from "fs"
import type { Domain, Prisma, Ssl } from "@prisma/client";

const RequiredPackages = [
  "dovecot-core",
  "dovecot-imapd",
  "dovecot-pop3d",
  "dovecot-lmtpd",
  "dovecot-mysql",
]
export interface SetupDovecotOptions {
  mainDomain: Domain;
  ssl: Prisma.SslGetPayload<{ include: { domains: true } }>;
  // email: string;
  mailserverPassword: string;
  mailserverUser: string;
  mailserverDb: string;
}

/*

Docs: on ne set pas de ssl par défaut, on le fait avec la class DovecotManager.AddSsl

si un client se connecte en imap/pop3 non ssl (ou ssl non présent dans /etc/dovecot/conf.d/10-ssl.conf), dovecot utilise les certificats par défaut self-signed 
ssl_cert = </etc/dovecot/private/dovecot.pem
ssl_key = </etc/dovecot/private/dovecot.key


*/
const savePath = '/workspace/scripts/mail/dovecot/save'
const assetPath = '/workspace/scripts/mail/dovecot/assets'
const protocolPath = '/usr/share/dovecot/protocols.d'

export async function SetupDovecot(config: SetupDovecotOptions) {
  // if (!validator.isFQDN(config.mainDomain.domain)) {
  //   return console.error(`Invalid hostname ${config.mainDomain.domain}`);
  // }
  // if (config.mainDomain.domain != config.ssl.domains[0]?.domain) {
  //   throw new Error(`The main domain ${config.mainDomain.domain} must match the SSL domain ${config.ssl.domains[0]?.domain}`);
  // }

  // console.log("Using config.mainDomain:", config.mainDomain.domain);
  // console.log("Updating system...");

  // await $`apt update`.quiet();
  // await $`apt upgrade -y`.quiet();
  // console.log('Updated system');
  // let isDovecotInstalled = await IsDovecotInstalled();
  // console.log("Installing required packages...");
  // await $`apt install -y ${RequiredPackages}`.quiet();
  // console.log("Installed required packages");
  // isDovecotInstalled = await IsDovecotInstalled();
  // if (!isDovecotInstalled) {
  //   return console.error("Failed to install Dovecot");
  // }
  // const ipv4 = (await $`curl ifconfig.me -4`.quiet()).text();
  // const ipv6 = (await $`curl ifconfig.me -6`.quiet()).text();
  // console.log(`Current IPv4 : ${ipv4}`);
  // console.log(`Current IPv6 : ${ipv6}`);

  // // let email = config.email;
  // // if (!validator.isEmail(email)) {
  // //   return console.error("Invalid email address");
  // // }
  // // console.log("Using email address:", email);

  // // Backup config files
  // fs.copyFileSync("/etc/dovecot/dovecot.conf", `${savePath}/dovecot.conf.orig`);
  // fs.copyFileSync("/etc/dovecot/conf.d/10-mail.conf", `${savePath}/10-mail.conf.orig`);
  // fs.copyFileSync("/etc/dovecot/conf.d/10-auth.conf", `${savePath}/10-auth.conf.orig`);
  // fs.copyFileSync("/etc/dovecot/dovecot-sql.conf.ext", `${savePath}/dovecot-sql.conf.ext.orig`);
  // fs.copyFileSync("/etc/dovecot/conf.d/10-master.conf", `${savePath}/10-master.conf.orig`);
  // fs.copyFileSync("/etc/dovecot/conf.d/10-ssl.conf", `${savePath}/10-ssl.conf.orig`);

  // // dovecot.conf
  // await $`sed -i "24a protocols = imap pop3 lmtp \npostmaster_address = postmaster@${config.mainDomain.domain}\n" /etc/dovecot/dovecot.conf`.quiet();
  // // de base dovecot de base écoute sur toutes les interfaces dans
  // // !include_try /usr/share/dovecot/protocols.d/*.protocol
  // // comme on utilise plus on supprime la ligne et tout les fichier .protocol dans /usr/share/dovecot/protocols.d/
  // const protocolFiles = fs.readdirSync(protocolPath);
  // for (const file of protocolFiles) {
  //   if (file.endsWith('.protocol')) {
  //     fs.unlinkSync(`${protocolPath}/${file}`);
  //   }
  // }

  // mail.conf
  //   Le nouveau chemin configuré :
  // maildir: : format Maildir (chaque email = fichier séparé)
  // /var/mail/vhosts/ : répertoire racine des mails
  // %d : variable Dovecot = nom de domaine (ex: example.com)
  // %n : variable Dovecot = nom d'utilisateur (ex: john)
  // Résultat final : /var/mail/vhosts/example.com/john/
  //   await $`sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/vhosts/%d/%n/|' /etc/dovecot/conf.d/10-mail.conf`.quiet();

  //   // on crée l'arborescence /var/mail/vhosts/<domain>
  //   await fs.mkdirSync(`/var/mail/vhosts/${config.mainDomain.domain}`, { recursive: true });

  //   // on crée l'utilisateur vmail
  //   await $`groupadd -g 5000 vmail`.quiet();
  //   await $`useradd -g vmail -u 5000 vmail -d /var/mail`.quiet();
  //   // on donne les droits à vmail sur /var/mail
  //   await $`chown -R vmail:vmail /var/mail`.quiet();


  //   // on décommente la ligne 10 pour activer l'authentification
  //   // #disable_plaintext_auth = yes (ligne 10)
  //   await $`sed -i '10s/^#//' /etc/dovecot/conf.d/10-auth.conf`.quiet();
  //   // on set auth_mechanisms à plain login pour permettre l'authentification en clair (à voir utiliser l'authentification CRAM-MD5 ou autre plus tard)
  //   await $`sed -i 's/^auth_mechanisms = .*/auth_mechanisms = plain login/' /etc/dovecot/conf.d/10-auth.conf`.quiet();
  //   // on commente la ligne 122 pour désactiver l'authentification par pam
  //   // #!include auth-system.conf.ext (ligne 122)
  //   await $`sed -i '122s/^/#/' /etc/dovecot/conf.d/10-auth.conf`.quiet();
  //   // on décommente la ligne 123 pour activer l'authentification par sql
  //   // #!include auth-sql.conf.ext (ligne 123)
  //   await $`sed -i '123s/^#//' /etc/dovecot/conf.d/10-auth.conf`.quiet();

  //   // auth-sql.conf.ext
  //   // pour userdb on utilise un driver static
  //   //  driver static = on set un uid/gid et home (vmail) pour tous les users
  //   // évite de créer un user unix pour chaque user mail
  //   await $`sed -i '/^userdb {/,/^}/ {/^[[:space:]]*#/!s/driver = .*/driver = static/}' /etc/dovecot/conf.d/auth-sql.conf.ext`.quiet();
  //   await $`sed -i '/^userdb {/,/^}/ {/^[[:space:]]*#/!s|args = .*|args = uid=vmail gid=vmail home=/var/mail/vhosts/%d/%n/|}' /etc/dovecot/conf.d/auth-sql.conf.ext`.quiet();
  //   // pour passdb on utilise un driver sql
  //   // on laisse la config tel quelle car elle contient déjà
  //   //   passdb {
  //   //   driver = sql
  //   //   # Path for SQL configuration file, see example-config/dovecot-sql.conf.ext
  //   //   args = /etc/dovecot/dovecot-sql.conf.ext
  //   // }

  //   // dovecot-sql.conf.ext
  //   // on ajoute la config mysql à dovecot pour la passdb
  //   const sqlConf = `
  // driver = mysql
  // connect = host=127.0.0.1 dbname=${config.mailserverDb} user=${config.mailserverUser} password=${config.mailserverPassword}
  // default_pass_scheme = SHA512-CRYPT
  // password_query = SELECT email as user, password FROM virtual_users WHERE email='%u';
  // `;
  //   fs.appendFileSync("/etc/dovecot/dovecot-sql.conf.ext", sqlConf);

  //   // on donne les droits à vmail sur /etc/dovecot et son contenu
  //   await $`chown -R vmail:dovecot /etc/dovecot`.quiet();
  //   // on retire tous les droits aux autres sur /etc/dovecot
  //   await $`chmod -R o-rwx /etc/dovecot`.quiet();

  //   // quand le port = 0, le service est désactivé
  //   // Disable imap non ssl
  //   await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imap {/,/^  }/s/^ *#\\?port = .*/    port = 0/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   // Enable imap ssl
  //   await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imaps {/,/^  }/s/^ *#\\?port = .*/    port = 993/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imaps {/,/^  }/s/^ *#\\?ssl = .*/    ssl = yes/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   // Disable pop3 non ssl
  //   await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3 {/,/^  }/s/^ *#\\?port = .*/    port = 0/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   // Enable pop3 ssl
  //   await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3s {/,/^  }/s/^ *#\\?port = .*/    port = 995/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3s {/,/^  }/s/^ *#\\?ssl = .*/    ssl = yes/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  //   // LMTP listener
  // Using a more compatible approach for adding LMTP configuration
  const lmtpConfig = `    #mode = 0666
    mode = 0600
    user = postfix
    group = postfix`;
  await $`sed -i '/unix_listener \\/var\\/spool\\/postfix\\/private\\/dovecot-lmtp {/a\\${lmtpConfig}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  // Postfix smtp-auth
  // on configure le listener pour que postfix puisse s'authentifier auprès de dovecot
  // postfix utilise dovecot pour l'authentification smtp
  await $`sed -i '/^  # Postfix smtp-auth/,/^  #}/c\\
    unix_listener /var/spool/postfix/private/auth {\\
      mode = 0660\\
      user = postfix\\
      group = postfix\\
    }' /etc/dovecot/conf.d/10-master.conf`.quiet();
  // auth-userdb
  // on set le user à vmail pour que dovecot puisse lire dovecot-sql.conf.ext
  await $`sed -i '/^  unix_listener auth-userdb {/,/^  }/c\\
    unix_listener auth-userdb {\\
      mode = 0600\\
      user = vmail\\
    }' /etc/dovecot/conf.d/10-master.conf`.quiet();
  // service auth and auth-worker
  await $`sed -i '/^service auth {/,/^}/ {/user = dovecot/!s/^service auth {/&\\n  user = dovecot/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  await $`sed -i '/^service auth-worker {/,/^}/ {/user = vmail/!s/^service auth-worker {/&\\n  user = vmail/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // on set le ssl to required for dovecot
  await $`sed -i 's/^ssl = .*/ssl = required/' /etc/dovecot/conf.d/10-ssl.conf`.quiet();

  console.log("Dovecot setup completed.");
}

export class DovecotManager {
  public static async AddSsl(domains: Domain[], ssl: Prisma.SslGetPayload<{ include: { domains: true } }>) {
    // on vérifie si les domains sont dans le ssl
    for (const domain of domains) {
      if (!ssl.domains.find(d => d.id === domain.id)) {
        throw new Error(`Domain ${domain.domain} not found in SSL`);
      }
    }
    // on ajoute les domains au ssl
    // on ajoute le ssl au dovecot
    // on reload dovecot
    for (const domain of domains) {
      console.log(`Adding domain ${domain.domain} to Dovecot with SSL ${ssl.certPath} and ${ssl.keyPath}`);
      const sslConfig = `
      local_name ${domain.domain} {
        ssl_cert = <${ssl.certPath}
        ssl_key  = <${ssl.keyPath}
      }
      `;
      fs.appendFileSync("/etc/dovecot/conf.d/10-ssl.conf", sslConfig);
    }
    console.log(`Restarting Dovecot...`);
    await $`systemctl reload dovecot`.quiet();
    console.log(`Dovecot reloaded.`);
  }
}


async function IsDovecotInstalled() {
  const dovecotCheck = await $`dpkg -s dovecot-core`.quiet().nothrow()
  if (dovecotCheck.exitCode == 0) {
    return true;
  }
  return false;
}





// SetupDovecot({
//   domain: "kosmix.me",
//   email: "flo.cl25spt@gmail.com",
// });

