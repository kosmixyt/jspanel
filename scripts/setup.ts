import { SetupDovecot } from "./mail/dovecot/setup";
import { SetupPostfix } from "./mail/postfix/setup";
import { SetupMysql } from "./mysql/setup";

export async function Setup() {
    SetupMysql()
    SetupPostfix()
    SetupDovecot()
}