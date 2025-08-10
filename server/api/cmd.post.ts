import { type Command } from "../../app/engine";
import { game } from '../game'


export default defineEventHandler(async (event) => {
    const command = await readBody(event) as Command
    if (typeof (game as any)[command.type] !== "function") {
        return createError({ statusCode: 400, message: "Invalid command: " + command.type })
    }
    try {
        (game as any)[command.type](...command.args);
    } catch (err: any) {
        return createError({ statusCode: 400, message: err.message })
    }
})