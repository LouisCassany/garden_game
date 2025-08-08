
import { resetGame, game } from '../game'

export default defineEventHandler(() => {
    resetGame()
    return {
        game
    }
})