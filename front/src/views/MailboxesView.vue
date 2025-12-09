<template>
  <div class="mailboxes-container">
    <div class="header">
      <h1>Boîtes Mail</h1>
      <button @click="showAddForm = true" class="btn btn-primary">
        + Ajouter une boîte mail
      </button>
    </div>

    <div v-if="mailboxesStore.error" class="error-message">
      {{ mailboxesStore.error }}
    </div>

    <!-- Form to add mailbox -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <h2>Ajouter une boîte mail</h2>
        <form @submit.prevent="handleAddMailbox">
          <div class="form-group">
            <label>Domaine</label>
            <select v-model="newMailbox.domainId" required>
              <option value="">-- Sélectionner un domaine --</option>
              <option v-for="domain in domains" :key="domain.id" :value="domain.id">
                {{ domain.domain }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Nom d'utilisateur</label>
            <input
              v-model="newMailbox.username"
              type="text"
              placeholder="utilisateur"
              required
            />
          </div>

          <div class="form-group">
            <label>Mot de passe</label>
            <input
              v-model="newMailbox.password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              :disabled="mailboxesStore.loading"
              class="btn btn-primary"
            >
              {{ mailboxesStore.loading ? 'Création...' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Mailboxes list -->
    <div v-if="mailboxesStore.loading && mailboxesStore.mailboxes.length === 0" class="loading">
      Chargement des boîtes mail...
    </div>

    <div v-else-if="mailboxesStore.mailboxes.length === 0" class="empty-state">
      <p>Aucune boîte mail pour le moment.</p>
      <p class="text-muted">Commencez par ajouter une boîte mail.</p>
    </div>

    <div v-else class="mailboxes-grid">
      <div v-for="mailbox in mailboxesStore.mailboxes" :key="mailbox.id" class="mailbox-card">
        <div class="card-header">
          <h3>{{ mailbox.username }}</h3>
          <button
            @click="handleDeleteMailbox(mailbox.id)"
            :disabled="deleting === mailbox.id"
            class="btn btn-danger btn-small"
          >
            {{ deleting === mailbox.id ? '...' : '✕' }}
          </button>
        </div>
        <div class="card-body">
          <p><strong>Email:</strong> {{ mailbox.username }}@{{ getDomainName(mailbox.domainId) }}</p>
          <p><strong>ID:</strong> {{ mailbox.id }}</p>
          <p v-if="mailbox.createdAt">
            <strong>Créé:</strong> {{ new Date(mailbox.createdAt).toLocaleDateString('fr-FR') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMailboxesStore, useDomainsStore } from '../stores'

const mailboxesStore = useMailboxesStore()
const domainsStore = useDomainsStore()
const showAddForm = ref(false)
const deleting = ref<string | null>(null)

const newMailbox = ref({
  domainId: '',
  username: '',
  password: '',
})

const domains = computed(() => domainsStore.domains)

onMounted(async () => {
  await mailboxesStore.fetchMailboxes()
  await domainsStore.fetchDomains()
})

function getDomainName(domainId: string): string {
  const domain = domainsStore.domains.find(d => d.id === domainId)
  return domain?.domain || 'Unknown'
}

async function handleAddMailbox() {
  try {
    await mailboxesStore.createMailbox(
      newMailbox.value.domainId,
      newMailbox.value.username,
      newMailbox.value.password
    )
    showAddForm.value = false
    newMailbox.value = { domainId: '', username: '', password: '' }
  } catch (err) {
    // Error is handled by store
  }
}

async function handleDeleteMailbox(mailboxId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette boîte mail ?')) {
    return
  }
  deleting.value = mailboxId
  try {
    await mailboxesStore.deleteMailbox(mailboxId)
  } catch (err) {
    // Error is handled by store
  } finally {
    deleting.value = null
  }
}
</script>

<style scoped>
.mailboxes-container {
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

.mailboxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.mailbox-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.mailbox-card:hover {
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
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
