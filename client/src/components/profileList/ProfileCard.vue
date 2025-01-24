<template>
  <div
    class="bg-gray-50 shadow-md rounded-lg p-6 border transition-transform transform hover:scale-105"
  >
    <!-- Profile Summary -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-xl font-bold">{{ profile.name }}</h2>
        <p class="text-gray-600 text-sm">Namespace: {{ profile.namespace }}</p>
        <p class="text-gray-500 text-sm">
          Total Services: {{ profile.services.length }}
        </p>
      </div>

      <div>
        <button @click="toggleDetails" class="text-blue-500 underline text-sm">
          {{ showDetails ? "Hide Details" : "View Details" }}
        </button>
      </div>
    </div>

    <!-- Synchronization Summary -->
    <div class="mt-4">
      <p v-if="outOfSyncCount > 0" class="text-red-500 text-sm">
        {{ outOfSyncCount }} service(s) are out of sync.
      </p>
      <p v-else class="text-green-500 text-sm">All services are in sync.</p>
    </div>

    <!-- Service Table -->
    <ServiceTable
      v-if="showDetails"
      :services="profile.services"
      @sync-service="$emit('sync-service', profile, $event)"
    />

    <!-- Profile Actions -->
    <div class="mt-4 flex justify-between items-center">
      <button
        @click="$emit('sync-all', profile.name)"
        class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
      >
        Sync All
      </button>
      <!-- Edit Profile Button -->
      <router-link
        :to="`/profiles/update/${profile.id}`"
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
      >
        Edit Profile
      </router-link>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import ServiceTable from "./ServiceTable.vue";

export default {
  components: { ServiceTable },
  props: {
    profile: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const showDetails = ref(false);

    const toggleDetails = () => {
      showDetails.value = !showDetails.value;
    };

    const outOfSyncCount = computed(() => {
      return props.profile.services.filter(
        (service) => service.status === "Out of Sync"
      ).length;
    });

    return { showDetails, toggleDetails, outOfSyncCount };
  },

  methods: {
  },
};
</script>
