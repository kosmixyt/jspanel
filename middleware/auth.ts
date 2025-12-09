import type { Request, Response, NextFunction } from "express";
import { config, db } from "../app";
import { getSession } from "@auth/express";



export async function authMiddleware(req: Request, res: Response, next: NextFunction) {


	const user = await getSession(req, config);
	if (!user) {
		console.log("authMiddleware: No user session found");
		return res.status(401).json({ error: "Unauthorized" });
	}
	next();
}
