import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {},
  },
  compilerOptions: {
    isCustomElement: (tag) => tag === 'vue-json-pretty',
  },
});
