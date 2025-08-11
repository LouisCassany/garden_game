type Resource = 'water' | 'light' | 'compost';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy' | 'Cactus' | 'Bamboo' | 'Vine' | 'Fern' | 'LemonTree';
type BuildingName = 'Pond' | 'Compost'
export type TurnState = 'PLACE' | 'GROW' | 'PEST' | 'END' | 'DONE';

export type PlayerId = string;

export interface PlayerState {
    id: PlayerId;
    garden: Garden;
    score: number;
    resources: Record<Resource, number>;
    infestation: number;
    turnState: TurnState
    pestToPlace: number;
}

export interface MultiplayerGameState {
    players: Record<PlayerId, PlayerState>;
    deck: Tile[];
    draftZone: (PlantTile | BuildingTile)[];
    currentTurn: number;
    currentPlayer: PlayerId;
    log: string[];
}

interface PlantData {
    name: PlantName;
    growthCost: Partial<Record<Resource, number>>;
    basePoints: number;
    growEffect: (neighbors: (Tile | null)[], playerState: PlayerState) => void;
    effect: string
    description: string;
}

interface BuildingData {
    name: BuildingName;
    basePoints: number;
    placeEffect: (playerState: PlayerState) => void;
    effect: string;
    description: string;
}

export interface PlantTile {
    id: string;
    type: 'plant';
    data: PlantData;
    grown: boolean;
}

interface PestTile {
    type: 'pest';
}

interface BuildingTile {
    id: string;
    type: 'building';
    data: BuildingData;
}

export type Tile = PlantTile | PestTile | BuildingTile;

export type Garden = (Tile | null)[][]; // 5x5 grid

type Settings = {
    GRID_SIZE: number;
    MAX_RESOURCES: number;
    MAX_INFESTATIONS: number;
    DRAFT_SIZE: number;
}

// List of games commands to export for client-side usage
interface GameCommands {
    growPlant: {
        args: Parameters<MultiplayerGardenGame["growPlant"]>;
        return: ReturnType<MultiplayerGardenGame["growPlant"]>;
    };
    placePlantTile: {
        args: Parameters<MultiplayerGardenGame["placeTile"]>;
        return: ReturnType<MultiplayerGardenGame["placeTile"]>;
    };
    nextTurn: {
        args: Parameters<MultiplayerGardenGame["nextTurn"]>;
        return: ReturnType<MultiplayerGardenGame["nextTurn"]>;
    };
    skipGrowPhase: {
        args: Parameters<MultiplayerGardenGame["skipGrowPhase"]>;
        return: ReturnType<MultiplayerGardenGame["skipGrowPhase"]>;
    };
    placePestTile: {
        args: Parameters<MultiplayerGardenGame["placePestTile"]>;
        return: ReturnType<MultiplayerGardenGame["placePestTile"]>;
    };
}

// Automatically derive command union
type CommandMap = {
    [K in keyof GameCommands]: {
        type: K;
        args: GameCommands[K]["args"];
        __return?: GameCommands[K]["return"]; // used only for inference
    };
};

// Strongly typed client-side command sender
export async function sendCommand<K extends keyof GameCommands>(
    type: K, args: GameCommands[K]["args"][0]
)/*: Promise<Awaited<GameCommands[K]["return"]>>*/ {
    const res = await fetch("/api/cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, args: [args] }),
    });
    if (!res.ok) {
        throw new Error(`Command failed: ${await res.text()}`);
    };
}

export type Command = CommandMap[keyof CommandMap];

// Utility
function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

const buildingLibrary: BuildingData[] = [
    {
        name: 'Compost',
        basePoints: 0,
        placeEffect: (playerState) => {
            playerState.resources.compost += 1;
        },
        description: 'Compost is a nutritious resource that can be used to grow plants.',
        effect: '+2 compost resource on PLACEMENT',
    },
    {
        name: 'Pond',
        basePoints: 0,
        placeEffect: (playerState) => {
            playerState.resources.water += 2;
        },
        description: 'Ponds are a source of water.',
        effect: '+2 water resource on PLACEMENT',
    },
]

