import { $ } from "bun";
import fs from "fs"
import os from "os";


const RequiredPackages = [
    "certbot"
]
export async function SetupCertbot() {
    console.log("Installing required packages...");
    await $`DEBIAN_FRONTEND=noninteractive apt install -y ${RequiredPackages}`.quiet();
    console.log("Installed required packages");
}

SetupCertbot()




