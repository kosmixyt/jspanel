import { $ } from "bun"
import type { Domain } from "domain";





const RequiredPackages = [
    "nginx",
    // all php versions
    "php-fpm",
]

export async function SetupNginx() {
    console.log("Setting up Nginx...");
    $`apt update`.quiet();
    console.log("Installing required packages...");
    await $`apt install -y ${RequiredPackages}`.quiet();
    console.log("Installed required packages");
}

SetupNginx()

export interface SiteOptions {
    domains: Domain[];
    Ssl: null | { id: string; path: string; keyPath: string; };
    php: null | { version: string; socketPath: string; };
    rootPath: string;
}

class NginxManager {
    static async restart() {
        console.log("Restarting Nginx...")
        $`systemctl restart nginx`.quiet()
    }
    static async reload() {
        console.log("Reloading Nginx...")
        $`systemctl reload nginx`.quiet()
    }
    static async addSite(config: SiteOptions) { }
}