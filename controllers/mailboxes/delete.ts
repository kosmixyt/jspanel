import type { Request, Response } from "express";
import { MailManager } from "../../scripts/mail/manager";
import { config, db } from "../../app";
import { getSession } from "@auth/express";

export async function deleteMailbox(req: Request, res: Response) {
    try {
        const { mailboxId } = req.params;
        const user = await getSession(req, config);
        if (!mailboxId || typeof mailboxId !== "string") {
            return res.status(400).json({ error: "Missing or invalid mailboxId" });
        }

        const mailbox = await db.mailBox.findUnique({
            where: { id: mailboxId },
            include: { Domain: { include: { Owner: true } } },
        });
        if (!mailbox) {
            return res.status(404).json({ error: "Mailbox not found" });
        }

        // Verify user owns the domain that this mailbox belongs to
        if (mailbox.Domain?.Owner?.id !== user?.user?.id) {
            return res.status(403).json({ error: "Forbidden: You don't own this mailbox's domain" });
        }

        await MailManager.deleteMailbox(mailbox);
        return res.status(204).send();
    } catch (error) {
        console.error("deleteMailbox error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}
