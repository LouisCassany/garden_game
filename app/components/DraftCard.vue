<template>
    <div
        class="shadow-md rounded-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 size-36 aspect-square">
        <!-- Background image -->
        <img alt="" :src="`/${card.data.name}.jpeg`" class="absolute inset-0 w-full h-full object-cover" />

        <div class="relative z-0 flex flex-col justify-between h-full backdrop-blur-[3px] text-white p-1 rounded-md">
            <div class="flex w-full justify-between font-bold">
                <span>{{ card.data.name }}</span>
                <span v-if="card.type == 'plant'">⭐️{{ card.data.basePoints }}</span>
            </div>
            <div v-if="card.data.effect" class="text-center bg-black/50 rounded-md text-xs">{{ card.data.effect }}</div>
            <div class="flex flex-col gap-1" v-if="card.type == 'plant'">
                <p class="flex justify-between">
                    <span>💧{{ card.data.growthCost.water ?? 0 }}</span>
                    <span>☀️{{ card.data.growthCost.light ?? 0 }}</span>
                    <span>🌾{{ card.data.growthCost.compost ?? 0 }}</span>
                </p>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type DraftCard } from "../engine";

defineProps<{
    card: DraftCard
}>()

</script>