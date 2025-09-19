import type { Domain } from "@prisma/client";
import { $ } from "bun";
import os from "os";
import fs from "fs"
import path from "path";

const sniMapPath = "/etc/postfix/sni_map"
const sniChainsDir = "/etc/postfix/sni-chains"
export class PostfixManager {

    public static async restart() {
        await $`systemctl restart postfix`.quiet();
    }
    public static async reload() {
        await $`systemctl reload postfix`.quiet();
    }
    public static async addSsl(domain: string, certPath: string, keyPath: string) {
        // Créer le répertoire sni-chains s'il n'existe pas
        if (!fs.existsSync(sniChainsDir)) {
            fs.mkdirSync(sniChainsDir, { recursive: true });
        }

        // Chemin du fichier combiné pour ce domaine
        const combinedCertPath = path.join(sniChainsDir, `${domain}.pem`);

        // Lire les contenus des fichiers de clé et certificat
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        const certContent = fs.readFileSync(certPath, 'utf8');

        // Combiner clé privée + chaîne de certificats (clé en premier comme requis par Postfix)
        const combinedContent = keyContent + certContent;

        // Écrire le fichier combiné
        fs.writeFileSync(combinedCertPath, combinedContent);

        // Ajouter/mettre à jour la ligne dans sni_map
        const newLine = `${domain} ${combinedCertPath}${os.EOL}`;

        // Lire le contenu actuel de sni_map
        let sniMapContent = '';
        if (fs.existsSync(sniMapPath)) {
            sniMapContent = fs.readFileSync(sniMapPath, 'utf8');
        }

        // Vérifier si le domaine existe déjà et le remplacer ou l'ajouter
        const lines = sniMapContent.split('\n').filter(line => line.trim() !== '');
        const existingLineIndex = lines.findIndex(line => line.startsWith(`${domain} `));

        if (existingLineIndex !== -1) {
            // Remplacer la ligne existante
            lines[existingLineIndex] = `${domain} ${combinedCertPath}`;
        } else {
            // Ajouter une nouvelle ligne
            lines.push(`${domain} ${combinedCertPath}`);
        }

        // Réécrire le fichier sni_map
        fs.writeFileSync(sniMapPath, lines.join('\n') + '\n');

        // Régénérer la base de données hash avec le flag -F
        await $`postmap -F ${sniMapPath}`.quiet();

        // Recharger Postfix
        await this.reload();
    }
}

