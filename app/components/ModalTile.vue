<template>
    <div class="flex flex-col gap-4">
        <div class="flex justify-between w-full items-center">
            <h3 class="text-xl font-bold text-white">{{ modalTile.data.name }}</h3>
            <div class="flex items-center gap-2 mt-1">
                <span class="text-amber-400" v-if="modalTile?.type === 'plant'">⭐️{{ modalTile.data.basePoints }}</span>
                <span v-if="modalTile.type === 'plant' && modalTile.grown"
                    class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Grown
                </span>
            </div>
        </div>
        <div class="flex gap-4">
            <img :src="`/${modalTile?.data.name}.jpeg`" class="w-20 h-20 rounded-xl object-cover bg-white/10" />
            <div class="flex-1 space-y-3">
                <p class="text-gray-300 text-sm">{{ modalTile.data.effect }}</p>
                <div class="flex gap-3 text-sm" v-if="modalTile.type === 'plant'">
                    <span class="flex items-center gap-1 text-blue-400">
                        💧 {{ modalTile.data.growthCost.water ?? 0 }}
                    </span>
                    <span class="flex items-center gap-1 text-yellow-400">
                        ☀️ {{ modalTile.data.growthCost.light ?? 0 }}
                    </span>
                    <span class="flex items-center gap-1 text-amber-400">
                        🌾 {{ modalTile.data.growthCost.compost ?? 0 }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { DraftCard } from '~/engine';

defineProps<{
    modalTile: DraftCard
}>()
</script>