import type {
  AmenityRecord,
  BookingSiteSettingsRecord,
  BookingRequestRecord,
  CancellationPolicyRecord,
  CleanStatusRecord,
  DoorCodeRecord,
  ExpenseCategoryRecord,
  AuthUser,
  FinanceExpenseRecord,
  FinanceSummary,
  FinancialObligationRecord,
  HouseRuleRecord,
  LoanRecord,
  MaintenanceIssueRecord,
  ManagedUser,
  MonthlyTaxRecord,
  PricingRuleRecord,
  PromoCodeRecord,
  PropertyListing,
  PropertyPhotoRecord,
  ReservationAttachment,
  ReservationAuditEntry,
  ReservationRecord,
  SyncLogRecord,
  LockboxCodeRecord,
  UserRole,
} from '../types/domain'

function activePlatform(): string {
  return localStorage.getItem('pms.platform') || 'airstay'
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(input: RequestInfo | URL) {
  if (typeof input !== 'string') {
    return input
  }
  if (!API_BASE_URL || /^https?:\/\//i.test(input)) {
    return input
  }
  return `${API_BASE_URL}${input}`
}

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(apiUrl(input), {
    credentials: 'include',
    ...init,
  })
}

async function readJson<T>(response: Response): Promise<T> {
  const rawBody = await response.text()
  const data = rawBody ? (JSON.parse(rawBody) as T) : ({} as T)

  if (!response.ok) {
    throw new Error(formatApiError((data as { error?: unknown }).error || response.statusText))
  }

  return data
}

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchCurrentUser() {
  const response = await apiFetch('/api/auth/me/')
  const data = await readJson<{ user: AuthUser }>(response)
  return data.user
}

export async function loginUser(payload: { username: string; password: string }) {
  const response = await apiFetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ user: AuthUser }>(response)
  return data.user
}

export async function logoutUser() {
  const response = await apiFetch('/api/auth/logout/', { method: 'POST' })
  const data = await readJson<{ user: AuthUser }>(response)
  return data.user
}

// â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchUsers() {
  const response = await apiFetch('/api/users/')
  const data = await readJson<{ users: ManagedUser[] }>(response)
  return data.users
}

export async function createUserAccount(payload: UserAccountPayload) {
  const response = await apiFetch('/api/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ user: ManagedUser }>(response)
  return data.user
}

export async function updateUserAccount(id: number, payload: UserAccountPayload) {
  const response = await apiFetch(`/api/users/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ user: ManagedUser }>(response)
  return data.user
}

// â”€â”€ Properties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchProperties(includeInactive = false) {
  const params = new URLSearchParams({ platform: activePlatform() })
  if (includeInactive) params.set('includeInactive', '1')
  const response = await apiFetch(`/api/properties/?${params.toString()}`)
  const data = await readJson<{ properties: PropertyListing[] }>(response)
  return data.properties
}

export async function createProperty(payload: PropertyPayload) {
  const formData = new FormData()
  formData.append('name', payload.name)
  formData.append('bedrooms', String(payload.bedrooms))
  formData.append('basePriceEur', payload.basePriceEur)
  formData.append('address', payload.address)
  formData.append('floor', payload.floor || '')
  formData.append('wifiName', payload.wifiName || '')
  formData.append('wifiPassword', payload.wifiPassword || '')
  formData.append('platform', activePlatform())
  formData.append('description', payload.description || '')
  formData.append('listingActive', payload.listingActive !== false ? 'true' : 'false')
  if (payload.maxGuests !== undefined) formData.append('maxGuests', String(payload.maxGuests))
  if (payload.photo) {
    formData.append('photo', payload.photo)
  }

  const response = await apiFetch('/api/properties/', {
    method: 'POST',
    body: formData,
  })
  const data = await readJson<{ property: PropertyListing }>(response)
  return data.property
}

export async function updateProperty(id: string, payload: PropertyEditPayload) {
  const extraFields = {
    description: payload.description || '',
    listingActive: payload.listingActive !== false,
    ...(payload.maxGuests !== undefined ? { maxGuests: payload.maxGuests } : {}),
  }

  if (payload.photo) {
    const formData = new FormData()
    formData.append('name', payload.name)
    formData.append('bedrooms', String(payload.bedrooms))
    formData.append('basePriceEur', payload.basePriceEur)
    formData.append('address', payload.address)
    formData.append('floor', payload.floor || '')
    formData.append('wifiName', payload.wifiName || '')
    formData.append('wifiPassword', payload.wifiPassword || '')
    formData.append('photo', payload.photo)
    formData.append('description', extraFields.description)
    formData.append('listingActive', extraFields.listingActive ? 'true' : 'false')
    if (payload.maxGuests !== undefined) formData.append('maxGuests', String(payload.maxGuests))
    const response = await apiFetch(`/api/properties/${id}/`, { method: 'PATCH', body: formData })
    const data = await readJson<{ property: PropertyListing }>(response)
    return data.property
  }
  const response = await apiFetch(`/api/properties/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      bedrooms: payload.bedrooms,
      basePriceEur: payload.basePriceEur,
      address: payload.address,
      floor: payload.floor || '',
      wifiName: payload.wifiName || '',
      wifiPassword: payload.wifiPassword || '',
      ...extraFields,
    }),
  })
  const data = await readJson<{ property: PropertyListing }>(response)
  return data.property
}

