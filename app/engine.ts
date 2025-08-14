type Resource = 'water' | 'light' | 'compost';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy' | 'Cactus' | 'Bamboo' | 'Vine' | 'Fern' | 'LemonTree' | 'WaterLily' | 'Honeysuckle' | 'Pumpkin' | 'BeanPlant';
type PestName = 'Aphid' | 'Locust';
type ActionCardName = 'Fertilizer' | 'Pesticide' | 'Watering' | 'Pruning' | 'Composting' | 'WeatherBoost';
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
    deck: DraftCard[];
    draftZone: DraftCard[];
    currentTurn: number;
    currentPlayer: PlayerId;
    log: string[];
    winner: PlayerId | null;
}

interface PlantData {
    name: PlantName;
    growthCost: Partial<Record<Resource, number>>;
    basePoints: number;
    growEffect: (neighbors: (Tile | null)[], playerState: PlayerState) => void;
    effect: string;
    description: string;
}

interface PestData {
    name: PestName;
    damage: number; // Points lost when placed on a plant
    spreadEffect?: (neighbors: (Tile | null)[], targetPlayer: PlayerState) => void;
    effect: string;
    description: string;
}

interface ActionCardData {
    name: ActionCardName;
    resourceCost: Partial<Record<Resource, number>>;
    immediateEffect: (playerState: PlayerState, gameState: MultiplayerGameState, target: PlantTile | PestTile, neighbor: (Tile | null)[]) => void;
    effect: string;
    description: string;
}

export interface PlantTile {
    id: string;
    type: 'plant';
    data: PlantData;
    grown: boolean;
}

export interface PestTile {
    id: string;
    type: 'pest';
    data: PestData;
}

export interface ActionCard {
    id: string;
    type: 'action';
    data: ActionCardData;
}

export type DraftCard = PlantTile | PestTile | ActionCard;
export type Tile = PlantTile | PestTile;

export type Garden = (Tile | null)[][]; // 5x5 grid

type Settings = {
    GRID_SIZE: number;
    MAX_RESOURCES: number;
    MAX_INFESTATIONS: number;
    DRAFT_SIZE: number;
}