// Plant definitions
const plantLibrary: PlantData[] = [
    {
        name: 'Lavender',
        growthCost: { water: 1, light: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.filter(t => t?.type === 'plant' && t.data.name !== 'Lavender').length;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        description: 'Lavender thrives near other plants, but not near Lavender itself.',
        effect: '+1 point for each different plant neighbor',
    },
    {
        name: 'Sunflower',
        growthCost: { light: 2 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'building' && t.data.name === 'Compost') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.resources.compost += 1;
            }
        },
        description: 'Sunflower loves compost.',
        effect: '+1 point for each compost neighbor',
    },
    {
        name: 'Mushroom',
        growthCost: { compost: 2 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant' && t.data.name === 'Tree') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.score += 1;
            }
        },
        effect: '+1 point for each Tree neighbor',
        description: 'Mushrooms grow well near trees.',
    },
    {
        name: 'Tree',
        growthCost: {},
        basePoints: 3,
        growEffect: () => { },
        description: 'Trees are strong but require more resources.',
        effect: "",
    },
    {
        name: 'Daisy',
        growthCost: { water: 1, light: 1 },
        basePoints: 1,
        description: 'Daisies love being around other plants.',
        effect: '+1 point for each plant neighbor',
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.filter(t => t?.type === 'plant').length;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
    },
    {
        name: 'Cactus',
        growthCost: { light: 2 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const emptySpaces = neighbors.filter(t => t === null).length;
            if (emptySpaces > 0) {
                playerState.score += emptySpaces;
            }
        },
        description: 'Cactus thrives in isolation.',
        effect: '+1 point for each empty adjacent space',
    },
    {
        name: 'Bamboo',
        growthCost: { water: 1, compost: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const bambooNeighbors = neighbors.filter(t =>
                t?.type === 'plant' && t.data.name === 'Bamboo'
            ).length;
            if (bambooNeighbors > 0) {
                playerState.score += bambooNeighbors * 2;
            }
        },
        description: 'Bamboo grows in clusters.',
        effect: '+2 points for each adjacent Bamboo',
    },
    {
        name: 'Vine',
        growthCost: { water: 1, light: 1 },
        basePoints: 0,
        growEffect: (neighbors, playerState) => {
            const grownNeighbors = neighbors.filter(t =>
                t?.type === 'plant' && t.grown
            ).length;
            if (grownNeighbors > 0) {
                playerState.score += grownNeighbors;
            }
        },
        description: 'Vines benefit from grown plants.',
        effect: '+1 point for each grown neighbor',
    },
    {
        name: 'Fern',
        growthCost: { water: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const treeNeighbors = neighbors.some(t =>
                t?.type === 'plant' && t.data.name === 'Tree'
            );
            if (treeNeighbors) {
                playerState.resources.light += 2;
            }
        },
        description: 'Ferns grow in tree shade. ',
        effect: "+2 light resource when next to a Tree",
    },
    {
        name: 'LemonTree',
        growthCost: { water: 1, light: 1, compost: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            playerState.score += 5;
            playerState.pestToPlace++;
        },
        description: 'Lemon trees are beautiful but attract pests.',
        effect: "+5 points and +1 pest",
    }

];

export default class MultiplayerGardenGame {
    state: MultiplayerGameState;
    private readonly settings: Settings

    constructor(playerIds: PlayerId[], settings: Settings) {
        this.settings = settings;

        if (playerIds.length < 2) throw new Error('At least 2 players are required');

        const players: Record<PlayerId, PlayerState> = {};
        for (const id of playerIds) {
            players[id] = {
                id,
                garden: Array.from({ length: settings.GRID_SIZE }, () => Array(settings.GRID_SIZE).fill(null)),
                score: 0,
                resources: { water: 1, light: 1, compost: 1 },
                infestation: 0,
                turnState: 'PLACE',
                pestToPlace: 0,
            };
        }

        this.state = {
            players,
            deck: this.generateDeck(playerIds.length),
            draftZone: [],
            currentTurn: 1,
            currentPlayer: playerIds[0] as PlayerId,
            log: [],
        };

        // Fill the draft zone with cards ensuring pest are not drawn first
        while (this.state.draftZone.length < settings.DRAFT_SIZE) {
            const tile = this.drawTile();
            if (tile) {
                // If it's a pest, put it back in the deck, shuffle the deck and refill the draft zone
                if (tile.type === 'pest') {
                    this.state.deck.push(tile);
                    this.shuffle(this.state.deck);
                } else {
                    this.state.draftZone.push(tile);
                }
            }
        }

    }