export async function deleteProperty(id: string) {
  const response = await apiFetch(`/api/properties/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete property.')
  }
}

export async function updatePropertySync(id: string, payload: PropertySyncPayload) {
  const response = await apiFetch(`/api/properties/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ property: PropertyListing }>(response)
  return data.property
}

export async function syncPropertyCalendar(id: string, channel: 'airbnb' | 'booking') {
  const response = await apiFetch(`/api/properties/${id}/sync/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  })
  return readJson<{
    sync: {
      imported: number
      updated: number
      skipped: number
      errors: string[]
    }
  }>(response)
}

// â”€â”€ Reservations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchReservations(filters?: { month: number; propertyId?: string; year: number; archived?: boolean }) {
  const params = new URLSearchParams()
  params.set('platform', activePlatform())
  if (filters) {
    params.set('year', String(filters.year))
    params.set('month', String(filters.month))
    if (filters.propertyId) {
      params.set('property', filters.propertyId)
    }
    if (filters.archived) {
      params.set('archived', '1')
    }
  }
  const response = await apiFetch(`/api/reservations/?${params.toString()}`)
  const data = await readJson<{ reservations: ReservationRecord[] }>(response)
  return data.reservations
}

export async function fetchArchivedReservations(filters?: { month?: number; year?: number }) {
  const params = new URLSearchParams()
  params.set('platform', activePlatform())
  params.set('archived', '1')
  if (filters?.year) params.set('year', String(filters.year))
  if (filters?.month) params.set('month', String(filters.month))
  const response = await apiFetch(`/api/reservations/?${params.toString()}`)
  const data = await readJson<{ reservations: ReservationRecord[] }>(response)
  return data.reservations
}

export async function createReservation(payload: ReservationPayload) {
  const response = await apiFetch('/api/reservations/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ reservation: ReservationRecord }>(response)
  return data.reservation
}

export async function updateReservation(id: string, payload: ReservationPayload) {
  const response = await apiFetch(`/api/reservations/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ reservation: ReservationRecord }>(response)
  return data.reservation
}

export async function deleteReservation(id: string) {
  const response = await apiFetch(`/api/reservations/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not archive reservation.')
  }
}

export async function permanentDeleteReservation(id: string) {
  const response = await apiFetch(`/api/reservations/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not permanently delete reservation.')
  }
}

export async function restoreReservation(id: string) {
  const response = await apiFetch(`/api/reservations/${id}/restore/`, { method: 'POST' })
  const data = await readJson<{ reservation: ReservationRecord }>(response)
  return data.reservation
}

export async function fetchReservationHistory(id: string) {
  const response = await apiFetch(`/api/reservations/${id}/history/`)
  const data = await readJson<{ history: ReservationAuditEntry[] }>(response)
  return data.history
}

