import type { Request, Response } from "express";
import { DomainManager } from "../../scripts/domains/domains";
import { config, db } from "../../app";
import { getSession } from "@auth/express";

export async function deleteDomain(req: Request, res: Response) {
	try {
		const { domainId } = req.params;
		const user = await getSession(req, config)

		if (!domainId || typeof domainId !== "string") {
			return res.status(400).json({ error: "Missing or invalid domainId" });
		}

		// Verify user owns this domain
		const domain = await db.domain.findUnique({
			where: { id: domainId },
			include: { Owner: true },
		});

		if (!domain) {
			return res.status(404).json({ error: "Domain not found" });
		}

		if (domain.Owner?.id !== user?.user?.id) {
			return res.status(403).json({ error: "Forbidden: You don't own this domain" });
		}

		await DomainManager.deleteDomain(domainId);

		return res.status(204).send();
	} catch (error) {
		console.error("deleteDomain error", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return res.status(500).json({ error: message });
	}
}
