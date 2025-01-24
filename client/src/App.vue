<template>
  <div>
    <NavBar />
    <router-view />
  </div>
</template>

<script>
import NavBar from "./components/NavBar.vue";

export default {
  components: {
    NavBar,
  },
};
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Lilita+One&family=Pacifico&display=swap');

#app {
  font-family: "Lexend", sans-serif;
}
</style>