export async function fetchReservationAttachments(reservationId: string) {
  const response = await apiFetch(`/api/reservations/${reservationId}/attachments/`)
  const data = await readJson<{ attachments: ReservationAttachment[] }>(response)
  return data.attachments
}

export async function uploadReservationAttachment(reservationId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiFetch(`/api/reservations/${reservationId}/attachments/`, {
    method: 'POST',
    body: formData,
  })
  const data = await readJson<{ attachment: ReservationAttachment }>(response)
  return data.attachment
}

export async function deleteReservationAttachment(reservationId: string, attachmentId: string) {
  const response = await apiFetch(`/api/reservations/${reservationId}/attachments/${attachmentId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Could not delete attachment.')
  }
}

// â”€â”€ Access Codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchDoorCodes() {
  const response = await apiFetch('/api/codes/door/')
  const data = await readJson<{ doorCodes: DoorCodeRecord[] }>(response)
  return data.doorCodes
}

export async function updateDoorCode(id: string, payload: DoorCodePayload) {
  const response = await apiFetch(`/api/codes/door/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ doorCode: DoorCodeRecord }>(response)
  return data.doorCode
}

export async function fetchLockboxCodes() {
  const response = await apiFetch('/api/codes/lockboxes/')
  const data = await readJson<{ lockboxCodes: LockboxCodeRecord[] }>(response)
  return data.lockboxCodes
}

export async function createLockboxCode(payload: LockboxCodePayload) {
  const response = await apiFetch('/api/codes/lockboxes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ lockboxCode: LockboxCodeRecord }>(response)
  return data.lockboxCode
}

export async function updateLockboxCode(id: string, payload: LockboxCodePayload) {
  const response = await apiFetch(`/api/codes/lockboxes/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ lockboxCode: LockboxCodeRecord }>(response)
  return data.lockboxCode
}

export async function deleteLockboxCode(id: string) {
  const response = await apiFetch(`/api/codes/lockboxes/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete lockbox code.')
  }
}

// â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchFinanceSummary(filters: { month: number; year: number }) {
  const params = new URLSearchParams()
  params.set('year', String(filters.year))
  params.set('month', String(filters.month))
  const response = await apiFetch(`/api/finance/summary/?${params.toString()}`)
  return readJson<{
    summary: FinanceSummary
    expenses: FinanceExpenseRecord[]
    loans: LoanRecord[]
    obligations: FinancialObligationRecord[]
  }>(response)
}

export async function fetchExpenseCategories() {
  const response = await apiFetch('/api/finance/categories/')
  const data = await readJson<{ categories: ExpenseCategoryRecord[] }>(response)
  return data.categories
}

