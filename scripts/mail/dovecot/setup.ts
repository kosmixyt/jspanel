import { $ } from "bun";
import os from "os";
import readline from "readline/promises"
import validator from "validator"
import fs from "fs"

const RequiredPackages = [
  "dovecot-core",
  "dovecot-imapd",
  "dovecot-pop3d",
  "dovecot-lmtpd",
  "dovecot-mysql",
]
export interface SetupDovecotOptions {
  domain: string;
  email: string;
  mailserverPassword: string;
  mailserverUser: string;
  mailserverDb: string;
}
const savePath = '/workspace/scripts/mail/dovecot/save'
const assetPath = '/workspace/assets/mail/dovecot/assets'

export async function SetupDovecot(config: SetupDovecotOptions) {
  if (!validator.isFQDN(config.domain)) {
    return console.error(`Invalid hostname ${config.domain}`);
  }

  console.log("Using config.domain:", config.domain);
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

  let email = config.email;
  if (!validator.isEmail(email)) {
    return console.error("Invalid email address");
  }
  console.log("Using email address:", email);

  // Backup config files
  await $`cp /etc/dovecot/dovecot.conf ${savePath}/dovecot.conf.orig`.quiet();
  await $`cp /etc/dovecot/conf.d/10-mail.conf ${savePath}/10-mail.conf.orig`.quiet();
  await $`cp /etc/dovecot/conf.d/10-auth.conf ${savePath}/10-auth.conf.orig`.quiet();
  await $`cp /etc/dovecot/dovecot-sql.conf.ext ${savePath}/dovecot-sql.conf.ext.orig`.quiet();
  await $`cp /etc/dovecot/conf.d/10-master.conf ${savePath}/10-master.conf.orig`.quiet();
  await $`cp /etc/dovecot/conf.d/10-ssl.conf ${savePath}/10-ssl.conf.orig`.quiet();

  // dovecot.conf
  await $`sed -i "24a protocols = imap pop3 lmtp \npostmaster_address = postmaster@${config.domain}\n" /etc/dovecot/dovecot.conf`.quiet();

  // mail.conf
  await $`sed -i 's/^mail_location = .*/mail_location = maildir:\\/var\\/mail\\/vhosts\\/%d\\/%n\\//' /etc/dovecot/conf.d/10-mail.conf`.quiet();

  // Create maildir and vmail user/group
  await $`mkdir -p /var/mail/vhosts/${config.domain}`.quiet();
  await $`groupadd -g 5000 vmail`.quiet();
  await $`useradd -g vmail -u 5000 vmail -d /var/mail`.quiet();
  await $`chown -R vmail:vmail /var/mail`.quiet();

  // auth.conf
  await $`sed -i '10s/^#//' /etc/dovecot/conf.d/10-auth.conf`.quiet();
  await $`sed -i 's/^auth_mechanisms = .*/auth_mechanisms = plain login/' /etc/dovecot/conf.d/10-auth.conf`.quiet();
  await $`sed -i '123s/^#//' /etc/dovecot/conf.d/10-auth.conf`.quiet();

  // auth-sql.conf.ext
  await $`sed -i '/^userdb {/,/^}/ {/^[[:space:]]*#/!s/driver = .*/driver = static/}' /etc/dovecot/conf.d/auth-sql.conf.ext`.quiet();
  await $`sed -i '/^userdb {/,/^}/ {/^[[:space:]]*#/!s/args = .*/args = uid=vmail gid=vmail home=\\/var\\/mail\\/vhosts\\/%d\\/%n\\//}' /etc/dovecot/conf.d/auth-sql.conf.ext`.quiet();

  // dovecot-sql.conf.ext
  await $`bash -c "cat <<EOF >> /etc/dovecot/dovecot-sql.conf.ext
driver = mysql
connect = host=127.0.0.1 dbname=${config.mailserverDb} user=${config.mailserverUser} password=${config.mailserverPassword}
default_pass_scheme = SHA512-CRYPT
password_query = SELECT email as user, password FROM virtual_users WHERE email='%u';
EOF"`.quiet();

  await $`chown -R vmail:dovecot /etc/dovecot`.quiet();
  await $`chmod -R o-rwx /etc/dovecot`.quiet();

  // Disable imap non ssl
  await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imap {/,/^  }/s/^ *#\\?port = .*/    port = 0/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // Enable imap ssl
  await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imaps {/,/^  }/s/^ *#\\?port = .*/    port = 993/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  await $`sed -i '/^service imap-login {/,/^}/ {/inet_listener imaps {/,/^  }/s/^ *#\\?ssl = .*/    ssl = yes/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // Disable pop3 non ssl
  await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3 {/,/^  }/s/^ *#\\?port = .*/    port = 0/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // Enable pop3 ssl
  await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3s {/,/^  }/s/^ *#\\?port = .*/    port = 995/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  await $`sed -i '/^service pop3-login {/,/^}/ {/inet_listener pop3s {/,/^  }/s/^ *#\\?ssl = .*/    ssl = yes/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // LMTP listener
  await $`sed -i '/^service lmtp {/,/^}/ {/unix_listener \\/var\\/spool\\/postfix\\/private\\/dovecot-lmtp {/a\\
    #mode = 0666\\
    mode = 0600\\
    user = postfix\\
    group = postfix
  }' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // Postfix smtp-auth
  await $`sed -i '/^  # Postfix smtp-auth/,/^  #}/c\\
    unix_listener /var/spool/postfix/private/auth {\\
      mode = 0660\\
      user = postfix\\
      group = postfix\\
    }' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // auth-userdb
  await $`sed -i '/^  unix_listener auth-userdb {/,/^  }/c\\
    unix_listener auth-userdb {\\
      mode = 0600\\
      user = vmail\\
    }' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // service auth and auth-worker
  await $`sed -i '/^service auth {/,/^}/ {/user = dovecot/!s/^service auth {/&\\n  user = dovecot/}' /etc/dovecot/conf.d/10-master.conf`.quiet();
  await $`sed -i '/^service auth-worker {/,/^}/ {/user = vmail/!s/^service auth-worker {/&\\n  user = vmail/}' /etc/dovecot/conf.d/10-master.conf`.quiet();

  // 10-ssl.conf
  const sslCertPath = `/etc/letsencrypt/live/${config.domain}/fullchain.pem`;
  const sslKeyPath = `/etc/letsencrypt/live/${config.domain}/privkey.pem`;
  if (!fs.existsSync(sslCertPath) || !fs.existsSync(sslKeyPath)) {
    return console.error(`SSL certificate or key not found for domain ${config.domain}. Please run certbot first.`);
  }

  await $`sed -i "s|^ssl_cert = .*|ssl_cert = <${sslCertPath}|" /etc/dovecot/conf.d/10-ssl.conf`.quiet();
  await $`sed -i "s|^ssl_key = .*|ssl_key = <${sslKeyPath}|" /etc/dovecot/conf.d/10-ssl.conf`.quiet();
  await $`sed -i 's/^ssl = .*/ssl = required/' /etc/dovecot/conf.d/10-ssl.conf`.quiet();

  console.log("Dovecot setup completed.");
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
