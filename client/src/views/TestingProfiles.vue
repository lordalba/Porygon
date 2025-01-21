<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto max-w-7xl px-4">
      <!-- Header Section -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Testing Profiles</h1>
          <p class="mt-2 text-gray-600">Manage and control your Kubernetes testing environments</p>
        </div>
        <div class="flex gap-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search profiles..."
              class="w-64 rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none"
            />
            <span class="absolute left-3 top-2.5 text-gray-400">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
          </div>
          <select
            v-model="filterStatus"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Namespaces</option>
            <option value="active">Active Testing</option>
            <option value="inactive">No Active Tests</option>
          </select>
        </div>
      </div>

      <!-- Profiles Grid -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md"
        >
          <!-- Profile Header -->
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-semibold text-gray-900">{{ profile.name }}</h2>
                <span
                  v-if="hasActiveTests(profile)"
                  class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                >
                  Active Tests
                </span>
              </div>
              <div class="mt-1 flex items-center gap-4">
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Namespace:</span> {{ profile.namespace }}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="openExpandedModal(profile)"
                class="rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
              Preview
              </button>
              <button
                @click="toggleExpand(profile.id)"
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                :class="{ 'rotate-180': expandedProfiles[profile.id] }"
              >
                ↓
              </button>
            </div>
          </div>

          <!-- Services Summary (when collapsed) -->
          <div v-if="!expandedProfiles[profile.id]" class="mt-4">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="service in profile.services.slice(0, 3)"
                :key="service.name"
                class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
              >
                {{ service.name }}
              </span>
              <span
                v-if="profile.services.length > 3"
                class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500"
              >
                +{{ profile.services.length - 3 }} more
              </span>
            </div>
          </div>

          <!-- Expanded Content -->
          <div
            v-if="expandedProfiles[profile.id]"
            class="mt-6 space-y-4"
          >
            <!-- Testing Profiles Section -->
            <div v-if="profile.testingProfiles.length > 0">
  <h3 class="mb-3 text-lg font-medium text-gray-900">Testing Profiles</h3>
  <div class="space-y-5">
    <!-- Testing Profile Card -->
    <div 
  v-for="testProfile in profile.testingProfiles"
  :key="testProfile.id"
  class="relative rounded-lg border border-gray-200 p-4 bg-white shadow-sm transition-all duration-200"
  :class="{
    'bg-blue-50/40 border-blue-200': testProfile.isActive,
    'hover:shadow-md': !testProfile.isActive
  }"
>
  <!-- Activated Indicator -->
  <div 
    v-if="testProfile.isActive" 
    class="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-blue-500"
  ></div>

  <!-- Header: Profile Name and Buttons -->
  <div class="flex items-center justify-between">
    <h4 class="font-medium text-gray-900">{{ testProfile.name }}</h4>
    <div class="flex items-center gap-2">
      <button
        @click="activateTestingProfile(profile, testProfile)"
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="testProfile.isActive ? 
          'bg-gray-100 text-gray-600 hover:bg-gray-200' : 
          'bg-blue-50 text-blue-600 hover:bg-blue-100'"
      >
        {{ testProfile.isActive ? 'Deactivate' : 'Activate' }}
      </button>
      <button
        @click="deleteTestingProfile(profile, testProfile)"
        class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  </div>

  <!-- Service List -->
  <div class="mt-4 space-y-2">
    <div 
      v-for="service in testProfile.services"
      :key="service.name"
      class="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm shadow-sm"
      :class="{'border border-blue-100': testProfile.isActive}"
    >
      <span class="font-medium text-gray-700">{{ service.name }}</span>
      <span class="text-gray-500">v{{ service.desiredVersion }}</span>
    </div>
  </div>
</div>

  </div>
