import { $ } from "bun";

interface SetupMysqlOptions {
    rootPassword: string;
    // sample mailserver
    dbName: string;
    // sample mailserver
    dbUser: string;
    // sample mailserverpassword
    dbPassword: string;
}


const RequiredPackages = [
    "mysql-server",
    "mysql-client",
]

export async function SetupMysql(config: SetupMysqlOptions) {
    console.log("Setting up MySQL database...");
    // check if mysql is installed throw if installed
    const isMysqlInstalled = await $`which mysql`.quiet().nothrow()
    if (isMysqlInstalled.exitCode == 0) {
        throw new Error("MySQL is already installed");
    }
    console.log("Installing required packages...");
    await $`apt update`.quiet();
    await $`apt install -y ${RequiredPackages}`.quiet();
    console.log("Installed required packages");
    // check if mysql is installed
    const mysqlCheck = await $`which mysql`.quiet().nothrow()
    if (mysqlCheck.exitCode != 0) {
        return console.error("Failed to install MySQL");
    }
    console.log("MySQL installed successfully");
    console.log("Securing MySQL installation...");
    await $`mysql --execute="ALTER USER 'root'@'localhost' IDENTIFIED BY '${config.rootPassword}'; flush privileges;"`;
    await $`mysql --execute "DROP DATABASE IF EXISTS ${config.dbName}; CREATE DATABASE IF NOT EXISTS ${config.dbName};" -u root -p${config.rootPassword}`;
    await $`mysql --execute "DROP USER IF EXISTS '${config.dbUser}'@'localhost'; CREATE USER '${config.dbUser}'@'localhost' IDENTIFIED BY '${config.dbPassword}';" -u root -p${config.rootPassword}`;
    await $`mysql --execute "GRANT ALL PRIVILEGES ON ${config.dbName}.* TO '${config.dbUser}'@'localhost';" -u root -p${config.rootPassword}`;
    await $`mysql --execute "FLUSH PRIVILEGES;" -u root -p${config.rootPassword}`;
    await $`mysql --execute "USE ${config.dbName}; DROP TABLE IF EXISTS virtual_aliases; DROP TABLE IF EXISTS virtual_users; DROP TABLE IF EXISTS virtual_domains;" -u root -p${config.rootPassword}`;
    await $`mysql --execute "USE ${config.dbName}; CREATE TABLE \`virtual_domains\` (\`id\` int(11) NOT NULL auto_increment,\`name\` varchar(50) NOT NULL,PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;" -u root -p${config.rootPassword}`;
    await $`mysql --execute "USE ${config.dbName}; CREATE TABLE \`virtual_users\` (\`id\` int(11) NOT NULL auto_increment,\`domain_id\` int(11) NOT NULL,\`password\` varchar(106) NOT NULL,\`email\` varchar(100) NOT NULL,PRIMARY KEY (\`id\`),UNIQUE KEY \`email\` (\`email\`),FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8;" -u root -p${config.rootPassword}`;
    await $`mysql --execute "USE ${config.dbName}; CREATE TABLE \`virtual_aliases\` (\`id\` int(11) NOT NULL auto_increment,\`domain_id\` int(11) NOT NULL,\`source\` varchar(100) NOT NULL,\`destination\` varchar(100) NOT NULL,PRIMARY KEY (\`id\`),FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8;" -u root -p${config.rootPassword}`;
    await $`mysql --execute "ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY '${config.rootPassword}';" -u root -p${config.rootPassword}`;
    // restart mysql service
    await $`systemctl restart mysql`.quiet();
    console.log("MySQL setup completed successfully");
}


// SetupMysql({
//     rootPassword: "rootpassword",
//     dbName: "mailserver",
//     dbPassword: "mailserverpassword",
//     dbUser: "mailuser",
// })