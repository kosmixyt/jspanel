import { $ } from "bun"



export class Config {
    private static cachedIpv4: string | null = null;
    private static cachedIpv6: string | null = null;
    public static async getIpv4Address(): Promise<string> {
        if (this.cachedIpv4) {
            return this.cachedIpv4;
        }
        this.cachedIpv4 = (await $`curl -4 ifconfig.me`.quiet()).stdout.toString().trim();
        return this.cachedIpv4;
    }
    public static async getIpv6Address(): Promise<string> {
        if (this.cachedIpv6) {
            return this.cachedIpv6;
        }
        this.cachedIpv6 = (await $`curl -6 ifconfig.me`.quiet()).stdout.toString().trim();
        return this.cachedIpv6;
    }
    public static async getIps(): Promise<string[]> {
        const ips = [];
        try {
            const ipv4 = await this.getIpv4Address();
            if (ipv4) {
                ips.push(ipv4);
            }
        } catch (e) {
            console.warn("Could not get IPv4 address:", e);
        }
        try {
            const ipv6 = await this.getIpv6Address();
            if (ipv6) {
                ips.push(ipv6);
            }
        } catch (e) {
            console.warn("Could not get IPv6 address:", e);
        }
        return ips;
    }
}