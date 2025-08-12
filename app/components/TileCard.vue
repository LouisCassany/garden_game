<template>
    <div v-if="tile.type === 'plant'"
        class="shadow-md rounded-md flex flex-col justify-between relative overflow-hidden transition-all duration-300"
        :class="{
            'grown-tile': tile.grown,
            'growable-tile': !tile.grown && canBeGrown,
            'ungrowable-tile': !tile.grown && !canBeGrown,
            'size-36': !compact,
            'aspect-square': compact,
        }">
        <!-- Background image -->
        <img alt="" :src="`/${tile.data.name}.jpeg`" class="absolute inset-0 w-full h-full object-cover"
            v-if="!compact" />

        <!-- Non-compact overlay -->
        <div v-if="!compact"
            class="relative z-0 flex flex-col justify-between h-full backdrop-blur-[3px] text-white  p-1 rounded-md">
            <div class="flex w-full justify-between font-bold">
                <span>{{ tile.data.name }}</span>
                <span>⭐️{{ tile.data.basePoints }}</span>
            </div>
            <div v-if="tile.data.effect" class="text-center bg-black/50 rounded-md">{{ tile.data.effect }}</div>
            <div class="flex flex-col gap-1">
                <p class="flex justify-between" v-if="canGrow(tile)">
                    <span>💧{{ tile.data.growthCost.water ?? 0 }}</span>
                    <span>☀️{{ tile.data.growthCost.light ?? 0 }}</span>
                    <span>🌾{{ tile.data.growthCost.compost ?? 0 }}</span>
                </p>
            </div>
        </div>

        <!-- Compact mode just the image + size change -->
        <div v-else class="absolute inset-0 flex items-center justify-center">
            <img alt="" :src="`/${tile.data.name}.jpeg`" class="rounded-md size-full" />
        </div>
    </div>

    <img v-else-if="tile.type === 'pest'" src="/pest.jpeg"
        class="pest-tile size-full rounded-md border border-secondary" />
</template>

<script lang="ts" setup>
import { type Tile, type PlantTile } from "../engine";

defineProps<{
    tile: Tile
    canBeGrown: boolean
    compact?: boolean
}>()

function canGrow(tile: PlantTile) {
    return (
        tile.data.growthCost.water !== undefined ||
        tile.data.growthCost.light !== undefined ||
        tile.data.growthCost.compost !== undefined
    );
}
</script>

<style scoped>
/* Grown tile - vibrant green animated border */
.grown-tile {
    border: 3px solid #22c55e;
}

/* Growable tile - pulsing yellow border */
.growable-tile {
    border: 3px solid #eab308;
    cursor: pointer;
    animation: growable-pulse 1.8s ease-in-out infinite;
}

@keyframes growable-pulse {

    0%,
    100% {
        border-color: #eab308;
        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.5);
    }

    50% {
        border-color: #ca8a04;
        box-shadow: 0 0 0 6px rgba(234, 179, 8, 0);
    }
}

.growable-tile:hover {
    border-color: #f59e0b;
    transform: translateY(-1px);
}

/* Ungrowable tile - subtle static border */
.ungrowable-tile {
    border: 2px solid #6b7280;
    opacity: 0.8;
}

/* Pest tile - aggressive red warning animation */
.pest-tile {
    border: 3px solid #dc2626 !important;
    animation: pest-warning 1.2s ease-in-out infinite;
}

@keyframes pest-warning {

    0%,
    100% {
        border-color: #dc2626;
        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
    }

    50% {
        border-color: #b91c1c;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0);
    }
}

/* Smooth transitions */
.grown-tile,
.growable-tile,
.ungrowable-tile,
.pest-tile {
    transition: all 0.3s ease;
}
</style>