import { exec, execSync } from "child_process";
import { $ } from "bun";
import fs from "fs";
import path from "path";
import os from "os"
import type { User, Domain, Ssl, Prisma } from "@prisma/client";
import { db } from "~/server/db";
import type { PrismaClient } from "@prisma/client/extension";


interface SslPath {
    certPath: string; // Chemin vers le fichier du certificat (fullchain.pem)
    keyPath: string;  // Chemin vers le fichier de la clé privée (privkey.pem)
}
//   Certificate Name: test2.kosmix.me
//     Serial Number: 65ad8616a048514bff982572894597c9623
//     Key Type: ECDSA
//     Domains: test2.kosmix.me
//     Expiry Date: 2025-12-17 06:34:07+00:00 (VALID: 89 days)
//     Certificate Path: /etc/letsencrypt/live/test2.kosmix.me/fullchain.pem
//     Private Key Path: /etc/letsencrypt/live/test2.kosmix.me/privkey.pem
interface SslInfo {
    certificateName: string; // Nom du certificat
    serialNumber: string;    // Numéro de série du certificat
    keyType: string;         // Type de clé (ex: RSA, ECDSA)
    domains: string[];       // Liste des domaines associés au certificat
    expiryDate: Date;        // Date d'expiration du certificat
    certificatePath: string; // Chemin vers le fichier du certificat (fullchain.pem)
    privateKeyPath: string;  // Chemin vers le fichier de la clé privée (privkey.pem)
}

export class SSLManager {

