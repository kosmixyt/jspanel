import type { Domain, MailBox, Prisma, User } from "@prisma/client";
import { SSLManager } from "../certbot/ssl";
import { MailManager, type DomainAddConfig } from "../mail/manager";
import { db } from "../../app";

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

    public static async deleteDomain(domainId: string): Promise<void> {
        const domain = await db.domain.findUnique({
            where: { id: domainId },
            include: {
                Ssl: { include: { domains: true, Owner: true } },
                Owner: true,
            },
        });

        if (!domain) {
            throw new Error("Domain not found");
        }

        await MailManager.removeDomain(domain);

        if (domain.Ssl) {
            await db.domain.update({ where: { id: domain.id }, data: { sslId: null } });
            const sslManager = new SSLManager();
            await sslManager.deleteCertificate(domain.Ssl);
        }

        await db.domain.delete({ where: { id: domain.id } });
    }
    public static async NewMailBox(domain: Domain, user: User, username: string, password: string): Promise<MailBox> {
        return await MailManager.createMailbox(domain, user, username, password);
    }
}