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
    // ssl must include all domains in the domains array
    Ssl: null | { id: string; path: string; keyPath: string; redirectHttp: boolean };
    php: null | {
        version: string;
        socketPath: string;
        phpOptions: { [key: string]: string | number | boolean };
    };
    // 404 : /custom_404.html
    // 500 : /custom_500.html
    ErrorPagesMapping: { [key: number]: string };
    indexes: string[];
    rootPath: string;
    // Paths: ({ path: string } & (RestrictedPath | ProxyOptions & Header & IpRestriction))[];
    Paths: {
        path: string;
        elements: (RestrictedPath | (ProxyOptions & { Headers?: Header[] } & IpRestriction))[];
    }[]
    AccessLogPath: string;
    ErrorLogPath: string;

}

export interface RestrictedPath {
    path: string;
    password: string;
}
export interface IpRestriction {
    allow: string[];
    deny: string[];
}
export interface Header {
    name: string;
    value: string;
}
export interface ProxyOptions {
    target: string;
    Websocket: boolean;
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
