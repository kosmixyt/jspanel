const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important pour les cookies de session
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, options)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export const api = {
  // Auth
  async signIn() {
    return window.location.href = `${API_URL}/auth/signin`
  },

  async signOut() {
    return window.location.href = `${API_URL}/auth/signout`
  },

  async getSession() {
    return request<any>('GET', '/auth/session')
  },

  // Domains
  async listDomains() {
    return request<any[]>('GET', '/domains')
  },

  async createDomain(domain: string, requestSsl?: boolean, enableEmail?: boolean) {
    return request<any>('POST', '/domains', {
      domain,
      requestSsl,
      enableEmail,
    })
  },

  async deleteDomain(domainId: string) {
    return request<void>('DELETE', `/domains/${domainId}`)
  },

  // Mailboxes
  async listMailboxes() {
    return request<any[]>('GET', '/mailboxes')
  },

  async createMailbox(domainId: string, username: string, password: string) {
    return request<any>('POST', '/mailboxes', {
      domainId,
      username,
      password,
    })
  },

  async deleteMailbox(mailboxId: string) {
    return request<void>('DELETE', `/mailboxes/${mailboxId}`)
  },

  // SSL
  async listSsl() {
    return request<any[]>('GET', '/ssl')
  },

  async requestSsl(domainIds: string[], email?: string) {
    return request<any>('POST', '/ssl', {
      domainIds,
      email,
    })
  },

  async deleteSsl(sslId: string) {
    return request<void>('DELETE', `/ssl/${sslId}`)
  },
}
