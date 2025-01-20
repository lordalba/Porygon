<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center py-10">
    <div class="bg-white shadow-md rounded-lg p-8 w-full max-w-7xl">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Profiles</h1>

      <!-- Filter Out-of-Sync -->
      <div class="mb-6 flex justify-between items-center">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search profiles..."
          class="flex-1 border border-gray-300 rounded-lg p-3"
        />
        <button
          @click="toggleOutOfSyncFilter"
          class="bg-blue-500 text-white px-6 py-3 rounded ml-6"
        >
          {{ showOutOfSyncOnly ? "Show All Services" : "Show Out of Sync" }}
        </button>
      </div>

      <!-- Profiles Grid -->
      <div v-if="loading" class="text-center py-10">
        <span class="text-gray-500 text-lg">Loading profiles...</span>
      </div>
      <div
        v-else
        :class="
          filteredProfiles.length === 1 ? 'grid-cols-1' : 'lg:grid-cols-2'
        "
        class="grid gap-8"
      >
        <ProfileCard
          v-for="(profile, index) in filteredProfiles"
          :key="index"
          :profile="profile"
          :show-out-of-sync="showOutOfSyncOnly"
          @sync-all="syncAllServices"
          @sync-service="syncService"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import ProfileCard from "../components/profileList/ProfileCard.vue";

export default defineComponent({
  components: { ProfileCard },
  setup() {
    const toast = useToast();
    const profiles = ref([]);
    const loading = ref(true);
    const searchQuery = ref("");
    const showOutOfSyncOnly = ref(false);

    let websocket;

    // Fetch profiles from the backend
    const fetchProfiles = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/profiles");
        if (response.ok) {
          profiles.value = await response.json();
        } else {
          toast.error("Failed to fetch profiles.");
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Error fetching profiles.");
      } finally {
        loading.value = false;
      }
    };

    // Toggle Out-of-Sync Filter
    const toggleOutOfSyncFilter = () => {
      showOutOfSyncOnly.value = !showOutOfSyncOnly.value;
    };

    // Filtered Profiles
    const filteredProfiles = computed(() => {
      let result = profiles.value;

      if (searchQuery.value) {
        result = result.filter((profile) =>
          profile.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
      }

      if (showOutOfSyncOnly.value) {
        result = result
          .map((profile) => ({
            ...profile,
            services: profile.services.filter(
              (service) => service.status === "Out of Sync"
            ),
          }))
          .filter((profile) => profile.services.length > 0);
      }

      return result;
    });

    // Handle service synchronization
    const syncService = async (profile, service) => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/services/sync",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              namespace: profile.namespace,
              serviceName: service.name,
              desiredVersion: service.desiredVersion,
              desiredPodCount: service.desiredPodCount,
              saToken: profile.saToken,
              clusterUrl: profile.clusterUrl,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(
            `Failed to sync service: ${errorData.error || "Unknown error"}`
          );
        }
      } catch (error) {
        toast.error("An error occurred while syncing the service.");
      }
    };

    const syncAllServices = (profileName) => {
      console.log(`Syncing all services in profile ${profileName}`);
    };

    // WebSocket setup
    const setupWebSocket = () => {
      websocket = new WebSocket("ws://localhost:3000");

      websocket.onopen = () => console.log("WebSocket connected.");
      websocket.onclose = () => console.log("WebSocket disconnected.");
      websocket.onerror = (error) => console.error("WebSocket error:", error);

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // if (data.eventType === "SERVICE_UPDATED") {
          //   const { namespace, services } = data.data;
          //   console.log(
          //     `Received update for namespace: ${namespace}`,
          //     services
          //   );

          //   const profile = profiles.value.find(
          //     (p) => p.namespace === namespace
          //   );
          //   if (profile) {
          //     profile.services = services.map((service) => ({
          //       ...service,
          //       status:
          //         service.actualVersion === service.desiredVersion &&
          //         service.actualPodCount === service.desiredPodCount
          //           ? "In Sync"
          //           : "Out of Sync",
          //     }));
          //   }
          // }
          if (data.eventType === "SERVICE_UPDATED") {
            const { namespace, services } = data.data;

            const profile = profiles.value.find(
              (p) => p.namespace === namespace
            );

            if (profile) {
              profile.services = profile.services.map((service) => {
                const updatedService = services.find(
                  (s) => s.name === service.name
                );
                if (updatedService) {
                  return {
                    ...service,
                    actualVersion: updatedService.version,
                    actualPodCount: updatedService.podCount,
                    status:
                      updatedService.version === service.desiredVersion &&
                      updatedService.podCount === service.desiredPodCount
                        ? "In Sync"
                        : "Out of Sync",
                  };
                }
                return service;
              });
            }
          }
          else if (data.eventType === "SERVICE_SYNCED") {
              const { namespace, serviceName, actualVersion, actualPodCount } =
                data.data;
              const profile = profiles.value.find(
                (p) => p.namespace === namespace
              );
              if (profile) {
                const service = profile.services.find(
                  (s) => s.name === serviceName
                );
                if (service) {
                  service.status = "In Sync";
                  service.actualVersion = actualVersion;
                  service.actualPodCount = actualPodCount;
                }
              }
            }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };
    };

    // Fetch profiles and setup WebSocket on mount
    onMounted(async () => {
      await fetchProfiles();
      setupWebSocket();
    });

    return {
      profiles,
      loading,
      searchQuery,
      showOutOfSyncOnly,
      toggleOutOfSyncFilter,
      filteredProfiles,
      syncService,
      syncAllServices,
    };
  },
});
</script>
