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
                  <p class="text-sm text-gray-600">
                    <span class="font-medium">Services:</span> {{ profile.services.length }}
                  </p>
                </div>
              </div>
              <button
                @click="toggleExpand(profile.id)"
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                :class="{ 'rotate-180': expandedProfiles[profile.id] }"
              >
                ↓
              </button>
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
                <h3 class="mb-3 text-lg font-medium text-gray-900">Active Testing Profiles</h3>
                <div class="space-y-3">
                  <div
                    v-for="testProfile in profile.testingProfiles"
                    :key="testProfile.id"
                    class="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div class="flex items-start justify-between">
                      <div>
                        <h4 class="font-medium text-gray-900">{{ testProfile.name }}</h4>
                        <p class="mt-1 text-sm text-gray-600">
                          {{ testProfile.services.length }} services under test
                        </p>
                      </div>
                      <div class="flex gap-2">
                        <button
                          @click="activateTestingProfile(profile, testProfile)"
                          class="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Activate
                        </button>
                        <button
                          @click="deleteTestingProfile(profile, testProfile)"
                          class="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <!-- Services List -->
                    <div class="mt-3 space-y-2">
                      <div
                        v-for="service in testProfile.services"
                        :key="service.name"
                        class="flex items-center justify-between rounded-lg bg-white p-2 text-sm"
                      >
                        <span class="font-medium text-gray-700">{{ service.name }}</span>
                        <span class="text-gray-500">v{{ service.version }}</span>
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
                      v-model="service.version"
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
      </div>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { useToast } from 'vue-toastification';
  
  export default {
    name: 'TestingProfiles',
    setup() {
      const toast = useToast();
      
      // State
      const profiles = ref([]);
      const expandedProfiles = reactive({});
      const showCreateModal = ref(false);
      const modalProfile = ref(null);
      const searchQuery = ref('');
      const filterStatus = ref('all');
      
      const newTestingProfile = reactive({
        name: '',
        services: []
      });
  
      // Computed
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
      // Methods
      const hasActiveTests = (profile) => profile.testingProfiles?.length > 0;
  
      const fetchProfiles = async () => {
  try {
    const response = await fetch("http://localhost:3000/api/profiles");
    if (response.ok) {
      profiles.value = (await response.json()).map((profile) => ({
        ...profile,
        testingProfiles: profile.testingProfiles || [],
      }));
    } else {
      toast.error("Failed to fetch profiles.");
    }
  } catch (error) {
    console.error("Error fetching profiles:", error);
    toast.error("Error loading profiles.");
  }
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
          console.log("ze profile I'm adding a testing profile at: " + modalProfile.value.name + " and id: " + modalProfile.value.id)
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
  
      onMounted(fetchProfiles);
  
      return {
        profiles,
        expandedProfiles,
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
      };
    },
  };
  </script>
  
  <style scoped>
  /* Base transitions */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
  }
  
  /* Collapse/expand animations */
  .collapse-enter-active,
  .collapse-leave-active {
    transition: all 0.3s ease-in-out;
    overflow: hidden;
  }
  
  .collapse-enter-from,
  .collapse-leave-to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  
  /* Enhanced hover states */
  .profile-card {
    transition: all 0.2s ease;
  }
  
  .profile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  /* Button animations */
  button {
    transition: all 0.2s ease;
  }
  
  button:active {
    transform: scale(0.97);
  }
  
  /* Service tag animations */
  .service-tag {
    transition: all 0.2s ease;
  }
  
  .service-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  /* Modal animations */
  .modal-overlay {
    animation: fadeIn 0.2s ease;
  }
  
  .modal-content {
    animation: slideIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Form input focus states */
  input:focus,
  select:focus {
    transition: all 0.2s ease;
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  /* Custom scrollbar for service lists */
  .services-list {
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 #F1F5F9;
  }
  
  .services-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .services-list::-webkit-scrollbar-track {
    background: #F1F5F9;
    border-radius: 3px;
  }
  
  .services-list::-webkit-scrollbar-thumb {
    background-color: #CBD5E1;
    border-radius: 3px;
  }
  
  /* Loading state animations */
  .loading-spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Status indicator animations */
  .status-indicator {
    transition: all 0.3s ease;
  }
  
  .status-indicator.active {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }
  
  /* Toast notification animations */
  .toast-notification {
    animation: slideInRight 0.3s ease;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  /* Responsive design adjustments */
  @media (max-width: 640px) {
    .modal-content {
      margin: 1rem;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
    }
    
    .grid {
      gap: 1rem;
    }
  }
  </style>