export async function createExpenseCategory(payload: { name: string; color: string }) {
  const response = await apiFetch('/api/finance/categories/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ category: ExpenseCategoryRecord }>(response)
  return data.category
}

export async function fetchAllFinanceExpenses() {
  const response = await apiFetch('/api/finance/expenses/')
  const data = await readJson<{ expenses: FinanceExpenseRecord[] }>(response)
  return data.expenses
}

export async function deleteExpenseCategory(id: string) {
  const response = await apiFetch(`/api/finance/categories/${id}/`, { method: 'DELETE' })
  return readJson<{ deleted: boolean }>(response)
}

export async function updateExpenseCategory(id: string, patch: { color?: string; name?: string }) {
  const response = await apiFetch(`/api/finance/categories/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return readJson<{ category: import('../types/domain').ExpenseCategoryRecord }>(response)
}

export async function createFinanceExpense(payload: FinanceExpensePayload) {
  const response = await apiFetch('/api/finance/expenses/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ expense: FinanceExpenseRecord }>(response)
  return data.expense
}

export async function updateFinanceExpense(id: string, payload: FinanceExpensePayload) {
  const response = await apiFetch(`/api/finance/expenses/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ expense: FinanceExpenseRecord }>(response)
  return data.expense
}

export async function deleteFinanceExpense(id: string) {
  const response = await apiFetch(`/api/finance/expenses/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete expense.')
  }
}

export async function createLoan(payload: LoanPayload) {
  const response = await apiFetch('/api/finance/loans/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ loan: LoanRecord }>(response)
  return data.loan
}

export async function deleteLoan(id: string) {
  const response = await apiFetch(`/api/finance/loans/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete loan.')
  }
}

export async function createFinancialObligation(payload: FinancialObligationPayload) {
  const response = await apiFetch('/api/finance/obligations/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ obligation: FinancialObligationRecord }>(response)
  return data.obligation
}

export async function updateFinancialObligation(id: string, payload: FinancialObligationPayload) {
  const response = await apiFetch(`/api/finance/obligations/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ obligation: FinancialObligationRecord }>(response)
  return data.obligation
}

export async function deleteFinancialObligation(id: string) {
  const response = await apiFetch(`/api/finance/obligations/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete obligation.')
  }
}

// â”€â”€ Taxes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchTaxes(year?: number) {
  const params = new URLSearchParams()
  if (year) params.set('year', String(year))
  const response = await apiFetch(`/api/finance/taxes/?${params.toString()}`)
  const data = await readJson<{ taxes: MonthlyTaxRecord[] }>(response)
  return data.taxes
}

export async function upsertTax(payload: MonthlyTaxPayload) {
  const response = await apiFetch('/api/finance/taxes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ tax: MonthlyTaxRecord }>(response)
  return data.tax
}

export async function deleteTax(id: string) {
  const response = await apiFetch(`/api/finance/taxes/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete tax record.')
  }
}

// â”€â”€ Maintenance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMaintenanceIssues(propertyId?: string) {
  const params = new URLSearchParams()
  if (propertyId) params.set('property', propertyId)
  const response = await apiFetch(`/api/maintenance/?${params.toString()}`)
  const data = await readJson<{ issues: MaintenanceIssueRecord[] }>(response)
  return data.issues
}

export async function createMaintenanceIssue(payload: MaintenanceIssuePayload) {
  const formData = new FormData()
  formData.append('propertyId', payload.propertyId)
  formData.append('description', payload.description)
  formData.append('reporterName', payload.reporterName || '')
  for (const photo of payload.photos || []) {
    formData.append('photos', photo)
  }
  const response = await apiFetch('/api/maintenance/', { method: 'POST', body: formData })
  const data = await readJson<{ issue: MaintenanceIssueRecord }>(response)
  return data.issue
}

export async function updateMaintenanceIssue(id: string, payload: { description: string }) {
  const response = await apiFetch(`/api/maintenance/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ issue: MaintenanceIssueRecord }>(response)
  return data.issue
}

export async function deleteMaintenanceIssue(id: string) {
  const response = await apiFetch(`/api/maintenance/${id}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete issue.')
  }
}

export async function deleteMaintenancePhoto(photoId: string) {
  const response = await apiFetch(`/api/maintenance/photos/${photoId}/`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Could not delete photo.')
  }
}

// â”€â”€ Clean status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchCleanStatuses() {
  const response = await apiFetch('/api/clean-status/')
  const data = await readJson<{ cleanStatuses: CleanStatusRecord[] }>(response)
  return data.cleanStatuses
}

export async function markApartmentCleaned(propertyId: string, isCleaned: boolean) {
  const response = await apiFetch(`/api/clean-status/${propertyId}/mark/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isCleaned }),
  })
  const data = await readJson<{ cleanStatus: CleanStatusRecord }>(response)
  return data.cleanStatus
}

// â”€â”€ Sync Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchSyncLogs(propertyId?: string) {
  const params = new URLSearchParams()
  if (propertyId) params.set('property', propertyId)
  const response = await apiFetch(`/api/sync-logs/?${params.toString()}`)
  const data = await readJson<{ syncLogs: SyncLogRecord[] }>(response)
  return data.syncLogs
}

// â”€â”€ Payload types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ReservationPayload = {
  guestName: string
  guestPhone: string
  paymentDue: string
  paid: boolean
  notes: string
  reservationType: string
  propertyId: string
  checkIn: string
  checkOut: string
  nightlyPrice: string
}

