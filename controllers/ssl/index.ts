import type { Request, Response } from "express";
import { SSLManager } from "../../scripts/certbot/ssl";
import { db } from "../../app";

export async function listSsl(req: Request, res: Response) {
    try {
        const userId = req.userId;

        // List only SSL certificates owned by this user
        const certs = await db.ssl.findMany({
            where: { Owner: { id: userId } },
            include: { domains: true },
        });

        return res.json(certs);
    } catch (error) {
        console.error("listSsl error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}

export async function requestSsl(req: Request, res: Response) {
    try {
        const { domainIds, email } = req.body ?? {};
        const userId = req.userId;

        if (!Array.isArray(domainIds) || domainIds.length === 0) {
            return res.status(400).json({ error: "domainIds must be a non-empty array" });
        }

        const user = req.user; // Already fetched by middleware

        // Verify user owns all requested domains
        const domains = await db.domain.findMany({
            where: { id: { in: domainIds } },
            include: { Owner: true },
        });

        if (domains.length !== domainIds.length) {
            return res.status(404).json({ error: "One or more domains not found" });
        }

        for (const domain of domains) {
            if (domain.Owner?.id !== userId) {
                return res.status(403).json({ error: "Forbidden: You don't own all requested domains" });
            }
        }

        const contactEmail = email ?? user.email;
        if (!contactEmail) {
            return res.status(400).json({ error: "A contact email is required to request SSL" });
        }

        const ssl = await db.$transaction(async (tx) =>
            SSLManager.requestCertificate(tx as any, domains, contactEmail, user)
        );

        return res.status(201).json(ssl);
    } catch (error) {
        console.error("requestSsl error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}

export async function deleteSsl(req: Request, res: Response) {
    try {
        const { sslId } = req.params;
        const userId = req.userId;

        if (!sslId || typeof sslId !== "string") {
            return res.status(400).json({ error: "Missing or invalid sslId" });
        }

        const ssl = await db.ssl.findUnique({
            where: { id: sslId },
            include: { domains: true, Owner: true },
        });

        if (!ssl) {
            return res.status(404).json({ error: "SSL not found" });
        }

        // Verify user owns this SSL certificate
        if (ssl.Owner?.id !== userId) {
            return res.status(403).json({ error: "Forbidden: You don't own this SSL certificate" });
        }

        const manager = new SSLManager();
        await manager.deleteCertificate(ssl);

        return res.status(204).send();
    } catch (error) {
        console.error("deleteSsl error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}
