<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900" v-if="state">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
      <div class="flex items-center justify-between p-4">

        <!-- <button @click="toggleDrawer" class="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <MenuButton class="size-6 text-white" />
        </button> -->

        <!-- Turn Status -->
        <div class="flex-1 mx-4">
          <div class="text-center">
            <div class="text-xs text-emerald-200 uppercase tracking-wide font-medium">
              {{ state?.currentPlayer === playerId ? 'Your Turn' : 'Waiting...' }}
            </div>
            <div class="text-sm text-white font-bold">
              {{ turnState === 'GROW' ? '🌱 Grow Phase' : turnState === 'PLACE' ? '🌿 Plant Phase' : turnState ===
                'PEST' ? '🐀 Pest Phase' : 'End Turn' }}
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="flex gap-2">
          <button v-if="turnState === 'GROW'" @click="skipGrowPhase"
            class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors">
            Skip
          </button>
          <button v-if="turnState === 'END'" @click="endturn"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
            End Turn
          </button>
        </div>
      </div>
    </div>

    <!-- Resources Bar -->
    <div class="px-4 py-3 bg-black/10">
      <div class="grid grid-cols-6 gap-3">
        <div v-for="(resource, label) in resources" :key="label"
          class="flex items-center justify-center gap-1 bg-white/10 rounded-lg py-2 px-1 backdrop-blur-sm">
          <span class="text-lg">{{ resource.icon }}</span>
          <transition name="number" mode="out-in">
            <span :key="resource.value" class="text-white font-bold text-sm">
              {{ resource.value }}
            </span>
          </transition>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-4 space-y-6">
      <!-- Draft Zone -->
      <div v-if="state?.draftZone?.length" class="space-y-3">
        <h2 class="text-white font-semibold text-lg flex items-center gap-2">
          <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
          Draft Zone
        </h2>
        <div class="flex gap-3 overflow-x-auto pb-2 -mx-4 p-4">
          <label v-for="tile in state.draftZone" :key="tile.id"
            class="flex flex-col items-center cursor-pointer gap-2 flex-shrink-0 p-2 rounded-lg transition-all"
            :class="{ 'ring-2 ring-emerald-400 bg-emerald-400/10': selectedTile?.id === tile.id }">
            <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile"
              :disabled="turnState !== 'PLACE'" />
            <TileCard :tile="tile" :canBeGrown="false" />
          </label>
        </div>
      </div>

      <!-- Garden -->
      <div class="space-y-3">
        <h2 class="text-white font-semibold text-lg flex items-center gap-2">
          <span class="w-2 h-2 bg-green-400 rounded-full"></span>
          Your Garden
        </h2>
        <div class="grid grid-cols-5 gap-2">
          <template v-for="(tile, index) in flattenGarden(state.players[playerId]!.garden)">
            <TileCard v-if="tile" :tile="tile" :canBeGrown="canBeGrown(tile)" :compact="true"
              @click="openInfoModal(tile, index)" class="cursor-pointer hover:scale-105 transition-transform" />
            <button
              class="aspect-square flex items-center justify-center bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/30 rounded-xl transition-all active:scale-95"
              @click="openConfirmationModal(index % 5, Math.floor(index / 5))" v-else>
              <span class="text-2xl text-white/60">+</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Plant Info Modal -->
    <dialog ref="confirmationModal" class="modal modal-bottom">
      <div class="modal-box bg-slate-900 border border-white/20">
        <div v-if="modalTile?.type === 'plant'" class="space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-xl font-bold text-white">{{ modalTile?.data.name }}</h3>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-amber-400">⭐️{{ modalTile?.data.basePoints }}</span>
                <span v-if="modalTile.grown" class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Grown
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <img :src="`/${modalTile?.data.name}.jpeg`" class="w-20 h-20 rounded-xl object-cover bg-white/10" />
            <div class="flex-1 space-y-3">
              <p class="text-gray-300 text-sm">{{ modalTile?.data.effect }}</p>

              <div class="flex gap-3 text-sm">
                <span class="flex items-center gap-1 text-blue-400">
                  💧 {{ modalTile?.data.growthCost.water ?? 0 }}
                </span>
                <span class="flex items-center gap-1 text-yellow-400">
                  ☀️ {{ modalTile?.data.growthCost.light ?? 0 }}
                </span>
                <span class="flex items-center gap-1 text-amber-400">
                  🌾 {{ modalTile?.data.growthCost.compost ?? 0 }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              class="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              :disabled="!canBeGrown(modalTile)"
              @click="growTile(modalTileIndex! % 5, Math.floor(modalTileIndex! / 5))">
              🌱 Grow Plant
            </button>
            <button v-if="turnState === 'PEST'"
              class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              @click="placePestTile(modalTileIndex! % 5, Math.floor(modalTileIndex! / 5))">
              🐀 Place Pest
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Confirmation Modal -->
    <dialog ref="infoModal" class="modal modal-bottom">
      <div class="modal-box bg-slate-900 border border-white/20">
        <h3 class="text-xl font-bold text-white mb-6">
          {{ turnState === 'PLACE' ? '🌿 Place Plant' : '🐀 Place Pest' }}
        </h3>
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            @click="confirmAction()">
            Confirm
          </button>
          <button class="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            @click="closeInfoModal()">
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Side Drawer -->
    <!-- <div v-if="drawerOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/50" @click="toggleDrawer"></div>
      <div class="absolute left-0 top-0 bottom-0 w-80 bg-slate-900 border-r border-white/20 p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white">Game Menu</h2>
          <button @click="toggleDrawer" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <span class="text-white text-xl">×</span>
          </button>
        </div>
        <button class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          @click="resetGame()">
          🔄 Reset Game
        </button>
      </div>
    </div> -->
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { type MultiplayerGameState, type Tile, type Garden, sendCommand, type PlantTile, type PlayerId } from "./engine";

const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<PlantTile | null>(null);
const modalTile = ref<Tile | null>(null);
const modalTileIndex = ref<number | null>(null);
const drawerOpen = ref(false);
const confirmationModal = ref<HTMLDialogElement | null>(null);
const infoModal = ref<HTMLDialogElement | null>(null);

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

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value;
}

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
  toggleDrawer();
}

function flattenGarden(garden: Garden): (Tile | null)[] {
  if (!garden) return [];
  return garden.flat();
}

let confirmAction = () => { }

function openConfirmationModal(x: number, y: number) {
  if (turnState.value === 'PLACE') {
    confirmAction = () => {
      placeTile(x, y)
      closeInfoModal()
    }
  }
  else if (turnState.value === 'PEST') {
    confirmAction = () => {
      placePestTile(x, y)
      closeInfoModal()
    }
  }
  infoModal.value?.showModal();
}

function closeInfoModal() {
  infoModal.value?.close();
}

function openInfoModal(plant: Tile, index: number) {
  modalTile.value = plant;
  modalTileIndex.value = index;
  confirmationModal.value?.showModal();
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
  confirmationModal.value?.close();
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
  if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) return false;
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
  updateUI()
}

const turnState = computed(() => {
  if (!state.value) return null;
  return state.value.players?.[playerId]?.turnState;
});

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
.number-enter-active {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.number-leave-active {
  animation: bounce-out 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }

  50% {
    transform: scale(1.2);
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

/* Hide scrollbar but keep functionality */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}

.overflow-x-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>