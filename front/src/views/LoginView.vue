<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Panel Admin</h1>
      <p class="subtitle">Connectez-vous pour gérer vos domaines</p>

      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <button
        @click="handleSignIn"
        :disabled="authStore.loading"
        class="discord-button"
      >
        <span v-if="!authStore.loading">Connexion avec Discord</span>
        <span v-else>Connexion...</span>
      </button>

      <p class="info-text">
        Vous serez redirigé vers Discord pour vous authentifier de manière sécurisée.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores'

const authStore = useAuthStore()

async function handleSignIn() {
  await authStore.signIn()
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h1 {
  color: #333;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.subtitle {
  color: #666;
  margin: 0 0 2rem 0;
  font-size: 0.95rem;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.discord-button {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background-color: #5865f2;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 1rem;
}

.discord-button:hover:not(:disabled) {
  background-color: #4752c4;
}

.discord-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-text {
  color: #999;
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.4;
}
</style>
