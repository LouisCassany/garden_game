<template>
    <div v-if="tile.type === 'plant'"
        class="shadow-md rounded-md flex flex-col justify-between relative overflow-hidden" :class="{
            'border-3 border-green-400': tile.grown,
            'border-3 border-yellow-400 cursor-pointer': !tile.grown && canBeGrown,
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

    <img src="/pest.jpeg" class="size-full rounded-md border border-secondary" v-else-if="tile.type === 'pest'" />
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