    // Init action
    private generateDeck(playerCount: number): Tile[] {
        const deck: Tile[] = [];

        // Scale cards with player count
        for (let i = 0; i < 3 * playerCount; i++) {
            for (const plant of plantLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'plant',
                    data: plant,
                    grown: false,
                });
            }
        }

        for (let i = 0; i < 34 * playerCount; i++) {
            deck.push({ type: 'pest' });
        }

        return this.shuffle(deck);
    }

    // Player action
    growPlant({ playerId, x, y }: { playerId: PlayerId, x: number, y: number }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId] as PlayerState;
        if (!playerState || playerState.turnState !== 'GROW') throw new Error('Incorrect turn state');

        const tile = playerState.garden[y]![x];
        if (!tile || !this.isPlantTile(tile) || tile.grown) throw new Error('Invalid tile to grow (not plant or already grown)');

        // if the plant have no growth cost, it can't be grown
        const resourcesNeeded = tile.data.growthCost;
        if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) throw new Error('Invalid tile to grow (no growth cost)');

        const cost = tile.data.growthCost;
        if (!this.hasResources(playerId, cost)) throw new Error('Not enough resources');

        // Spend the player resources
        this.spendResources(playerId, cost);
        tile.grown = true;

        // Trigger the plant's grow effect
        const neighbors = this.getNeighbors(playerState.garden, x, y);
        tile.data.growEffect(neighbors, playerState);

        this.log(`Player ${playerId} grew ${tile.data.name} at (${x}, ${y})`);
        this.nextTurnPhase(playerId);
    }

    // Player action
    placeTile({ playerId, tileIndex, x, y }: { playerId: PlayerId, tileIndex: number, x: number, y: number }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'PLACE') throw new Error('Cannot place tile this turn');
        if (!this.inBounds(x, y)) throw new Error('Out of bounds');

        // Select the tile from the draft zone
        const tile = this.state.draftZone[tileIndex];
        if (!tile) throw new Error('Invalid tile index');
        const existing = playerState.garden[y]![x];
        if (existing) throw new Error('Tile already exists at this position');

        playerState.garden[y]![x] = tile;
        this.state.draftZone.splice(tileIndex, 1);

        if (tile.type == 'building') tile.data.placeEffect(playerState);
        playerState.score += tile.data.basePoints;

        this.nextTurnPhase(playerId);

        this.log(`Player ${playerId} placed ${tile.type} at (${x}, ${y})`);
    }

    // Player action
    placePestTile({ playerId, x, y, tile }: { playerId: PlayerId, x: number, y: number, tile: PestTile }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'PEST') throw new Error('Cannot place pest this turn');

        if (!this.inBounds(x, y)) throw new Error('Out of bounds');

        const existing = playerState.garden[y]![x];

        if (existing?.type === 'pest') {
            this.log(`Player ${playerId}: Cannot place pest on ${existing.type} at (${x}, ${y})`);
            throw new Error('Cannot place pest on other pests');
        }

        // If placing on a plant or a building, reduce score by plant's base points
        if (existing) {
            playerState.score -= existing.data.basePoints;
            this.log(`Player ${playerId}: Pest destroyed ${existing.data.name} at (${x}, ${y}), lost ${existing.data.basePoints} points`);
        } else {
            this.log(`Player ${playerId}: Placed pest at empty space (${x}, ${y})`);
        }

        // Place pest and check for infestation
        playerState.garden[y]![x] = tile;
        this.checkInfestation(playerId, x, y);
        // Decrease pest count
        playerState.pestToPlace--;
        this.nextTurnPhase(playerId);
    }

    // Player action
    skipGrowPhase({ playerId }: { playerId: PlayerId }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'GROW') throw new Error('Cannot skip grow phase this turn');

        this.nextTurnPhase(playerId);
    }

    // Game action
    drawTile(): Tile | null {
        if (this.state.deck.length === 0) return null;
        return this.state.deck.pop() || null;
    }

    // Game action
    private gainResource(playerId: PlayerId, type: Resource, amount: number) {
        const playerState = this.state.players[playerId];
        if (!playerState) return;
        playerState.resources[type] = Math.min(this.settings.MAX_RESOURCES, playerState.resources[type] + amount);
    }

    private nextTurnPhase(playerId: PlayerId) {
        const playerState = this.state.players[playerId];
        if (!playerState) return;
        if (playerState.turnState === 'PLACE') playerState.turnState = 'GROW';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace > 0) playerState.turnState = 'PEST';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'PEST' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'END') {
            if (this.isPlayerDonePlaying(playerId)) playerState.turnState = 'DONE';
            else playerState.turnState = 'PLACE';
        }
    }

    // Game action
    private checkInfestation(playerId: PlayerId, x: number, y: number) {
        const playerState = this.state.players[playerId];
        if (!playerState) return;

        const neighbors = this.getNeighbors(playerState.garden, x, y);
        const pestNeighbors = neighbors.filter(t => t?.type === 'pest').length;
        if (pestNeighbors >= 1) {
            playerState.infestation += 1;
            this.log(`Player ${playerId} infestation increased to ${playerState.infestation}`);
        }
    }

    private getNeighbors(garden: Garden, x: number, y: number): (Tile | null)[] {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        //@ts-ignore
        return dirs.map(([dx, dy]) => this.inBounds(x + dx, y + dy) ? garden[y + dy][x + dx] : null);
    }

    nextTurn({ playerId }: { playerId: PlayerId }) {
        if (playerId !== this.state.currentPlayer || this.state.players[playerId]!.turnState !== 'END') throw new Error('Not your turn');

        const playerIds = Object.keys(this.state.players);
        const currentIndex = playerIds.indexOf(playerId);
        const nextIndex = (currentIndex + 1) % playerIds.length;

        if (nextIndex === 0) {
            this.state.currentTurn++;
        }

        // Set the next player as current
        this.state.currentPlayer = playerIds[nextIndex] as PlayerId;

        // Draw a new tile and while we draw pest tiles, count them
        let newCard = this.drawTile();
        while (newCard?.type === 'pest') {
            // Increase pest count for all players
            for (const player of Object.values(this.state.players)) {
                player.pestToPlace++;
            }
            this.log(`All players gained a pest to place at the end of their turn`);
            newCard = this.drawTile();
        }
        if (newCard) {
            this.state.draftZone.push(newCard);
        }
        this.nextTurnPhase(playerId);
        this.gainRandomResource(playerId);
        this.gainRandomResource(playerId);
    }

    isPlayerDonePlaying(playerId: PlayerId): boolean {
        const playerState = this.state.players[playerId];
        if (!playerState) return false;
        // game ends if the player have a full garden or they hit the max infestation
        return playerState.garden.every(row => row.every(cell => cell !== null)) || playerState.infestation >= this.settings.MAX_INFESTATIONS;
    }


    getWinner(): PlayerId | null {
        let highestScore = -1;
        let winner: PlayerId | null = null;

        for (const [playerId, player] of Object.entries(this.state.players)) {
            if (player.score > highestScore) {
                highestScore = player.score;
                winner = playerId;
            }
        }

        return winner;
    }

    private log(message: string) {
        this.state.log.push(`[Turn ${this.state.currentTurn}] ${message}`);
    }

    shuffle<T>(array: T[]): T[] {
        return array.sort(() => Math.random() - 0.5);
    }

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.settings.GRID_SIZE && y >= 0 && y < this.settings.GRID_SIZE;
    }

    private gainRandomResource(playerId: PlayerId) {
        const resources: Resource[] = ['water', 'light', 'compost'];
        const randomIndex = Math.floor(Math.random() * resources.length);
        const randomResource = resources[randomIndex] as Resource;
        this.gainResource(playerId, randomResource, 1);
    }

    private hasResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>): boolean {
        const playerState = this.state.players[playerId];
        if (!playerState) return false;

        return Object.entries(cost).every(([resource, amount]) =>
            playerState.resources[resource as Resource] >= (amount ?? 0)
        );
    }

    private spendResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>) {
        const playerState = this.state.players[playerId];
        if (!playerState) return;

        for (const [resource, amount] of Object.entries(cost)) {
            playerState.resources[resource as Resource] -= amount!;
        }
    }

    private isPlantTile(tile: Tile | null): tile is PlantTile {
        return tile !== null && tile.type === 'plant';
    }
}
