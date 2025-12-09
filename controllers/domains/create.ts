import type { Request, Response } from "express";
import { DomainManager } from "../../scripts/domains/domains";
import { db } from "../../app";

export async function createDomain(req: Request, res: Response) {
	try {
		const { domain, requestSsl = false, enableEmail = false, emailConfig } = req.body ?? {};
		const userId = req.userId;

		// userId is already verified by auth middleware
		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		if (!domain || typeof domain !== "string") {
			return res.status(400).json({ error: "Missing or invalid domain" });
		}

		const user = req.user; // Already fetched by middleware

		const created = await DomainManager.addDomain(domain, user, {
			requestSsl,
			enableEmail,
			emailConfig,
		});

		return res.status(201).json(created);
	} catch (error) {
		console.error("createDomain error", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return res.status(500).json({ error: message });
	}
}


