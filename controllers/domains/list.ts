import type { Request, Response } from "express";
import { config, db } from "../../app";
import { getSession } from "@auth/express";

export async function listDomains(req: Request, res: Response) {
    try {
        const user = (await getSession(req, config))!;
        const domains = await db.domain.findMany({
            where: { Owner: { id: user.user?.id } },
            include: { Owner: true },
        });
        return res.json(domains);
    } catch (error) {
        console.error("listDomains error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
    }
}
