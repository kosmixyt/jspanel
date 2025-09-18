import { exec } from "child_process";

export class SslRequester {
    public domains: string[] = []
    public email: string = ""
    constructor(domains: string[], email: string) {
        this.domains = domains
        this.email = email
    }
    /**
     * Demande un certificat SSL via certbot pour les domaines et l'email spécifiés.
     * Utilise l'option --standalone : certbot lance son propre serveur web temporaire pour valider le domaine,
     * utile si aucun autre serveur web (ex: nginx, apache) ne tourne sur le port 80.
     * @returns Promise<void>
     */
    public async requestCertificate(): Promise<void> {
        const domainsArg = this.domains.map(d => `-d ${d}`).join(' ');
        const emailArg = `--email ${this.email}`;
        const cmd = `certbot certonly --standalone ${domainsArg} ${emailArg} --agree-tos --non-interactive`;

        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Certbot failed: ${stderr || error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }
}