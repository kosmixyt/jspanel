import { PrismaClient } from "@prisma/client";
import express from "express";
import { createDomain } from "./controllers/domains/create";
import { deleteDomain } from "./controllers/domains/delete";
import { listDomains } from "./controllers/domains/list";
import { createMailbox } from "./controllers/mailboxes/create";
import { deleteMailbox } from "./controllers/mailboxes/delete";
import { listMailboxes } from "./controllers/mailboxes/list";
import { deleteSsl, listSsl, requestSsl } from "./controllers/ssl";
import { ExpressAuth } from "@auth/express";
import Discord from "@auth/express/providers/discord"
import { authMiddleware } from "./middleware/auth";

export const app = express();
export const db = new PrismaClient();

app.use(express.json());

// Setup Auth.js BEFORE CORS middleware (to avoid conflicts)
export const config = {
	providers: [Discord],
	secret: process.env.AUTH_SECRET,
	basePath: "/auth",
}
const authHandler = ExpressAuth(config);


// CORS and headers middleware
app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
	res.setHeader("Access-Control-Allow-Credentials", "true");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	// Auth routes only support GET and POST
	if (req.path.startsWith("/auth")) {
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		if (req.method === "OPTIONS") {
			return res.sendStatus(200);
		}
		return next();
	}

	// Other routes support all methods
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}
	next();
})
app.use("/auth", authHandler);


// Protect all other routes with authentication middleware


app.get("/domains", authMiddleware, listDomains);
app.post("/domains", authMiddleware, createDomain);
app.delete("/domains/:domainId", authMiddleware, deleteDomain);


app.get("/mailboxes", authMiddleware, listMailboxes);
app.post("/mailboxes", authMiddleware, createMailbox);
app.delete("/mailboxes/:mailboxId", authMiddleware, deleteMailbox);

app.get("/ssl",authMiddleware, listSsl);
app.post("/ssl", authMiddleware, requestSsl);
app.delete("/ssl/:sslId", authMiddleware, deleteSsl);

async function main() {
    app.listen(3000, () => {
        console.log("Server started on http://localhost:3000");
    });
}

main();