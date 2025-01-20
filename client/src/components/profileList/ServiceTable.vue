<template>
  <div class="mt-4 overflow-x-auto">
    <div class="mb-4">
      <label class="inline-flex items-center">
        <input
          type="checkbox"
          v-model="groupByTestGroup"
          class="form-checkbox h-5 w-5 text-blue-600"
        />
        <span class="ml-2 text-gray-800 font-medium">Group by Test Group</span>
      </label>
    </div>

    <table class="w-full border-collapse">
      <thead class="bg-gray-200">
        <tr>
          <th class="border border-gray-300 p-2 text-left">Service Name</th>
          <th class="border border-gray-300 p-2 text-left">Desired Version</th>
          <th class="border border-gray-300 p-2 text-left">Actual Version</th>
          <th class="border border-gray-300 p-2 text-left">Desired Pods</th>
          <th class="border border-gray-300 p-2 text-left">Actual Pods</th>
          <th class="border border-gray-300 p-2 text-left">Status</th>
          <th class="border border-gray-300 p-2 text-left">
            <div class="flex items-center">
              Readiness
            </div>
          </th>
          <th class="border border-gray-300 p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="groupByTestGroup">
          <template
            v-for="(group, groupId) in groupedServices"
            :key="groupId"
          >
            <tr>
              <td
                colspan="8"
                class="bg-gray-100 text-gray-700 font-bold border border-gray-300 p-2"
              >
                Testing reason: {{ group[0]?.note || "No Note Provided" }}
              </td>
            </tr>
            <tr
              v-for="service in group"
              :key="service.name"
              class="hover:bg-gray-50"
            >
              <td class="border border-gray-300 p-2">{{ service.name }}</td>
              <td class="border border-gray-300 p-2">
                {{ service.desiredVersion }}
              </td>
              <td class="border border-gray-300 p-2">
                {{ service.actualVersion }}
              </td>
              <td class="border border-gray-300 p-2">
                {{ service.desiredPodCount }}
              </td>
              <td class="border border-gray-300 p-2">
                {{ service.actualPodCount }}
              </td>
              <td class="border border-gray-300 p-2">
                <span
                  :class="getStatusClass(service)"
                  class="inline-block px-2 py-1 rounded text-xs"
                >
                  {{ service.status }}
                  <span
                    v-if="service.underTest"
                    class="italic"
                  >(Under Test)</span>
                </span>
              </td>
              <td class="border border-gray-300 p-2">
                shawarma
              </td>
              <td class="border border-gray-300 p-2 flex gap-2">
                <button
                  :disabled="isSyncUnneeded(service)"
                  @click="$emit('sync-service', service)"
                  class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                  :class="{ 'opacity-50 cursor-not-allowed': service.underTest }"
                >
                  Sync
                </button>
              </td>
            </tr>
          </template>
        </template>
        <template v-else>
          <tr v-for="service in services" :key="service.name">
            <td class="border border-gray-300 p-2">{{ service.name }}</td>
            <td class="border border-gray-300 p-2">
              {{ service.desiredVersion }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.actualVersion }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.desiredPodCount }}
            </td>
            <td class="border border-gray-300 p-2">
              {{ service.actualPodCount }}
            </td>
            <td class="border border-gray-300 p-2">
              <span
                :class="getStatusClass(service)"
                class="inline-block px-2 py-1 rounded text-xs"
              >
                {{ service.status }}
                <span
                  v-if="service.underTest"
                  class="italic"
                >(Under Test)</span>
              </span>
            </td>
            <td class="border border-gray-300 p-2">
              <span
                class="inline-block px-2 py-1 rounded text-xs bg-green-200 text-green-800"
              >
                Ready
              </span>
            </td>
            <td class="border border-gray-300 p-2 flex gap-2">
              <button
                :disabled="isSyncUnneeded(service)"
                @click="$emit('sync-service', service)"
                class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                :class="{ 'opacity-50 cursor-not-allowed': service.underTest }"
              >
                Sync
              </button>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from "vue";

export default defineComponent({
  props: {
    services: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const groupByTestGroup = ref(false);

    // Group services by testGroupId, excluding services not under test
    const groupedServices = computed(() => {
      if (!groupByTestGroup.value) {
        return { ungrouped: props.services }; // No grouping, return all as ungrouped
      }

      return props.services.reduce((groups, service) => {
        if (service.underTest && service.testGroupId) {
          const groupId = service.testGroupId;
          if (!groups[groupId]) groups[groupId] = [];
          groups[groupId].push(service);
        }
        return groups; // Only include services under test
      }, {});
    });

    const getStatusClass = (service) => {
      if (service.underTest) return "bg-yellow-100 text-yellow-700";
      if (service.status === "In Sync") return "bg-green-200 text-green-800";
      if (service.status === "Out of Sync") return "bg-red-200 text-red-800";
      return "bg-yellow-200 text-yellow-800";
    };

    const isSyncUnneeded = (service) => {
      return service.status.trim() === "In Sync" || service.underTest;
    };

    return {
      groupByTestGroup,
      groupedServices,
      getStatusClass,
      isSyncUnneeded,
    };
  },
});
</script>
