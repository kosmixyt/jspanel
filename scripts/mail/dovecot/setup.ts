import { $ } from "bun";
import os from "os";
import readline from "readline/promises"
import validator from "validator"
import fs from "fs"
import type { Domain, Prisma, Ssl } from "@prisma/client";

// Utility functions for file manipulation
class FileEditor {
  static readFileLines(filePath: string): string[] {
    return fs.readFileSync(filePath, 'utf-8').split('\n');
  }

  static writeFileLines(filePath: string, lines: string[]): void {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  static insertAfterLine(filePath: string, afterLineNumber: number, content: string): void {
    const lines = this.readFileLines(filePath);
    lines.splice(afterLineNumber, 0, content);
    this.writeFileLines(filePath, lines);
  }

  static replaceLine(filePath: string, lineNumber: number, newContent: string): void {
    const lines = this.readFileLines(filePath);
    lines[lineNumber - 1] = newContent;
    this.writeFileLines(filePath, lines);
  }

  static replacePattern(filePath: string, pattern: RegExp, replacement: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  static commentLine(filePath: string, lineNumber: number): void {
    const lines = this.readFileLines(filePath);
    const line = lines[lineNumber - 1];
    if (line && !line.startsWith('#')) {
      lines[lineNumber - 1] = '#' + line;
    }
    this.writeFileLines(filePath, lines);
  }

  static uncommentLine(filePath: string, lineNumber: number): void {
    const lines = this.readFileLines(filePath);
    const line = lines[lineNumber - 1];
    if (line && line.startsWith('#')) {
      lines[lineNumber - 1] = line.substring(1);
    }
    this.writeFileLines(filePath, lines);
  }

  static findLineContaining(filePath: string, searchText: string): number {
    const lines = this.readFileLines(filePath);
    return lines.findIndex(line => line.includes(searchText)) + 1;
  }

  static replaceInSection(filePath: string, startPattern: RegExp, endPattern: RegExp, searchPattern: RegExp, replacement: string): void {
    const lines = this.readFileLines(filePath);
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (startPattern.test(line)) {
        inSection = true;
        continue;
      }
      if (inSection && endPattern.test(line)) {
        inSection = false;
        continue;
      }
      if (inSection && searchPattern.test(line)) {
        lines[i] = line.replace(searchPattern, replacement);
      }
    }

    this.writeFileLines(filePath, lines);
  }

  static appendToFile(filePath: string, content: string): void {
    fs.appendFileSync(filePath, content, 'utf-8');
  }
}

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

IMPORTANT: Ce setup configure le service LMTP avec le socket Unix correct pour Postfix.
Le socket /var/spool/postfix/private/dovecot doit correspondre exactement à la configuration
virtual_transport = lmtp:unix:private/dovecot dans Postfix main.cf

fix


*/
const savePath = '/workspace/scripts/mail/dovecot/save'
const assetPath = '/workspace/scripts/mail/dovecot/assets'
const protocolPath = '/usr/share/dovecot/protocols.d'

export async function SetupDovecot(config: SetupDovecotOptions) {
  if (!validator.isFQDN(config.mainDomain.domain)) {
    return console.error(`Invalid hostname ${config.mainDomain.domain}`);
  }
  if (config.mainDomain.domain != config.ssl.domains[0]?.domain) {
    throw new Error(`The main domain ${config.mainDomain.domain} must match the SSL domain ${config.ssl.domains[0]?.domain}`);
  }

  console.log("Using config.mainDomain:", config.mainDomain.domain);
  console.log("Updating system...");

  await $`apt update`.quiet();
  await $`apt upgrade -y`.quiet();
  console.log('Updated system');
  let isDovecotInstalled = await IsDovecotInstalled();
  console.log("Installing required packages...");
  await $`apt install -y ${RequiredPackages}`.quiet();
  console.log("Installed required packages");
  isDovecotInstalled = await IsDovecotInstalled();
  if (!isDovecotInstalled) {
    return console.error("Failed to install Dovecot");
  }
  const ipv4 = (await $`curl ifconfig.me -4`.quiet()).text();
  const ipv6 = (await $`curl ifconfig.me -6`.quiet()).text();
  console.log(`Current IPv4 : ${ipv4}`);
  console.log(`Current IPv6 : ${ipv6}`);

  // let email = config.email;
  // if (!validator.isEmail(email)) {
  //   return console.error("Invalid email address");
  // }
  // console.log("Using email address:", email);

  // Backup config files
  fs.copyFileSync("/etc/dovecot/dovecot.conf", `${savePath}/dovecot.conf.orig`);
  fs.copyFileSync("/etc/dovecot/conf.d/10-mail.conf", `${savePath}/10-mail.conf.orig`);
  fs.copyFileSync("/etc/dovecot/conf.d/10-auth.conf", `${savePath}/10-auth.conf.orig`);
  fs.copyFileSync("/etc/dovecot/dovecot-sql.conf.ext", `${savePath}/dovecot-sql.conf.ext.orig`);
  fs.copyFileSync("/etc/dovecot/conf.d/10-master.conf", `${savePath}/10-master.conf.orig`);
  fs.copyFileSync("/etc/dovecot/conf.d/10-ssl.conf", `${savePath}/10-ssl.conf.orig`);

  // // dovecot.conf
  FileEditor.insertAfterLine("/etc/dovecot/dovecot.conf", 23, `protocols = imap pop3 lmtp 
postmaster_address = postmaster@${config.mainDomain.domain}`);
  // de base dovecot de base écoute sur toutes les interfaces dans
  // !include_try /usr/share/dovecot/protocols.d/*.protocol
  // comme on utilise plus on supprime la ligne et tout les fichier .protocol dans /usr/share/dovecot/protocols.d/
  const protocolFiles = fs.readdirSync(protocolPath);
  for (const file of protocolFiles) {
    if (file.endsWith('.protocol')) {
      fs.unlinkSync(`${protocolPath}/${file}`);
    }
  }

  // mail.conf
  //   Le nouveau chemin configuré :
  // maildir: : format Maildir (chaque email = fichier séparé)
  // /var/mail/vhosts/ : répertoire racine des mails
  // %d : variable Dovecot = nom de domaine (ex: example.com)
  // %n : variable Dovecot = nom d'utilisateur (ex: john)
  // Résultat final : /var/mail/vhosts/example.com/john/
  FileEditor.replacePattern("/etc/dovecot/conf.d/10-mail.conf", /^mail_location = .*/m, "mail_location = maildir:/var/mail/vhosts/%d/%n/");

  // on crée l'arborescence /var/mail/vhosts/<domain>
  await fs.mkdirSync(`/var/mail/vhosts/${config.mainDomain.domain}`, { recursive: true });

  // on crée l'utilisateur vmail
  await $`groupadd -g 5000 vmail`.quiet();
  await $`useradd -g vmail -u 5000 vmail -d /var/mail`.quiet();
  // on donne les droits à vmail sur /var/mail
  await $`chown -R vmail:vmail /var/mail`.quiet();


  //   // on décommente la ligne 10 pour activer l'authentification
  //   // #disable_plaintext_auth = yes (ligne 10)
  FileEditor.uncommentLine("/etc/dovecot/conf.d/10-auth.conf", 10);
  //   // on set auth_mechanisms à plain login pour permettre l'authentification en clair (à voir utiliser l'authentification CRAM-MD5 ou autre plus tard)
  FileEditor.replacePattern("/etc/dovecot/conf.d/10-auth.conf", /^auth_mechanisms = .*/m, "auth_mechanisms = plain login");
  //   // on commente la ligne 122 pour désactiver l'authentification par pam
  //   // #!include auth-system.conf.ext (ligne 122)
  FileEditor.commentLine("/etc/dovecot/conf.d/10-auth.conf", 122);
  //   // on décommente la ligne 123 pour activer l'authentification par sql
  //   // #!include auth-sql.conf.ext (ligne 123)
  FileEditor.uncommentLine("/etc/dovecot/conf.d/10-auth.conf", 123);

  //   // auth-sql.conf.ext
  //   // pour userdb on utilise un driver static
  //   //  driver static = on set un uid/gid et home (vmail) pour tous les users
  //   // évite de créer un user unix pour chaque user mail
  FileEditor.replaceInSection("/etc/dovecot/conf.d/auth-sql.conf.ext", /^userdb \{/m, /^}/m, /driver = .*/m, "driver = static");
  FileEditor.replaceInSection("/etc/dovecot/conf.d/auth-sql.conf.ext", /^userdb \{/m, /^}/m, /args = .*/m, "args = uid=vmail gid=vmail home=/var/mail/vhosts/%d/%n/");
  //   // pour passdb on utilise un driver sql
  //   // on laisse la config tel quelle car elle contient déjà
  //   //   passdb {
  //   //   driver = sql
  //   //   # Path for SQL configuration file, see example-config/dovecot-sql.conf.ext
  //   //   args = /etc/dovecot/dovecot-sql.conf.ext
  //   // }

  //   // dovecot-sql.conf.ext
  //   // on ajoute la config mysql à dovecot pour la passdb
  const sqlConf = `
driver = mysql
connect = host=127.0.0.1 dbname=${config.mailserverDb} user=${config.mailserverUser} password=${config.mailserverPassword}
default_pass_scheme = SHA512-CRYPT
password_query = SELECT email as user, password FROM virtual_users WHERE email='%u';
`;
  FileEditor.appendToFile("/etc/dovecot/dovecot-sql.conf.ext", sqlConf);

  //   // on donne les droits à vmail sur /etc/dovecot et son contenu
  //   await $`chown -R vmail:dovecot /etc/dovecot`.quiet();
  //   // on retire tous les droits aux autres sur /etc/dovecot
  //   await $`chmod -R o-rwx /etc/dovecot`.quiet();

  //   // quand le port = 0, le service est désactivé
  //   // Disable imap non ssl
  // Handle IMAP service configurations in 10-master.conf
  let masterContent = fs.readFileSync("/etc/dovecot/conf.d/10-master.conf", 'utf-8');

  // Disable imap non ssl
  masterContent = masterContent.replace(
    /(service imap-login \{[\s\S]*?inet_listener imap \{[\s\S]*?)port = [^\n]*/m,
    '$1port = 0'
  );

  // Enable imap ssl
  masterContent = masterContent.replace(
    /(service imap-login \{[\s\S]*?inet_listener imaps \{[\s\S]*?)port = [^\n]*/m,
    '$1port = 993'
  );
  masterContent = masterContent.replace(
    /(service imap-login \{[\s\S]*?inet_listener imaps \{[\s\S]*?)ssl = [^\n]*/m,
    '$1ssl = yes'
  );

  // Disable pop3 non ssl
  masterContent = masterContent.replace(
    /(service pop3-login \{[\s\S]*?inet_listener pop3 \{[\s\S]*?)port = [^\n]*/m,
    '$1port = 0'
  );

  // Enable pop3 ssl
  masterContent = masterContent.replace(
    /(service pop3-login \{[\s\S]*?inet_listener pop3s \{[\s\S]*?)port = [^\n]*/m,
    '$1port = 995'
  );
  masterContent = masterContent.replace(
    /(service pop3-login \{[\s\S]*?inet_listener pop3s \{[\s\S]*?)ssl = [^\n]*/m,
    '$1ssl = yes'
  );

  // Configure LMTP service for Postfix integration
  // This creates the socket that Postfix expects for local mail delivery
  // CRITICAL: The socket path must match what Postfix expects in virtual_transport
  // Postfix config: virtual_transport = lmtp:unix:private/dovecot
  // This creates: /var/spool/postfix/private/dovecot
  const lmtpServiceConfig = `
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot {
    mode = 0600
    user = postfix
    group = postfix
  }
}`;

  // Replace the existing LMTP service configuration
  masterContent = masterContent.replace(
    /^service lmtp \{[\s\S]*?^}/m,
    lmtpServiceConfig.trim()
  );

  // Postfix smtp-auth
  // on configure le listener pour que postfix puisse s'authentifier auprès de dovecot
  // postfix utilise dovecot pour l'authentification smtp

  // Replace the entire Postfix smtp-auth section
  const postfixAuthConfig = `    unix_listener /var/spool/postfix/private/auth {
      mode = 0660
      user = postfix
      group = postfix
    }`;

  // Find and replace the Postfix smtp-auth section
  masterContent = masterContent.replace(
    /^  # Postfix smtp-auth[\s\S]*?^  #}/m,
    postfixAuthConfig
  );

  // auth-userdb
  // on set le user à vmail pour que dovecot puisse lire dovecot-sql.conf.ext
  const authUserdbConfig = `    unix_listener auth-userdb {
      mode = 0600
      user = vmail
    }`;

  masterContent = masterContent.replace(
    /^  unix_listener auth-userdb \{[\s\S]*?^  }/m,
    authUserdbConfig
  );

  // service auth and auth-worker
  // Add user = dovecot to service auth if not present
  if (!/service auth \{[\s\S]*?user = dovecot/m.test(masterContent)) {
    masterContent = masterContent.replace(
      /^service auth \{/m,
      'service auth {\n  user = dovecot'
    );
  }

  // Add user = vmail to service auth-worker if not present
  if (!/service auth-worker \{[\s\S]*?user = vmail/m.test(masterContent)) {
    masterContent = masterContent.replace(
      /^service auth-worker \{/m,
      'service auth-worker {\n  user = vmail'
    );
  }

  // Write back all the changes to master.conf
  fs.writeFileSync("/etc/dovecot/conf.d/10-master.conf", masterContent, 'utf-8');

  // on set le ssl to required for dovecot
  FileEditor.replacePattern("/etc/dovecot/conf.d/10-ssl.conf", /^ssl = .*/m, "ssl = required");

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
    await this.restart();
    console.log(`Added ${domains.length} domain(s) to Dovecot with SSL`);
  }
  public static async RemoveSsl(domains: Domain[]) {
    // on retire les domains du ssl
    // on reload dovecot
    for (const domain of domains) {
      console.log(`Removing domain ${domain.domain} from Dovecot`);
      const lines = fs.readFileSync("/etc/dovecot/conf.d/10-ssl.conf", 'utf-8').split('\n');
      const startIndex = lines.findIndex(line => line.includes(`local_name ${domain.domain} {`));
      if (startIndex === -1) {
        console.warn(`Domain ${domain.domain} not found in Dovecot SSL config`);
        continue;
      }
      let endIndex = startIndex;
      while (endIndex < lines.length && !lines[endIndex]!.includes('}')) {
        endIndex++;
      }
      // Remove the block including the closing brace
      lines.splice(startIndex, endIndex - startIndex + 1);
      fs.writeFileSync("/etc/dovecot/conf.d/10-ssl.conf", lines.join('\n'));
    }
    await this.restart();
    console.log(`Removed ${domains.length} domain(s) from Dovecot SSL config`);
  }
  public static async restart() {
    console.log(`Restarting Dovecot...`);
    await $`systemctl restart dovecot`.quiet();
    console.log(`Dovecot restarted.`);
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

