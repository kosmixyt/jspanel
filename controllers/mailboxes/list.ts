import type { Request, Response } from "express";
import { config, db } from "../../app";
import { getSession } from "@auth/express";

export async function listMailboxes(req: Request, res: Response) {
    try {
        const user = (await getSession(req, config))!;
        // Find mailboxes for domains owned by this user
        const mailboxes = await db.mailBox.findMany({
            where: { Domain: { Owner: { id: user.user?.id } } },
            include: { Domain: true },
        });
        return res.json(mailboxes);
    } catch (error) {
        console.error("listMailboxes error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}