export type PropertyPayload = {
  name: string
  bedrooms: number
  basePriceEur: string
  address: string
  floor?: string
  wifiName?: string
  wifiPassword?: string
  photo: File | null
  description?: string
  listingActive?: boolean
  maxGuests?: number
}

export type PropertyEditPayload = {
  name: string
  bedrooms: number
  basePriceEur: string
  address: string
  floor?: string
  wifiName?: string
  wifiPassword?: string
  photo?: File | null
  description?: string
  listingActive?: boolean
  maxGuests?: number
}

export type UserAccountPayload = {
  username: string
  password?: string
  role: Exclude<UserRole, ''>
  isActive: boolean
}

export type PropertySyncPayload = {
  airbnbIcalUrl: string
  bookingIcalUrl: string
  autoSyncEnabled?: boolean
  syncIntervalHours?: number
}

export type DoorCodePayload = {
  newCode: string
  notes: string
}

export type LockboxCodePayload = {
  name?: string
  apartmentNumber?: string
  newCode: string
  notes: string
}

export type FinanceExpensePayload = {
  name: string
  categoryId: string
  amountEur: string
  frequency: 'one_time' | 'repeated'
  startYear: number
  startMonth: number
  endYear: number | null
  endMonth: number | null
  platform: 'airstay' | 'fleet' | ''
  notes: string
}

export type LoanPayload = {
  name: string
  monthlyValueEur: string
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
  notes: string
}

export type FinancialObligationPayload = {
  companyName: string
  description: string
  amountEur: string
  dueDate: string
  paid: boolean
  notes: string
}

export type MonthlyTaxPayload = {
  year: number
  month: number
  tvsh: string
  tatimNeFitim: string
  notes: string
}

export type MaintenanceIssuePayload = {
  propertyId: string
  description: string
  reporterName?: string
  photos?: File[]
}

// â”€â”€ Receipts & Deposits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMonthlyReceipts(year: number, month: number) {
  const params = new URLSearchParams({
    platform: activePlatform(),
    year: String(year),
    month: String(month),
  })
  const response = await apiFetch(`/api/receipts/?${params}`)
  const data = await readJson<{
    days: import('../types/domain').DailyDayRecord[]
    totals: import('../types/domain').ReceiptTotals
  }>(response)
  return data
}

export async function upsertDailyEntry(payload: {
  date: string
  depositAmount: string
  receiptLeft: boolean
  note: string
}) {
  const response = await apiFetch('/api/receipts/day/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, platform: activePlatform() }),
  })
  const data = await readJson<{ entry: import('../types/domain').DailyDayRecord }>(response)
  return data.entry
}

export async function fetchDayDetail(date: string) {
  const params = new URLSearchParams({ platform: activePlatform(), date })
  const response = await apiFetch(`/api/receipts/day/detail/?${params}`)
  const data = await readJson<{
    entry: import('../types/domain').DailyDayRecord
    items: import('../types/domain').ReceiptItemRecord[]
  }>(response)
  return data
}

export async function createReceiptItem(payload: {
  date: string
  value: string
  note: string
  reservationIds: string[]
}) {
  const response = await apiFetch('/api/receipts/items/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, platform: activePlatform() }),
  })
  const data = await readJson<{ item: import('../types/domain').ReceiptItemRecord }>(response)
  return data.item
}

export async function updateReceiptItem(
  id: string,
  payload: { value: string; note: string; reservationIds: string[] },
) {
  const response = await apiFetch(`/api/receipts/items/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ item: import('../types/domain').ReceiptItemRecord }>(response)
  return data.item
}

export async function deleteReceiptItem(id: string) {
  const response = await apiFetch(`/api/receipts/items/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete receipt item.')
}

export async function fetchAvailableReservations(
  year: number,
  month: number,
  currentItemId?: string,
) {
  const params = new URLSearchParams({
    platform: activePlatform(),
    year: String(year),
    month: String(month),
  })
  if (currentItemId) params.set('currentItemId', currentItemId)
  const response = await apiFetch(`/api/receipts/reservations/?${params}`)
  const data = await readJson<{
    reservations: import('../types/domain').LinkedReservation[]
  }>(response)
  return data.reservations
}

// â”€â”€ Booking Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchBookingRequests(offset = 0, limit = 10) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  const response = await apiFetch(`/api/booking-requests/?${params}`)
  return readJson<{ pendingRequests: BookingRequestRecord[]; confirmedBookings: BookingRequestRecord[]; totalConfirmed: number }>(response)
}