</div>


            <!-- Create New Profile Button -->
            <button
              @click="openCreateModal(profile)"
              class="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + Create New Testing Profile
            </button>
          </div>
        </div>
      </div>

      <!-- Create Testing Profile Modal -->
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="closeCreateModal"
      >
        <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">Create Testing Profile</h2>
            <button
              @click="closeCreateModal"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form @submit.prevent="createTestingProfile(profile)" class="space-y-6">
            <!-- Profile Name -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Profile Name
              </label>
              <input
                v-model="newTestingProfile.name"
                type="text"
                required
                class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter a descriptive name for this testing profile"
              />
            </div>

            <!-- Services Selection -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Services</label>
                <button
                  type="button"
                  @click="addService"
                  class="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add Service
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(service, index) in newTestingProfile.services"
                  :key="index"
                  class="flex items-center gap-3"
                >
                  <select
                    v-model="service.name"
                    required
                    class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option disabled value="">Select a service</option>
                    <option
                      v-for="availableService in modalProfile.services"
                      :key="availableService.name"
                      :value="availableService.name"
                    >
                      {{ availableService.name }}
                    </option>
                  </select>

                  <input
                    v-model="service.desiredVersion"
                    type="text"
                    required
                    placeholder="Version"
                    class="w-32 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    @click="removeService(index)"
                    class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="closeCreateModal"
                class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Expanded Profile Modal -->
      <ExpandedProfileCard
        v-if="selectedProfile"
        :show="!!selectedProfile"
        :profile="selectedProfile"
        @close="selectedProfile = null"
        @activate="activateTestingProfile"
        @delete="deleteTestingProfile"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import ExpandedProfileCard from "../components/ExpandedProfileCard.vue";

export default {
  name: "TestingProfiles",
  components: { ExpandedProfileCard },
  setup() {
    const toast = useToast();
    const profiles = ref([]);
    const expandedProfiles = reactive({});
    const selectedProfile = ref(null);
    const showCreateModal = ref(false);
    const modalProfile = ref(null);
    const searchQuery = ref("");
    const filterStatus = ref("all");
    const newTestingProfile = reactive({ name: "", services: [] });

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
      }
    };

    const filteredProfiles = computed(() => {
      let filtered = profiles.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
          (profile) =>
            profile.name.toLowerCase().includes(query) ||
            profile.namespace.toLowerCase().includes(query)
        );
      }

      if (filterStatus.value !== "all") {
        filtered = filtered.filter((profile) => {
          const hasTests = profile.testingProfiles?.length > 0;
          return filterStatus.value === "active" ? hasTests : !hasTests;
        });
      }

      return filtered;
    });

    const hasActiveTests = (profile) => {
  return profile.testingProfiles.some((testingProfile) => testingProfile.isActive);
};

    const toggleExpand = (profileId) => {
      expandedProfiles[profileId] = !expandedProfiles[profileId];
    };

    const openCreateModal = (profile) => {
      modalProfile.value = profile;
      newTestingProfile.name = '';
      newTestingProfile.services = [];
      showCreateModal.value = true;
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
      modalProfile.value = null;
    };

    const createTestingProfile = async (profile) => {
      if (newTestingProfile.services.length === 0) {
        toast.warning('Please add at least one service');
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/testing-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTestingProfile.name,
            profileId: modalProfile.value.id,
            services: newTestingProfile.services,
          }),
        });

        if (response.ok) {
          const createdProfile = await response.json();
          modalProfile.value.testingProfiles.push(createdProfile);
          closeCreateModal();
          toast.success('Testing profile created successfully');
        } else {
          toast.error('Failed to create testing profile');
        }
      } catch (error) {
        console.error('Error creating testing profile:', error);
        toast.error('An error occurred while creating the profile');
      }
    };

    const addService = () => {
      newTestingProfile.services.push({ name: '', desiredVersion: '' });
    };

    const removeService = (index) => {
      newTestingProfile.services.splice(index, 1);
    };

    const activateTestingProfile = async (profile, testingProfile) => {
      try {
        const endpoint = testingProfile.isActive ? 'deactivate' : 'activate';
        const response = await fetch(`http://localhost:3000/api/testing-profiles/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            testingProfileId: testingProfile.id,
          }),
        });

        if (response.ok) {
          const updatedProfile = await response.json();
          // Update the local profile state with the new versions and testing profile statuses
          const profileIndex = profiles.value.findIndex((p) => p.id === profile.id);
          if (profileIndex > -1) {
            profiles.value[profileIndex] = updatedProfile.profile;
          }
          toast.success(`Testing profile ${testingProfile.isActive ? 'deactivated' : 'activated'} successfully`);
        } else {
          const errorData = await response.json();
          toast.error(`Failed to ${endpoint} testing profile: ${errorData.error}`);
        }
      } catch (error) {
        console.error(`Error ${testingProfile.isActive ? 'deactivating' : 'activating'} testing profile:`, error);
        toast.error(`An error occurred while ${testingProfile.isActive ? 'deactivating' : 'activating'} the testing profile.`);
      }
    };

    const deleteTestingProfile = async (profile, testingProfile) => {
      try {
        const response = await fetch(`http://localhost:3000/api/testing-profiles/${testingProfile.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: profile.id,
          }),
        });

        if (response.ok) {
          // Remove the deleted testing profile from the local state
          const profileIndex = profiles.value.findIndex((p) => p.id === profile.id);
          if (profileIndex > -1) {
            const updatedTestingProfiles = profiles.value[profileIndex].testingProfiles.filter(
              (tp) => tp.id !== testingProfile.id
            );
            profiles.value[profileIndex].testingProfiles = updatedTestingProfiles;
          }
          toast.success('Testing profile deleted successfully');
        } else {
          toast.error('Failed to delete testing profile');
        }
      } catch (error) {
        console.error('Error deleting testing profile:', error);
        toast.error('An error occurred while deleting the testing profile');
      }
    };

    const openExpandedModal = (profile) => {
      selectedProfile.value = profile;
    };

    const closeExpandedModal = () => {
      selectedProfile.value = null;
    };

    onMounted(fetchProfiles);

    return {
      profiles,
      expandedProfiles,
      selectedProfile,
      showCreateModal,
      modalProfile,
      newTestingProfile,
      searchQuery,
      filterStatus,
      filteredProfiles,
      hasActiveTests,
      toggleExpand,
      openCreateModal,
      closeCreateModal,
      createTestingProfile,
      addService,
      removeService,
      activateTestingProfile,
      deleteTestingProfile,
      openExpandedModal,
      closeExpandedModal,
    };
  },
};
</script>

