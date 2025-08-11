<template>
  <div class="drawer">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content">
      <div class="flex flex-col w-full gap-2 p-4" v-if="state" data-theme="dark">
        <div class="flex flex-col w-full gap-2">
          <label for="my-drawer">
            <MenuButton class="size-8 cursor-pointer" />
          </label>
          <button class="btn btn-primary" @click="skipGrowPhase" :disabled="turnState !== 'GROW'">Skip grow
            phase</button>
          <button class="btn btn-primary" @click="endturn" :disabled="turnState !== 'END'">End turn</button>
          <div class="w-full text-center uppercase text-lg font-bold font-mono">
            {{ state.currentPlayer === playerId ? 'Current action: ' + turnState : 'Not your turn' }}
          </div>
          <div class="flex flex-col gap-2 border-primary border rounded-md p-2">
            <div class="grid grid-cols-3 w-full">
              <div v-for="(resource, label) in resources" :key="label" class="resource-item">
                <span class="resource-icon">{{ resource.icon }}</span>
                <transition name="number">
                  <span :key="resource.value" class="resource-value">
                    {{ resource.value }}
                  </span>
                </transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Draftzone -->
        <div class="flex flex-col gap-2 w-full p-2">
          <h1 class="text-lg">Draft zone</h1>
          <div class="flex gap-2 w-full  h-full overflow-y-auto pb-2">
            <label v-for="tile in state.draftZone" :key="tile.id"
              class="flex flex-col items-center cursor-pointer gap-2">
              <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile"
                :disabled="turnState !== 'PLACE'" />
              <TileCard :tile="tile" :canBeGrown="false" />
            </label>
          </div>
        </div>

        <!-- Garden -->
        <div class="flex flex-col gap-2 w-full h-full p-2">
          <h1 class="text-lg ">Garden</h1>
          <div class="grid grid-cols-5 gap-2 w-full">
            <template v-for="(tile, index) in flattenGarden(state.players[playerId]!.garden)">
              <TileCard v-if="tile" :tile="tile" :canBeGrown="canBeGrown(tile)" :compact="true"
                @click="openInfoModal(tile, index)" />
              <div
                class="aspect-square justify-center items-center flex border border-secondary rounded-md cursor-pointer text-xl"
                @click="openConfirmationModal(index % 5, Math.floor(index / 5))" v-else>+</div>
            </template>
          </div>
        </div>

        <!-- Info modal -->
        <dialog id="confirmation_modal" class="modal modal-bottom">
          <div class="modal-box">
            <div v-if="modalTile?.type === 'plant'" class=" flex flex-col gap-2 w-full">
              <div class="flex w-full justify-between">
                <h3 class="text-lg font-bold">{{ modalTile?.data.name }}</h3>
                <span>⭐️{{ modalTile?.data.basePoints }}</span>
              </div>
              <div class="flex gap-4 w-full">
                <img :src="`/${modalTile?.data.name}.jpeg`" class="h-24 rounded-md" />
                <div class="flex flex-col gap-1 w-full">
                  <div>
                    {{ modalTile?.data.effect }}
                  </div>
                  <p class="flex justify-between">
                    <span>💧{{ modalTile?.data.growthCost.water ?? 0 }}</span>
                    <span>☀️{{ modalTile?.data.growthCost.light ?? 0 }}</span>
                    <span>🌾{{ modalTile?.data.growthCost.compost ?? 0 }}</span>
                  </p>
                  <div class="flex w-full gap-4 justify-between">
                    <button class="btn btn-sm btn-primary" :disabled="!canBeGrown(modalTile)"
                      @click="growTile(modalTileIndex! % 5, Math.floor(modalTileIndex! / 5))">Grow</button>
                    <button class="btn btn-sm btn-error " v-if="turnState === 'PEST'"
                      @click="placePestTile(modalTileIndex! % 5, Math.floor(modalTileIndex! / 5))">Place pest</button>
                  </div>

                </div>
              </div>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>

        <!-- Confirmation modal -->
        <dialog id="info_modal" class="modal modal-bottom">
          <div class="modal-box">
            <h3 class="text-lg font-bold">{{ turnState === 'PLACE' ? 'Place plant' : 'Place pest' }}</h3>
            <p class="flex w-full justify-around mt-8">
              <button class="btn btn-primary" @click="confirmAction()">Confirm</button>
              <button class="btn btn-error ml-2" onclick="info_modal.close()">Cancel</button>
            </p>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    </div>
    <div class="drawer-side">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="menu bg-base-200 text-white min-h-full w-80 p-4">
        <button class="btn btn-error" @click="resetGame()">Reset game</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { type MultiplayerGameState, type Tile, type Garden, sendCommand, type PlantTile, type PlayerId } from "./engine";

// const socket = new WebSocket('ws://localhost:3000/websocket');
const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<PlantTile | null>(null);
const modalTile = ref<Tile | null>(null);
const modalTileIndex = ref<number | null>(null);

const playerId = useRoute().query.playerId as PlayerId ?? "louis"