export async function approveBookingRequest(id: string) {
  const response = await apiFetch(`/api/booking-requests/${id}/approve/`, { method: 'POST' })
  return readJson<{ request: BookingRequestRecord }>(response)
}

export async function rejectBookingRequest(id: string, rejectionMessage: string) {
  const response = await apiFetch(`/api/booking-requests/${id}/reject/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionMessage }),
  })
  return readJson<{ request: BookingRequestRecord }>(response)
}

// â”€â”€ Pricing Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPricingRules() {
  const response = await apiFetch('/api/pricing-rules/')
  const data = await readJson<{ pricingRules: PricingRuleRecord[] }>(response)
  return data.pricingRules
}

export async function createPricingRule(payload: PricingRulePayload) {
  const response = await apiFetch('/api/pricing-rules/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ pricingRule: PricingRuleRecord }>(response)
  return data.pricingRule
}

export async function updatePricingRule(id: string, payload: Partial<PricingRulePayload>) {
  const response = await apiFetch(`/api/pricing-rules/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ pricingRule: PricingRuleRecord }>(response)
  return data.pricingRule
}

export async function deletePricingRule(id: string) {
  const response = await apiFetch(`/api/pricing-rules/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete pricing rule.')
}

// â”€â”€ Promo Codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPromoCodes() {
  const response = await apiFetch('/api/promo-codes/')
  const data = await readJson<{ promoCodes: PromoCodeRecord[] }>(response)
  return data.promoCodes
}

export async function createPromoCode(payload: PromoCodePayload) {
  const response = await apiFetch('/api/promo-codes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ promoCode: PromoCodeRecord }>(response)
  return data.promoCode
}

export async function updatePromoCode(id: string, payload: Partial<PromoCodePayload>) {
  const response = await apiFetch(`/api/promo-codes/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ promoCode: PromoCodeRecord }>(response)
  return data.promoCode
}

export async function deletePromoCode(id: string) {
  const response = await apiFetch(`/api/promo-codes/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete promo code.')
}

// â”€â”€ Cancellation Policies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchCancellationPolicies() {
  const response = await apiFetch('/api/cancellation-policies/')
  const data = await readJson<{ policies: CancellationPolicyRecord[] }>(response)
  return data.policies
}

export async function createCancellationPolicy(payload: CancellationPolicyPayload) {
  const response = await apiFetch('/api/cancellation-policies/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ policy: CancellationPolicyRecord }>(response)
  return data.policy
}

export async function updateCancellationPolicy(id: string, payload: Partial<CancellationPolicyPayload>) {
  const response = await apiFetch(`/api/cancellation-policies/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ policy: CancellationPolicyRecord }>(response)
  return data.policy
}

export async function deleteCancellationPolicy(id: string) {
  const response = await apiFetch(`/api/cancellation-policies/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete cancellation policy.')
}

// â”€â”€ Amenities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchAmenities() {
  const response = await apiFetch('/api/amenities/')
  const data = await readJson<{ amenities: AmenityRecord[] }>(response)
  return data.amenities
}

export async function createAmenity(payload: { name: string; icon: string; sortOrder: number }) {
  const response = await apiFetch('/api/amenities/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ amenity: AmenityRecord }>(response)
  return data.amenity
}

export async function updateAmenity(id: string, payload: { name?: string; icon?: string; sortOrder?: number }) {
  const response = await apiFetch(`/api/amenities/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ amenity: AmenityRecord }>(response)
  return data.amenity
}