<style scoped>
/* Smooth transitions for all state changes */
.test-profile-card {
  transition: all 0.3s ease;
}

/* Active profile styling */
.active-profile {
  position: relative;
  border-color: rgb(191, 219, 254);
  background-color: rgb(239, 246, 255);
}

/* Left border indicator animation */
.active-profile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: rgb(59, 130, 246);
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  transform: scaleY(0);
  transform-origin: top;
  animation: slide-in 0.3s ease forwards;
}

@keyframes slide-in {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

/* Activation glow effect */
.activation-glow {
  animation: glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

/* Service item transitions */
.service-item {
  transition: all 0.2s ease;
}

.service-item:hover {
  transform: translateX(4px);
}

/* Active service badges */
.active-badge {
  position: relative;
  overflow: hidden;
}

.active-badge::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: rgb(59, 130, 246);
  animation: badge-slide 0.3s ease forwards;
}

@keyframes badge-slide {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Deactivation transition */
.deactivating {
  opacity: 0.7;
  transform: scale(0.99);
  transition: all 0.3s ease;
}

/* Focus states for interactive elements */
.interactive-element:focus {
  outline: 2px solid rgb(59, 130, 246);
  outline-offset: 2px;
}

/* Status indicator dot */
.status-indicator {
  position: relative;
  padding-left: 16px;
}

.status-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(59, 130, 246);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translateY(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-50%) scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: translateY(-50%) scale(1);
    opacity: 1;
  }
}

/* Card Styling Tweaks */
.card {
  border-radius: 12px;
  padding: 16px;
}

/* Buttons are visually consistent */
button {
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

button:hover {
  transform: scale(1.02);
}

.service-item {
  border-radius: 6px;
  padding: 8px 12px;
}

/* Cleaner hover effects */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>