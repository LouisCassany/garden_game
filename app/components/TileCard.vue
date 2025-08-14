<template>
    <div
        class="shadow-md rounded-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 aspect-square">
        <!-- Background image -->
        <div class="absolute inset-0 flex items-center justify-center">
            <img alt="" :src="`/${card.data.name}.jpeg`" class="rounded-md size-full" />
        </div>
        <div class="relative z-0 flex flex-col justify-between h-full text-white p-1 rounded-md">
            {{ card.data.name }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type DraftCard } from "../engine";

defineProps<{
    card: DraftCard
}>()

</script>