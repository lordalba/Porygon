import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import UploadProfile from '../views/UploadProfile.vue';
import DeployProfile from '../views/DeployProfile.vue';
import ProfileList from '../views/ProfileList.vue';

import UpdateProfile from '../views/UpdateProfile.vue';
import TestingProfiles from '../views/TestingProfiles.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/upload', name: 'UploadProfile', component: UploadProfile },
  { path: "/profiles", name: "ProfileList", component: ProfileList },
  { path: '/deploy/:profileName', name: 'DeployProfile', component: DeployProfile },
  { path: '/manage-testing', name: 'manageTesting', component: TestingProfiles },
  {
    path: '/profiles/update/:id', // Add the update route
    name: 'UpdateProfile',
    component: UpdateProfile,
    props: true, // Pass route params as props to the component
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
