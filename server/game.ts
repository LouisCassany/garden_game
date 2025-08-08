import MultiplayerGardenGame from "../app/engine";

const GAME_SETTINGS = {
    GRID_SIZE: 5,
    MAX_RESOURCES: 20,
    MAX_INFESTATIONS: 3,
    DRAFT_SIZE: 5,
};

export function resetGame() {
    game = new MultiplayerGardenGame(["louis", "melanie"], GAME_SETTINGS);
}

export let game = new MultiplayerGardenGame(['louis', 'melanie'], GAME_SETTINGS);