import type { Domain, MailBox, Prisma, User } from "@prisma/client";
import { SSLManager } from "scripts/certbot/ssl";
import { MailManager, type DomainAddConfig } from "scripts/mail/manager";
import { db } from "~/server/db";

interface DomainConfig {
    // any specific config for the domain
    requestSsl: boolean;
    enableEmail: boolean;
    emailConfig?: DomainAddConfig
}


export class DomainManager {
    public static async addDomain(domain: string, user: User, config: DomainConfig): Promise<Domain> {
        return await db.$transaction(async (tx) => {
            // check if domain exists
            const existing = await tx.domain.findFirst({
                where: { domain }
            })
            if (existing) {
                throw new Error("Domain already exists")
            }
            const dm = await tx.domain.create({
                data: {
                    domain,
                    Owner: {
                        connect: {
                            id: user.id
                        }
                    }
                }
            })
            let ssl: Prisma.SslGetPayload<{ include: { domains: true } }> | undefined = undefined
            if (config.requestSsl) {
                // request ssl for domain
                if (!user.email) {
                    throw new Error("User must have an email to request SSL")
                }
                ssl = await SSLManager.requestCertificate(tx, [dm], user.email, user)
            }
            if (config.enableEmail) {
                if (!config.emailConfig) {
                    throw new Error("Email config is required when email is enabled")
                }
                if (!config.requestSsl || !ssl) {
                    throw new Error("SSL is required when email is enabled")
                }
                await MailManager.addDomain(dm, user, config.emailConfig, ssl)
            }
            return dm;
        }, { timeout: 40000 });
    }
    public static async NewMailBox(domain: Domain, user: User, username: string, password: string): Promise<MailBox> {
        return await MailManager.createMailbox(domain, user, username, password);
    }
}