onMounted(async () => {
  const res = await fetch("/api/state");
  if (res.ok) {
    const body = await res.json()
    state.value = body.game.state as MultiplayerGameState;
    selectedTile.value = state.value.draftZone[0] as PlantTile;
  }

  setInterval(async () => {
    if (state.value?.currentPlayer === playerId) return;

    const res = await fetch("/api/state");
    if (res.ok) {
      const body = await res.json()
      state.value = body.game.state as MultiplayerGameState;
      selectedTile.value = state.value.draftZone[0] as PlantTile;
    }
  }, 1000);
});

function resetGame() {
  fetch("/api/reset", {
    method: "GET",
  }).then(async (res) => {
    if (res.ok) {
      console.log("Game reset successfully");
      const { game } = await res.json()
      state.value = game.state as MultiplayerGameState;
    } else {
      console.error("Failed to reset game:", res);
    }
  });
}

function flattenGarden(garden: Garden): (Tile | null)[] {
  if (!garden) return [];
  return garden.flat();
}

let confirmAction = () => { }

function openConfirmationModal(x: number, y: number) {
  const dialog = document.getElementById("info_modal") as HTMLDialogElement;
  dialog.showModal();
  console.log("HEY", document.getElementById("info_modal"))
  if (turnState.value === 'PLACE') {
    confirmAction = () => {
      placeTile(x, y)
      dialog.close()
    }
  }
  else if (turnState.value === 'PEST') {
    confirmAction = () => {
      placePestTile(x, y)
      dialog.close()
    }
  }
}

function openInfoModal(plant: Tile, index: number) {
  modalTile.value = plant;
  modalTileIndex.value = index;
  (document.getElementById("confirmation_modal") as HTMLDialogElement).showModal();
}

async function updateUI() {
  const req = await fetch("/api/state");
  if (req.ok) {
    const body = await req.json()
    state.value = body.game.state as MultiplayerGameState;
  }
}

async function placePestTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;

  if (turnState.value === 'PEST') {
    await sendCommand("placePestTile", { playerId, x, y, tile: { type: 'pest' } }).catch((err) => {
      console.error("Error sending command:", err);
    });
    updateUI();
  }
}

async function growTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;
  await sendCommand("growPlant", { playerId, x, y }).catch((err) => {
    console.error("Error sending command:", err);
  })
  updateUI();
}

async function placeTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;

  if (turnState.value === 'PLACE') {
    const tileIndex = state.value.draftZone.indexOf(selectedTile.value)
    await sendCommand("placeTile", { playerId, tileIndex, x, y }).catch((err) => {
      console.error("Error sending command:", err);
    })
    updateUI();
  }
  else if (turnState.value === 'PEST') {
    await sendCommand("placePestTile", { playerId, x, y, tile: { type: 'pest' } }).catch((err) => {
      console.error("Error sending command:", err);
    });
    updateUI();
  }
}

async function endturn() {
  await sendCommand("nextTurn", { playerId }).catch((err) => {
    console.error("Error sending command:", err);
  });
  updateUI()
}

function canBeGrown(tile: Tile): boolean {
  if (!state.value) return false;
  if (turnState.value !== 'GROW') return false;
  if (!tile || tile.type !== 'plant') return false;

  const resourcesNeeded = tile.data.growthCost;
  // If no cost, can't be grown
  if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) return false;
  // if grown, can't be grown
  if (tile.grown) return false;

  //@ts-ignore
  const playerResources = state.value.players[playerId].resources;

  if (resourcesNeeded.water !== undefined && playerResources.water < resourcesNeeded.water) return false;
  if (resourcesNeeded.light !== undefined && playerResources.light < resourcesNeeded.light) return false;
  if (resourcesNeeded.compost !== undefined && playerResources.compost < resourcesNeeded.compost) return false;

  return true;
}


async function skipGrowPhase() {
  await sendCommand("skipGrowPhase", { playerId }).catch((err) => {
    console.error("Error sending command:", err);
  });
  console.log("Tile placed successfully");
  updateUI()
}

const turnState = computed(() => {
  if (!state.value) return null;
  return state.value.players?.[playerId]?.turnState;
});

// Add this computed property
const resources = computed(() => ({
  score: {
    icon: '⭐️',
    value: state.value?.players?.[playerId]?.score
  },
  pest: {
    icon: '🐀',
    value: state.value?.players?.[playerId]?.pestToPlace
  },
  infestation: {
    icon: '💣',
    value: state.value?.players?.[playerId]?.infestation
  },
  water: {
    icon: '💧',
    value: state.value?.players?.[playerId]?.resources.water
  },
  light: {
    icon: '☀️',
    value: state.value?.players?.[playerId]?.resources.light
  },
  compost: {
    icon: '🌾',
    value: state.value?.players?.[playerId]?.resources.compost
  },
}));
</script>

<style scoped>
.resource-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  width: 4rem;
}

.resource-icon {
  font-size: 1.2rem;
}

.resource-value {
  position: absolute;
  left: 2rem;
  min-width: 2rem;
  text-align: left;
  font-weight: 600;
}

.number-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.number-leave-active {
  animation: bounce-out 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }

  50% {
    transform: scale(2.5);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(0.3);
    opacity: 0;
  }
}
</style>