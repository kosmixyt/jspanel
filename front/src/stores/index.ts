import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function checkSession() {
    loading.value = true
    error.value = null
    try {
      const session = await api.getSession()
      user.value = session.user || null
    } catch (err) {
      user.value = null
      error.value = err instanceof Error ? err.message : 'Failed to check session'
    } finally {
      loading.value = false
    }
  }

  async function signIn() {
    loading.value = true
    error.value = null
    try {
      await api.signIn()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sign in'
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    error.value = null
    try {
      await api.signOut()
      user.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sign out'
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    checkSession,
    signIn,
    signOut,
  }
})

export const useDomainsStore = defineStore('domains', () => {
  const domains = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDomains() {
    loading.value = true
    error.value = null
    try {
      domains.value = await api.listDomains()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch domains'
    } finally {
      loading.value = false
    }
  }

  async function createDomain(domain: string, requestSsl?: boolean, enableEmail?: boolean) {
    loading.value = true
    error.value = null
    try {
      const newDomain = await api.createDomain(domain, requestSsl, enableEmail)
      domains.value.push(newDomain)
      return newDomain
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create domain'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteDomain(domainId: string) {
    loading.value = true
    error.value = null
    try {
      await api.deleteDomain(domainId)
      domains.value = domains.value.filter(d => d.id !== domainId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete domain'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    domains,
    loading,
    error,
    fetchDomains,
    createDomain,
    deleteDomain,
  }
})

export const useMailboxesStore = defineStore('mailboxes', () => {
  const mailboxes = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMailboxes() {
    loading.value = true
    error.value = null
    try {
      mailboxes.value = await api.listMailboxes()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch mailboxes'
    } finally {
      loading.value = false
    }
  }

  async function createMailbox(domainId: string, username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const newMailbox = await api.createMailbox(domainId, username, password)
      mailboxes.value.push(newMailbox)
      return newMailbox
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create mailbox'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteMailbox(mailboxId: string) {
    loading.value = true
    error.value = null
    try {
      await api.deleteMailbox(mailboxId)
      mailboxes.value = mailboxes.value.filter(m => m.id !== mailboxId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete mailbox'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    mailboxes,
    loading,
    error,
    fetchMailboxes,
    createMailbox,
    deleteMailbox,
  }
})

export const useSslStore = defineStore('ssl', () => {
  const certificates = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCertificates() {
    loading.value = true
    error.value = null
    try {
      certificates.value = await api.listSsl()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch certificates'
    } finally {
      loading.value = false
    }
  }

  async function requestCertificate(domainIds: string[], email?: string) {
    loading.value = true
    error.value = null
    try {
      const cert = await api.requestSsl(domainIds, email)
      certificates.value.push(cert)
      return cert
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to request certificate'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteCertificate(sslId: string) {
    loading.value = true
    error.value = null
    try {
      await api.deleteSsl(sslId)
      certificates.value = certificates.value.filter(c => c.id !== sslId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete certificate'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    certificates,
    loading,
    error,
    fetchCertificates,
    requestCertificate,
    deleteCertificate,
  }
})