export async function deleteAmenity(id: string) {
  const response = await apiFetch(`/api/amenities/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete amenity.')
}

// â”€â”€ House Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchHouseRules() {
  const response = await apiFetch('/api/house-rules/')
  const data = await readJson<{ houseRules: HouseRuleRecord[] }>(response)
  return data.houseRules
}

export async function createHouseRule(payload: { text: string; sortOrder: number; active: boolean }) {
  const response = await apiFetch('/api/house-rules/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ houseRule: HouseRuleRecord }>(response)
  return data.houseRule
}

export async function updateHouseRule(id: string, payload: { text?: string; sortOrder?: number; active?: boolean }) {
  const response = await apiFetch(`/api/house-rules/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ houseRule: HouseRuleRecord }>(response)
  return data.houseRule
}

export async function deleteHouseRule(id: string) {
  const response = await apiFetch(`/api/house-rules/${id}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete house rule.')
}

// â”€â”€ Booking Site Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPmsBookingSettings() {
  const response = await apiFetch('/api/booking-settings/')
  const data = await readJson<{ settings: BookingSiteSettingsRecord }>(response)
  return data.settings
}

export async function updatePmsBookingSettings(payload: Partial<BookingSiteSettingsRecord>) {
  const response = await apiFetch('/api/booking-settings/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await readJson<{ settings: BookingSiteSettingsRecord }>(response)
  return data.settings
}

// â”€â”€ Property Photos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchPropertyPhotos(propertyId: string) {
  const response = await apiFetch(`/api/properties/${propertyId}/photos/`)
  const data = await readJson<{ photos: PropertyPhotoRecord[] }>(response)
  return data.photos
}

export async function uploadPropertyPhoto(propertyId: string, file: File, sortOrder?: number) {
  const formData = new FormData()
  formData.append('photo', file)
  if (sortOrder !== undefined) formData.append('sortOrder', String(sortOrder))
  const response = await apiFetch(`/api/properties/${propertyId}/photos/`, {
    method: 'POST',
    body: formData,
  })
  const data = await readJson<{ photo: PropertyPhotoRecord }>(response)
  return data.photo
}

export async function deletePropertyPhoto(propertyId: string, photoId: string) {
  const response = await apiFetch(`/api/properties/${propertyId}/photos/${photoId}/`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete photo.')
}

export async function reorderPropertyPhotos(propertyId: string, photos: { id: string; sortOrder: number }[]) {
  const response = await apiFetch(`/api/properties/${propertyId}/photos/reorder/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos }),
  })
  const data = await readJson<{ photos: PropertyPhotoRecord[] }>(response)
  return data.photos
}

export async function updatePropertyAmenities(propertyId: string, amenityIds: string[]) {
  const response = await apiFetch(`/api/properties/${propertyId}/amenities/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amenityIds }),
  })
  const data = await readJson<{ amenityIds: string[] }>(response)
  return data.amenityIds
}

// â”€â”€ Booking Engine Payload types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PricingRulePayload = {
  ruleType: 'long_stay' | 'seasonal' | 'last_minute' | 'minimum_nights'
  scope: 'all' | 'property' | 'bedroom_group'
  propertyId: string | null
  bedroomGroup: number | null
  enabled: boolean
  minNights: number | null
  discountPct: string | null
  daysBeforeCheckin: number | null
  startDate: string | null
  endDate: string | null
  adjustmentType: string
  adjustmentValue: string | null
}

export type PromoCodePayload = {
  code: string
  discountType: 'percentage' | 'fixed_amount'
  discountValue: string
  scope: 'all' | 'property' | 'bedroom_group'
  propertyId: string | null
  bedroomGroup: number | null
  usageLimit: number | null
  active: boolean
}

export type CancellationPolicyPayload = {
  scope: 'all' | 'property' | 'bedroom_group'
  propertyId: string | null
  bedroomGroup: number | null
  policyType: 'free' | 'partial' | 'non_refundable'
  daysBeforeCheckin: number | null
  refundPct: string | null
  autoProcess: boolean
}

export function formatApiError(error: unknown) {
  if (!error) {
    return 'The request could not be completed.'
  }
  if (typeof error === 'string') {
    return error
  }
  if (Array.isArray(error)) {
    return error.join(' ')
  }
  if (typeof error === 'object') {
    return Object.values(error)
      .flat()
      .join(' ')
  }

  return 'The request could not be completed.'
}
