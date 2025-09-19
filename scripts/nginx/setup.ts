import { $ } from "bun"





const RequiredPackages = [
    "nginx",
    // all php versions
    "php-fpm",
]

export async function SetupNginx() {
    console.log("Setting up Nginx...");
    $`apt update`.quiet();
    console.log("Installing required packages...");
    await $`apt install -y ${RequiredPackages}`.quiet();
    console.log("Installed required packages");
}

SetupNginx()