    /**
     * Demande un certificat SSL via certbot pour les domaines et l'email spécifiés.
     * Utilise l'option --standalone : certbot lance son propre serveur web temporaire pour valider le domaine,
     * utile si aucun autre serveur web (ex: nginx, apache) ne tourne sur le port 80.
     * @returns Promise<SslPath>
     */
    public static async requestCertificate(tx: PrismaClient, domains: Domain[], email: string, user: User): Promise<Prisma.SslGetPayload<{ include: { domains: true } }>> {
        if (domains.length === 0) {
            throw new Error("No domains specified for SSL certificate request.");
        }
        if (!email) {
            throw new Error("No email specified for SSL certificate request.");
        }
        if (!user) {
            throw new Error("No user specified for SSL certificate request.");
        }
        const domainsArg = domains.map(d => `-d ${d.domain}`);
        const out = await $`/usr/bin/certbot certonly --standalone ${domainsArg.join(' ')} --email ${email} --agree-tos --non-interactive`;
        if (out.exitCode !== 0) {
            throw new Error(`Certbot command failed with exit code ${out.exitCode}`);
        }
        const sslPaths: SslPath = {
            certPath: path.join("/etc/letsencrypt/live", (domains[0]!.domain as string), "fullchain.pem"),
            keyPath: path.join("/etc/letsencrypt/live", (domains[0]!.domain as string), "privkey.pem")
        };
        const domainsId = domains.map(d => ({ id: d.id }))
        console.log("SSL certificate obtained:", domainsId);
        const ssl = await tx.ssl.create({
            include: { domains: true },
            data: {
                // today + 90 days
                expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                domains: {
                    connect: domainsId
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                Owner: { connect: { id: user.id } },
                certPath: sslPaths.certPath,
                keyPath: sslPaths.keyPath,
            }
        })
        return ssl;
    }

    /**
     * Supprime un certificat SSL via certbot et met à jour la base de données.
     * @param domain Le domaine principal du certificat à supprimer
     * @returns Promise<void>
     */
    // ssl with domains

    public async deleteCertificate(ssl: Prisma.SslGetPayload<{ include: { domains: true, Owner: true } }>): Promise<void> {
        if (!ssl) {
            throw new Error("No SSL specified for deletion.");
        }

        try {
            // Supprimer le certificat via certbot
            const out = await $`/usr/bin/certbot delete --cert-name ${ssl.domains[0]!.domain} --non-interactive`;

            if (out.exitCode !== 0) {
                throw new Error(`Certbot delete command failed with exit code ${out.exitCode}: ${out.stderr}`);
            }

            console.log(`Certificate for domain ${ssl.domains[0]!.domain} deleted successfully.`);

            // Supprimer les enregistrements SSL de la base de données
            const deletedSsls = await db.ssl.delete({
                where: { id: ssl.id }
            })

            console.log(`Deleted ${deletedSsls.id} SSL records from database.`);

        } catch (error) {
            console.error(`Error deleting certificate for domain ${ssl.domains[0]!.domain}:`, error);
            throw error;
        }
    }

    /**
     * Liste tous les certificats SSL disponibles.
     * @returns Promise<string[]> Liste des noms de certificats
     */

    public static async listCertificates(): Promise<SslInfo[]> {

        try {
            const out = await $`/usr/bin/certbot certificates`.quiet();
            if (out.exitCode !== 0) {
                throw new Error(`Certbot list command failed with exit code ${out.exitCode}: ${out.stderr}`);
            }
            const output = out.stdout.toString();
            const lines = output.split('\n');
            const certs: SslInfo[] = [];
            let current: Partial<SslInfo> = {};
            for (const line of lines) {
                let match;
                if ((match = line.match(/Certificate Name: (.+)/))) {
                    if (current.certificateName) {
                        // Push previous cert if exists
                        if (
                            current.certificateName &&
                            current.serialNumber &&
                            current.keyType &&
                            current.domains &&
                            current.expiryDate &&
                            current.certificatePath &&
                            current.privateKeyPath
                        ) {
                            certs.push(current as SslInfo);
                        }
                    }
                    current = {};
                    if (match && match[1]) current.certificateName = match[1].trim();
                } else if ((match = line.match(/Serial Number: (.+)/))) {
                    if (match && match[1]) current.serialNumber = match[1].trim();
                } else if ((match = line.match(/Key Type: (.+)/))) {
                    if (match && match[1]) current.keyType = match[1].trim();
                } else if ((match = line.match(/Domains: (.+)/))) {
                    if (match && match[1]) current.domains = match[1].trim().split(/\s+/);
                } else if ((match = line.match(/Expiry Date: ([^ ]+)/))) {
                    if (match && match[1]) current.expiryDate = new Date(match[1].trim());
                } else if ((match = line.match(/Certificate Path: (.+)/))) {
                    if (match && match[1]) current.certificatePath = match[1].trim();
                } else if ((match = line.match(/Private Key Path: (.+)/))) {
                    if (match && match[1]) current.privateKeyPath = match[1].trim();
                }
            }
            // Push last cert if exists
            if (
                current.certificateName &&
                current.serialNumber &&
                current.keyType &&
                current.domains &&
                current.expiryDate &&
                current.certificatePath &&
                current.privateKeyPath
            ) {
                certs.push(current as SslInfo);
            }
            return certs;
        } catch (error) {
            console.error("Error listing certificates:", error);
            throw error;
        }
    }


    public static async VerifySynchronization() {
        // Implémentation de la vérification de la synchronisation
        const certificateOnServer = await SSLManager.listCertificates();
        const certificatesInDb = await db.ssl.findMany({
            include: {
                domains: true,
                Owner: true
            }
        });
        // Comparer les deux listes et prendre des mesures si nécessaire
        // Par exemple, supprimer les certificats en base de données qui n'existent plus sur le serveur
        for (const certDb of certificatesInDb) {
            if (!certificateOnServer.find(c => c.certificateName === certDb.domains[0]?.domain)) {
                throw new Error(`Certificate ${certDb.domains[0]?.domain} exists in DB but not on server.`);
            }
        }
        // Vous pouvez également vérifier l'inverse : les certificats sur le serveur qui ne sont pas en base de données
        for (const certServer of certificateOnServer) {
            if (!certificatesInDb.find(c => c.domains[0]?.domain === certServer.certificateName)) {
                throw new Error(`Certificate ${certServer.certificateName} exists on server but not in DB.`);
            }
        }


    }
}
