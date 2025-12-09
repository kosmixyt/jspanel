<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores'

const router = useRouter()
const authStore = useAuthStore()

async function handleSignOut() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <div id="app">
    <header v-if="authStore.isAuthenticated">
      <nav class="navbar">
        <div class="nav-brand">Panel Admin</div>
        <ul class="nav-links">
          <li>
            <RouterLink to="/">Domaines</RouterLink>
          </li>
          <li>
            <RouterLink to="/mailboxes">Boîtes Mail</RouterLink>
          </li>
          <li>
            <RouterLink to="/ssl">SSL</RouterLink>
          </li>
        </ul>
        <div class="nav-user">
          <span v-if="authStore.user" class="user-name">{{ authStore.user.name }}</span>
          <button @click="handleSignOut" class="btn-logout">Déconnexion</button>
        </div>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: #333;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.navbar {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
  margin-right: 2rem;
}

.nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
  flex: 1;
}

.nav-links li {
  margin: 0;
}

.nav-links a {
  display: block;
  padding: 0.75rem 1.5rem;
  color: #ddd;
  text-decoration: none;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.nav-links a:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-links a.router-link-active {
  color: white;
  border-bottom-color: #42b983;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.9rem;
  color: #ddd;
}

.btn-logout {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-logout:hover {
  background-color: #35a372;
}

main {
  flex: 1;
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    height: auto;
    padding: 0.5rem 1rem;
    gap: 1rem;
  }

  .nav-brand {
    margin-right: 0;
    width: 100%;
  }

  .nav-links {
    width: 100%;
    flex-direction: column;
  }

  .nav-links a {
    padding: 0.5rem 0;
    border-bottom: none;
    border-left: 3px solid transparent;
  }

  .nav-links a.router-link-active {
    border-left-color: #42b983;
    border-bottom-color: transparent;
  }

  .nav-user {
    width: 100%;
    gap: 0.5rem;
  }
}
</style>
