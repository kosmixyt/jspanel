import { $ } from "bun"
import mysql from "mysql2/promise"
import { db } from "~/server/db"

let localDatabase: null | mysql.Connection = null
export const mysqlLocalDbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'rootpassword',
}

export class MysqlManager {

    static async restart() {
        console.log("Restarting mysql...")
        $`systemctl restart mysql`.quiet()
    }

    static async getDatabase() {
        if (localDatabase) return localDatabase
        localDatabase = await mysql.createConnection({
            ...mysqlLocalDbConfig,
            multipleStatements: true,
        })
        return localDatabase
    }

    static validateIdentifier(id: string, name = "identifier") {
        if (!/^[A-Za-z0-9_\-\.]+$/.test(id)) {
            throw new Error(`Invalid ${name}: ${id}`)
        }
    }

    static async AddMysqlDatabase(name: string, ownerId: string) {
        this.validateIdentifier(name, "database name")
        const conn = await this.getDatabase()
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\``)

        const existing = await db.mysqlDatabase.findUnique({ where: { name } })
        if (!existing) {
            return db.mysqlDatabase.create({
                data: {
                    name,
                    Owner: { connect: { id: ownerId } },
                },
            })
        }
        return existing
    }

    static async RemoveMysqlDatabase(name: string) {
        this.validateIdentifier(name, "database name")
        const conn = await this.getDatabase()
        await conn.query(`DROP DATABASE IF EXISTS \`${name}\``)

        try {
            return await db.mysqlDatabase.delete({ where: { name } })
        } catch (err) {
            return null
        }
    }

    static async AddMysqlUser(username: string, password: string, host = "localhost", ownerId?: string) {
        this.validateIdentifier(username, "username")
        this.validateIdentifier(host, "host")
        const conn = await this.getDatabase()
        await conn.query(`CREATE USER IF NOT EXISTS '${username}'@'${host}' IDENTIFIED BY '${password}'`)

        const data: any = { username, host, password }
        if (ownerId) data.Owner = { connect: { id: ownerId } }

        const existing = await db.mysqlUser.findUnique({ where: { username } })
        if (!existing) {
            return db.mysqlUser.create({ data })
        }
        return db.mysqlUser.update({ where: { username }, data: { host, password } })
    }

    static async RemoveMysqlUser(username: string, host = "localhost") {
        this.validateIdentifier(username, "username")
        this.validateIdentifier(host, "host")
        const conn = await this.getDatabase()
        await conn.query(`DROP USER IF EXISTS '${username}'@'${host}'`)

        try {
            return await db.mysqlUser.delete({ where: { username } })
        } catch (err) {
            return null
        }
    }

    static async GrantMysqlRights(databaseName: string, username: string, host = "localhost", rights = "ALL PRIVILEGES") {
        this.validateIdentifier(databaseName, "database name")
        this.validateIdentifier(username, "username")
        this.validateIdentifier(host, "host")
        const conn = await this.getDatabase()
        await conn.query(`GRANT ${rights} ON \`${databaseName}\`.* TO '${username}'@'${host}'`)
        await conn.query(`FLUSH PRIVILEGES`)

        const dbRec = await db.mysqlDatabase.findUnique({ where: { name: databaseName } })
        const userRec = await db.mysqlUser.findUnique({ where: { username } })
        if (!dbRec || !userRec) {
            throw new Error("Database or user not found in Prisma. Create them first before granting rights.")
        }

        const existing = await db.mysqlRights.findUnique({ where: { databaseId_userId: { databaseId: dbRec.id, userId: userRec.id } } })
        if (!existing) {
            return db.mysqlRights.create({ data: { databaseId: dbRec.id, userId: userRec.id, rights } })
        }
        return db.mysqlRights.update({ where: { id: existing.id }, data: { rights } })
    }

    static async RevokeMysqlRights(databaseName: string, username: string, host = "localhost") {
        this.validateIdentifier(databaseName, "database name")
        this.validateIdentifier(username, "username")
        this.validateIdentifier(host, "host")
        const conn = await this.getDatabase()
        await conn.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${username}'@'${host}'`)
        await conn.query(`FLUSH PRIVILEGES`)

        const dbRec = await db.mysqlDatabase.findUnique({ where: { name: databaseName } })
        const userRec = await db.mysqlUser.findUnique({ where: { username } })
        if (!dbRec || !userRec) return null

        try {
            return await db.mysqlRights.delete({ where: { databaseId_userId: { databaseId: dbRec.id, userId: userRec.id } } })
        } catch (err) {
            return null
        }
    }
}
