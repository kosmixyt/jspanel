import type { Request, Response } from "express";
import { MailManager } from "../../scripts/mail/manager";
import { config, db } from "../../app";
import { getSession } from "@auth/express";
import { User } from "@prisma/client";



export async function createMailbox(req: Request, res: Response) {
    try {
        const { domainId, username, password } = req.body ?? {};
        const user = await getSession(req, config);
        if (!domainId || typeof domainId !== "string") {
            return res.status(400).json({ error: "Missing or invalid domainId" });
        }
        if (!username || typeof username !== "string") {
            return res.status(400).json({ error: "Missing or invalid username" });
        }
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Missing or invalid password" });
        }

        const domain = await db.domain.findUnique({
            where: { id: domainId },
            include: { Owner: true },
        });
        if (!domain) {
            return res.status(404).json({ error: "Domain not found" });
        }

        // Verify user owns this domain
        if (domain.Owner?.id !== user?.user?.id) {
            return res.status(403).json({ error: "Forbidden: You don't own this domain" });
        }


        const mailbox = await MailManager.createMailbox(domain, user.user as User, username, password);

        return res.status(201).json(mailbox);
    } catch (error) {
        console.error("createMailbox error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}
