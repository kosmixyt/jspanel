<template>
  <div class="domains-container">
    <div class="header">
      <h1>Domaines</h1>
      <button @click="showAddForm = true" class="btn btn-primary">
        + Ajouter un domaine
      </button>
    </div>

    <div v-if="domainsStore.error" class="error-message">
      {{ domainsStore.error }}
    </div>

    <!-- Form to add domain -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <h2>Ajouter un domaine</h2>
        <form @submit.prevent="handleAddDomain">
          <div class="form-group">
            <label>Domaine</label>
            <input
              v-model="newDomain.domain"
              type="text"
              placeholder="exemple.com"
              required
            />
          </div>

          <div class="form-group">
            <label>
              <input v-model="newDomain.requestSsl" type="checkbox" />
              Demander un certificat SSL
            </label>
          </div>

          <div class="form-group">
            <label>
              <input v-model="newDomain.enableEmail" type="checkbox" />
              Activer l'email
            </label>
          </div>

          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              :disabled="domainsStore.loading"
              class="btn btn-primary"
            >
              {{ domainsStore.loading ? 'Création...' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Domains list -->
    <div v-if="domainsStore.loading && domainsStore.domains.length === 0" class="loading">
      Chargement des domaines...
    </div>

    <div v-else-if="domainsStore.domains.length === 0" class="empty-state">
      <p>Aucun domaine pour le moment.</p>
      <p class="text-muted">Commencez par ajouter un domaine.</p>
    </div>

    <div v-else class="domains-grid">
      <div v-for="domain in domainsStore.domains" :key="domain.id" class="domain-card">
        <div class="card-header">
          <h3>{{ domain.domain }}</h3>
          <button
            @click="handleDeleteDomain(domain.id)"
            :disabled="deleting === domain.id"
            class="btn btn-danger btn-small"
          >
            {{ deleting === domain.id ? '...' : '✕' }}
          </button>
        </div>
        <div class="card-body">
          <p><strong>ID:</strong> {{ domain.id }}</p>
          <p><strong>Email:</strong> {{ domain.emailEnabled ? 'Actif' : 'Inactif' }}</p>
          <p><strong>SSL:</strong> {{ domain.sslEnabled ? 'Actif' : 'Inactif' }}</p>
          <p v-if="domain.createdAt">
            <strong>Créé:</strong> {{ new Date(domain.createdAt).toLocaleDateString('fr-FR') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDomainsStore } from '../stores'

const domainsStore = useDomainsStore()
const showAddForm = ref(false)
const deleting = ref<string | null>(null)

const newDomain = ref({
  domain: '',
  requestSsl: false,
  enableEmail: false,
})

onMounted(() => {
  domainsStore.fetchDomains()
})

async function handleAddDomain() {
  try {
    await domainsStore.createDomain(
      newDomain.value.domain,
      newDomain.value.requestSsl,
      newDomain.value.enableEmail
    )
    showAddForm.value = false
    newDomain.value = { domain: '', requestSsl: false, enableEmail: false }
  } catch (err) {
    // Error is handled by store
  }
}

async function handleDeleteDomain(domainId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) {
    return
  }
  deleting.value = domainId
  try {
    await domainsStore.deleteDomain(domainId)
  } catch (err) {
    // Error is handled by store
  } finally {
    deleting.value = null
  }
}
</script>

<style scoped>
.domains-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 {
  margin: 0;
  color: #333;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.text-muted {
  color: #999;
  font-size: 0.9rem;
}

.domains-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.domain-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.domain-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  flex: 1;
  word-break: break-all;
}

.card-body {
  padding: 1rem;
}

.card-body p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #42b983;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #35a372;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d0d0d0;
}

.btn-danger {
  background-color: #ff6b6b;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #ee5a52;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="email"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.form-group input[type="checkbox"] {
  margin-right: 0.5rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  flex: 1;
}
</style>