// List of games commands to export for client-side usage
interface GameCommands {
    placePlantTile: {
        args: Parameters<MultiplayerGardenGame["placePlantTile"]>;
        return: ReturnType<MultiplayerGardenGame["placePlantTile"]>;
    };
    growPlant: {
        args: Parameters<MultiplayerGardenGame["growPlant"]>;
        return: ReturnType<MultiplayerGardenGame["growPlant"]>;
    };
    // playActionCard: {
    //     args: Parameters<MultiplayerGardenGame["playActionCard"]>;
    //     return: ReturnType<MultiplayerGardenGame["playActionCard"]>;
    // };
    // placePestOnPlayer: {
    //     args: Parameters<MultiplayerGardenGame["placePestOnPlayer"]>;
    //     return: ReturnType<MultiplayerGardenGame["placePestOnPlayer"]>;
    // };
    nextTurn: {
        args: Parameters<MultiplayerGardenGame["nextTurn"]>;
        return: ReturnType<MultiplayerGardenGame["nextTurn"]>;
    };
    skipGrowPhase: {
        args: Parameters<MultiplayerGardenGame["skipGrowPhase"]>;
        return: ReturnType<MultiplayerGardenGame["skipGrowPhase"]>;
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

const pestLibrary: PestData[] = [
    {
        name: 'Aphid',
        damage: 1,
        effect: 'Reduces plant points by 1',
        description: 'Small but persistent pest that weakens plants.',
        spreadEffect: (neighbors, targetPlayer) => {
            // Aphids spread to adjacent plants, reducing their effectiveness
            neighbors.forEach(neighbor => {
                if (neighbor?.type === 'plant') {
                    targetPlayer.score -= 1;
                }
            });
        }
    },
    {
        name: 'Locust',
        damage: 3,
        effect: 'Destroys plant completely',
        description: 'Devastating pest that completely destroys plants.',
    }
];

const actionCardLibrary: ActionCardData[] = [
    {
        name: 'Fertilizer',
        resourceCost: { compost: 1 },
        effect: 'Grow a plant instantly without paying its growth cost',
        description: 'Rich nutrients that accelerate plant growth.',
        immediateEffect: (playerState, gameState, target, neighbors) => {
            if (target.type === 'plant') {
                gameState.log.push(`${playerState.id} used Fertilizer on ${target.data.name}`);
                target.data.growEffect(neighbors, playerState);
                target.grown = true;
            } else {
                throw new Error("Can't use fertilizer on pests");
            }
        }
    },
    {
        name: 'Watering',
        resourceCost: {},
        effect: '+3 water resources',
        description: 'Abundant water for your garden.',
        immediateEffect: (playerState, gameState, target, neighbors) => {
            playerState.resources.water = Math.min(10, playerState.resources.water + 3);
            gameState.log.push(`${playerState.id} gained 3 water from Watering`);
        }
    },
    {
        name: 'Pruning',
        resourceCost: { light: 1 },
        effect: '+2 points for each grown plant',
        description: 'Careful maintenance improves plant health.',
        immediateEffect: (playerState, gameState, target, neighbors) => {
            let grownPlants = 0;
            playerState.garden.flat().forEach(tile => {
                if (tile?.type === 'plant' && tile.grown) {
                    grownPlants++;
                }
            });
            playerState.score += grownPlants * 2;
            gameState.log.push(`${playerState.id} gained ${grownPlants * 2} points from Pruning`);
        }
    },
    {
        name: 'Composting',
        resourceCost: {},
        effect: '+2 compost resources',
        description: 'Natural fertilizer from organic waste.',
        immediateEffect: (playerState, gameState, target, neighbors) => {
            playerState.resources.compost = Math.min(10, playerState.resources.compost + 2);
            gameState.log.push(`${playerState.id} gained 2 compost from Composting`);
        }
    },
    {
        name: 'WeatherBoost',
        resourceCost: {},
        effect: '+2 light resources and +1 point',
        description: 'Perfect weather conditions boost your garden.',
        immediateEffect: (playerState, gameState) => {
            playerState.resources.light = Math.min(10, playerState.resources.light + 2);
            playerState.score += 1;
            gameState.log.push(`${playerState.id} gained 2 light and 1 point from WeatherBoost`);
        }
    }
];

const plantLibrary: PlantData[] = [
    {
        name: 'Lavender',
        growthCost: { water: 1, light: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.filter(t =>
                t?.type === 'plant' && t.data.name !== 'Lavender'
            ).length;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        description: 'Thrives near other plants, but not near other Lavenders.',
        effect: '+1 point for each plant neighbor (excluding Lavender)',
    },
    {
        name: 'Sunflower',
        growthCost: { water: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            if (neighbors.some(t => t?.type === 'plant')) {
                playerState.resources.light += 2;
                playerState.score += 1; // small point boost for balance
            }
        },
        description: 'Loves light, even more when near other plants.',
        effect: '+2 light if at least 1 plant neighbor, +1 point',
    },
    {
        name: 'Mushroom',
        growthCost: { compost: 2 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            if (neighbors.some(t => t?.type === 'plant' && t.data.name === 'Tree')) {
                playerState.score += 1;
            }
        },
        effect: '+1 point for each Tree neighbor',
        description: 'Grows well near trees.',
    },
    {
        name: 'Tree',
        growthCost: {},
        basePoints: 3,
        growEffect: () => { },
        description: 'Strong and steady. Provides shade for some plants.',
        effect: 'No special effect',
    },
    {
        name: 'Daisy',
        growthCost: { water: 1, light: 1 },
        basePoints: 1,
        description: 'Loves being around other plants.',
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
        description: 'Thrives in isolation from both plants and pests.',
        effect: '+1 point for each empty adjacent space (no plants or pests)',
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
        description: 'Grows in clusters with other bamboo.',
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
        description: 'Benefits from grown plants nearby.',
        effect: '+1 point for each grown plant neighbor',
    },
    {
        name: 'Fern',
        growthCost: { water: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            if (neighbors.some(t => t?.type === 'plant' && t.data.name === 'Tree')) {
                playerState.resources.light += 1;
                playerState.score += 1;
            }
        },
        description: 'Grows in tree shade.',
        effect: '+1 light and +1 point if next to a Tree',
    },
    {
        name: 'LemonTree',
        growthCost: { water: 1, light: 1, compost: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            playerState.score += 5;
            playerState.pestToPlace++;
        },
        description: 'Beautiful but attracts pests.',
        effect: '+5 points and +1 pest to place',
    },

    // --- New water-giving plants ---
    {
        name: 'WaterLily',
        growthCost: { light: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const emptySpaces = neighbors.filter(t => t === null).length;
            playerState.resources.water += emptySpaces;
            playerState.score += 1; // incentive
        },
        description: 'Collects water from open surroundings.',
        effect: '+1 water per empty space, +1 point',
    },
    {
        name: 'Honeysuckle',
        growthCost: { compost: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const plantNeighbors = neighbors.filter(t => t?.type === 'plant').length;
            playerState.resources.water += plantNeighbors;
            if (plantNeighbors > 1) playerState.score += 1; // reward clustering
        },
        description: 'Draws water from nearby plants.',
        effect: '+1 water per plant neighbor, +1 point if ≥ 2 plant neighbors',
    },

    // --- New compost-giving plants ---
    {
        name: 'Pumpkin',
        growthCost: { water: 1, light: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            if (neighbors.some(t => t?.type === 'plant' && t.data.name === 'Mushroom')) {
                playerState.resources.compost += 3;
            } else {
                playerState.resources.compost += 1;
            }
            playerState.score += 1;
        },
        description: 'Thrives with fungi.',
        effect: '+1 compost (+3 if next to Mushroom) and +1 point',
    },
    {
        name: 'BeanPlant',
        growthCost: { water: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const grownNeighbors = neighbors.filter(t =>
                t?.type === 'plant' && t.grown
            ).length;
            playerState.resources.compost += grownNeighbors;
            if (grownNeighbors > 0) playerState.score += 1;
        },
        description: 'Improves soil around mature plants.',
        effect: '+1 compost per grown neighbor, +1 point if any grown neighbor',
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
            players[id].garden[0]![0] = {
                id: generateId(),
                type: 'plant',
                data: plantLibrary[0] as PlantData,
                grown: false,
            };

            players[id].garden[1]![0] = {
                id: generateId(),
                type: 'pest',
                data: pestLibrary[0] as PestData,
            };
        }

        this.state = {
            players,
            deck: this.generateDeck(playerIds.length),
            draftZone: [],
            currentTurn: 1,
            currentPlayer: playerIds[0] as PlayerId,
            log: [],
            winner: null,
        };

        this.fillDraftZone();
    }

    private drawCard(): DraftCard | null {
        return this.state.deck.pop() || null;
    }


    private fillDraftZone() {
        while (this.state.draftZone.length < this.settings.DRAFT_SIZE && this.state.deck.length > 0) {
            const card = this.drawCard();
            if (card) {
                this.state.draftZone.push(card);
            }
        }
    }

    // Init action
    private generateDeck(playerCount: number): DraftCard[] {
        const deck: DraftCard[] = [];

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

        for (let i = 0; i < 8 * playerCount; i++) {
            for (const pestData of pestLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'pest',
                    data: pestData,
                });
            }
        }

        for (let i = 0; i < 4 * playerCount; i++) {
            for (const actionData of actionCardLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'action',
                    data: actionData,
                });
            }
        }

        return this.shuffle(deck);
    }

    // Player action
    growPlant({ playerId, x, y }: { playerId: PlayerId, x: number, y: number }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId] as PlayerState;
        if (!playerState || playerState.turnState === 'DONE') throw new Error('Player is done playing');
        if (playerState.turnState !== 'GROW') throw new Error('Incorrect turn state');

        // Rest of the existing logic...
        const tile = playerState.garden[y]![x];
        if (!tile || !this.isPlantTile(tile) || tile.grown) throw new Error('Invalid tile to grow');

        const resourcesNeeded = tile.data.growthCost;
        if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) throw new Error('Invalid tile to grow (no growth cost)');

        const cost = tile.data.growthCost;
        if (!this.hasResources(playerId, cost)) throw new Error('Not enough resources');

        this.spendResources(playerId, cost);
        tile.grown = true;

        const neighbors = this.getNeighbors(playerState.garden, x, y);
        tile.data.growEffect(neighbors, playerState);

        this.log(`${playerId} grew ${tile.data.name} at (${x}, ${y})`);
        this.nextTurnPhase(playerId);
    }

    placePlantTile({ playerId, tileIndex, x, y }: { playerId: PlayerId, tileIndex: number, x: number, y: number }) {
        const playerState = this.state.players[playerId]!;
        const card = this.state.draftZone[tileIndex] as PlantTile;

        if (!this.inBounds(x, y)) throw new Error('Out of bounds');
        if (playerState.garden[y]![x]) throw new Error('Tile already exists at this position');

        playerState.garden[y]![x] = card;
        playerState.score += card.data.basePoints;

        this.state.draftZone.splice(tileIndex, 1);
        this.log(`${playerId} placed ${card.data.name} at (${x}, ${y})`);
        this.nextTurnPhase(playerId);
    }

    placePestOnPlayer({ playerId, cardIndex, x, y, targetPlayerId }: { playerId: PlayerId, cardIndex: number, x: number, y: number, targetPlayerId: PlayerId }) {
        const targetPlayer = this.state.players[targetPlayerId];
        if (!targetPlayer) throw new Error('Invalid target player');
        if (targetPlayer === this.state.players[playerId]) throw new Error('Cannot place pest on self');

        const card = this.state.draftZone[cardIndex] as PestTile;

        if (!this.inBounds(x, y)) throw new Error('Out of bounds');

        const existing = targetPlayer.garden[y]![x];
        if (existing?.type === 'pest') throw new Error('Cannot place pest on another pest');

        // Apply pest damage
        if (existing?.type === 'plant') {
            targetPlayer.score -= card.data.damage;
            this.log(`${playerId} placed ${card.data.name} on ${targetPlayerId}'s ${existing.data.name}, causing ${card.data.damage} damage`);
        }

        // Place pest and apply spread effects
        targetPlayer.garden[y]![x] = card;
        if (card.data.spreadEffect) {
            const neighbors = this.getNeighbors(targetPlayer.garden, x, y);
            card.data.spreadEffect(neighbors, targetPlayer);
        }

        this.checkInfestation(targetPlayerId, x, y);
        this.state.draftZone.splice(cardIndex, 1);
        this.nextTurnPhase(playerId);
    }

    playActionCard({ playerId, cardIndex, x, y }: { playerId: PlayerId, cardIndex: number, x: number, y: number }) {
        const playerState = this.state.players[playerId]!;
        const card = this.state.draftZone[cardIndex] as ActionCard;

        // Check if player can afford the card
        if (!this.hasResources(playerId, card.data.resourceCost)) {
            throw new Error('Not enough resources to play this card');
        }

        const targetTile = playerState.garden[y]![x];
        if (!targetTile) throw new Error('Invalid target tile');

        // Pay the cost and apply the effect immediately
        this.spendResources(playerId, card.data.resourceCost);
        card.data.immediateEffect(playerState, this.state, targetTile, this.getNeighbors(playerState.garden, x, y));

        // Remove card from draft zone
        this.state.draftZone.splice(cardIndex, 1);

        this.log(`${playerId} played action card: ${card.data.name}`);
        this.nextTurnPhase(playerId);
    }

    // placePestTile({ playerId, x, y, tile }: { playerId: PlayerId, x: number, y: number, tile: PestTile }) {
    //     if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
    //     const playerState = this.state.players[playerId];
    //     if (!playerState || playerState.turnState === 'DONE') throw new Error('Player is done playing');
    //     if (!playerState || playerState.turnState !== 'PEST') throw new Error('Cannot place pest this turn');

    //     if (!this.inBounds(x, y)) throw new Error('Out of bounds');

    //     const existing = playerState.garden[y]![x];

    //     if (existing?.type === 'pest') {
    //         this.log(`${playerId}: Cannot place pest on ${existing.type} at (${x}, ${y})`);
    //         throw new Error('Cannot place pest on other pests');
    //     }

    //     // If placing on a plant, reduce score by plant's base points
    //     if (existing) {
    //         playerState.score -= existing.data.basePoints;
    //         this.log(`${playerId}: Pest destroyed ${existing.data.name} at (${x}, ${y}), lost ${existing.data.basePoints} points`);
    //     } else {
    //         this.log(`${playerId}: Placed pest at empty space (${x}, ${y})`);
    //     }

    //     // Place pest and check for infestation
    //     playerState.garden[y]![x] = tile;
    //     this.checkInfestation(playerId, x, y);
    //     // Decrease pest count
    //     playerState.pestToPlace--;
    //     this.nextTurnPhase(playerId);
    // }

    // Player action
    skipGrowPhase({ playerId }: { playerId: PlayerId }) {
        if (playerId !== this.state.currentPlayer) throw new Error('Not your turn');
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'GROW') throw new Error('Cannot skip grow phase this turn');

        this.nextTurnPhase(playerId);
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

        const advanceOrFinish = () => {
            if (this.isPlayerDonePlaying(playerId)) {
                playerState.turnState = 'DONE';
                this.log(`${playerId} is done playing!`);
            } else {
                playerState.turnState = 'PLACE';
            }
        }
        // If player is already done, don't change their state
        if (playerState.turnState === 'DONE') return;
        if (playerState.turnState === 'PLACE') playerState.turnState = 'GROW';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace > 0) playerState.turnState = 'PEST';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'PEST' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'END') advanceOrFinish()
    }

    // Game action
    private checkInfestation(playerId: PlayerId, x: number, y: number) {
        const playerState = this.state.players[playerId];
        if (!playerState) return;

        const neighbors = this.getNeighbors(playerState.garden, x, y);
        const pestNeighbors = neighbors.filter(t => t?.type === 'pest').length;
        if (pestNeighbors >= 1) {
            playerState.infestation += 1;
            this.log(`${playerId} infestation increased to ${playerState.infestation}`);
        }
    }

    private getNeighbors(garden: Garden, x: number, y: number): (Tile | null)[] {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        //@ts-ignore
        return dirs.map(([dx, dy]) => this.inBounds(x + dx, y + dy) ? garden[y + dy][x + dx] : null);
    }

    nextTurn({ playerId }: { playerId: PlayerId }) {
        if (playerId !== this.state.currentPlayer || this.state.players[playerId]!.turnState !== 'END') {
            throw new Error('Not your turn or wrong turn state');
        }

        // First, handle the current player's end-of-turn effects
        this.nextTurnPhase(playerId); // This will set them to DONE if appropriate
        this.gainRandomResource(playerId);

        // Find next active player
        const nextPlayer = this.findNextActivePlayer();

        if (!nextPlayer) {
            // All players are done
            this.log(`Game over! Winner: ${this.getWinner()}`);
            this.state.winner = this.getWinner();
            return;
        }

        // Update turn counters
        const playerIds = Object.keys(this.state.players);
        const currentIndex = playerIds.indexOf(playerId);
        const nextIndex = playerIds.indexOf(nextPlayer);

        // Only increment turn counter when we complete a full round
        if (nextIndex <= currentIndex) {
            this.state.currentTurn++;
        }

        this.state.currentPlayer = nextPlayer;

        this.fillDraftZone();
    }

    //New helper method to find the next active player
    private findNextActivePlayer(): PlayerId | null {
        const playerIds = Object.keys(this.state.players);
        const currentIndex = playerIds.indexOf(this.state.currentPlayer);

        // Check each player starting from the next one
        for (let i = 1; i <= playerIds.length; i++) {
            const nextIndex = (currentIndex + i) % playerIds.length;
            const nextPlayerId = playerIds[nextIndex] as PlayerId;
            const nextPlayerState = this.state.players[nextPlayerId];

            if (nextPlayerState && nextPlayerState.turnState !== 'DONE') {
                return nextPlayerId;
            }
        }

        // All players are done
        return null;
    }

    isGameOver(): boolean {
        return Object.values(this.state.players).every(player => player.turnState === 'DONE');
    }

    isPlayerDonePlaying(playerId: PlayerId): boolean {
        const playerState = this.state.players[playerId];
        if (!playerState) return false;
        // game ends if the player have a full garden or they hit the max infestation
        return playerState.garden.every(row => row.every(cell => cell !== null)) || playerState.infestation >= this.settings.MAX_INFESTATIONS;
    }


    getWinner(): PlayerId | null {
        const activePlayers = Object.entries(this.state.players)
            .filter(([_, player]) => player.turnState === 'DONE');

        if (activePlayers.length === 0) return null;

        let highestScore = -1;
        let winners: PlayerId[] = [];

        // Find highest score
        for (const [playerId, player] of activePlayers) {
            if (player.score > highestScore) {
                highestScore = player.score;
                winners = [playerId];
            } else if (player.score === highestScore) {
                winners.push(playerId);
            }
        }

        // Tiebreaker: player with fewer infestations wins
        if (winners.length > 1) {
            let lowestInfestation = Infinity;
            let finalWinner = winners[0] as PlayerId;

            for (const playerId of winners) {
                const player = this.state.players[playerId]!;
                if (player.infestation < lowestInfestation) {
                    lowestInfestation = player.infestation;
                    finalWinner = playerId;
                }
            }

            return finalWinner
        }

        return winners[0] || null;
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
