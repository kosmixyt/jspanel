<template>
  <div class="ssl-container">
    <div class="header">
      <h1>Certificats SSL</h1>
      <button @click="showAddForm = true" class="btn btn-primary">
        + Demander un certificat
      </button>
    </div>

    <div v-if="sslStore.error" class="error-message">
      {{ sslStore.error }}
    </div>

    <!-- Form to request SSL -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <h2>Demander un certificat SSL</h2>
        <form @submit.prevent="handleRequestSsl">
          <div class="form-group">
            <label>Domaines</label>
            <div class="domains-checkbox-group">
              <label v-for="domain in domains" :key="domain.id" class="checkbox-label">
                <input
                  type="checkbox"
                  :value="domain.id"
                  v-model="newSsl.domainIds"
                />
                {{ domain.domain }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Email de contact (optionnel)</label>
            <input
              v-model="newSsl.email"
              type="email"
              placeholder="contact@exemple.com"
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              :disabled="sslStore.loading || newSsl.domainIds.length === 0"
              class="btn btn-primary"
            >
              {{ sslStore.loading ? 'Demande...' : 'Demander' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- SSL list -->
    <div v-if="sslStore.loading && sslStore.certificates.length === 0" class="loading">
      Chargement des certificats...
    </div>

    <div v-else-if="sslStore.certificates.length === 0" class="empty-state">
      <p>Aucun certificat SSL pour le moment.</p>
      <p class="text-muted">Demandez un certificat pour sécuriser vos domaines.</p>
    </div>

    <div v-else class="ssl-grid">
      <div v-for="cert in sslStore.certificates" :key="cert.id" class="ssl-card">
        <div class="card-header">
          <h3>{{ cert.domains.map(d => d.domain).join(', ') }}</h3>
          <button
            @click="handleDeleteSsl(cert.id)"
            :disabled="deleting === cert.id"
            class="btn btn-danger btn-small"
          >
            {{ deleting === cert.id ? '...' : '✕' }}
          </button>
        </div>
        <div class="card-body">
          <p><strong>ID:</strong> {{ cert.id }}</p>
          <p v-if="cert.issuer">
            <strong>Autorité:</strong> {{ cert.issuer }}
          </p>
          <p v-if="cert.expiresAt">
            <strong>Expire le:</strong> {{ new Date(cert.expiresAt).toLocaleDateString('fr-FR') }}
          </p>
          <p v-if="cert.createdAt">
            <strong>Créé:</strong> {{ new Date(cert.createdAt).toLocaleDateString('fr-FR') }}
          </p>
          <div v-if="cert.status" class="status">
            <strong>Statut:</strong>
            <span :class="`status-badge status-${cert.status.toLowerCase()}`">
              {{ cert.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSslStore, useDomainsStore } from '../stores'

const sslStore = useSslStore()
const domainsStore = useDomainsStore()
const showAddForm = ref(false)
const deleting = ref<string | null>(null)

const newSsl = ref({
  domainIds: [] as string[],
  email: '',
})

const domains = computed(() => domainsStore.domains)

onMounted(async () => {
  await sslStore.fetchCertificates()
  await domainsStore.fetchDomains()
})

async function handleRequestSsl() {
  try {
    await sslStore.requestCertificate(
      newSsl.value.domainIds,
      newSsl.value.email || undefined
    )
    showAddForm.value = false
    newSsl.value = { domainIds: [], email: '' }
  } catch (err) {
    // Error is handled by store
  }
}

async function handleDeleteSsl(sslId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce certificat SSL ?')) {
    return
  }
  deleting.value = sslId
  try {
    await sslStore.deleteCertificate(sslId)
  } catch (err) {
    // Error is handled by store
  } finally {
    deleting.value = null
  }
}
</script>

<style scoped>
.ssl-container {
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

.ssl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.ssl-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.ssl-card:hover {
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

.status {
  margin-top: 0.75rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-expired {
  background-color: #f8d7da;
  color: #721c24;
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.domains-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #333;
}

.checkbox-label input {
  width: auto;
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
