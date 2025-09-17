import { $ } from "bun";
import os from "os";

export async function SetupDovecot() {
  const hostname = os.hostname();
  console.log("Would You use hostname:", hostname);
  const out = await $`doveconf`;
}

SetupDovecot();
