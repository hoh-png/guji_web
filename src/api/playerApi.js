const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, ...data }
  } catch {
    return { ok: false, status: 0, message: '无法连接服务器，请确认后端已启动' }
  }
}

export function getPlayerState() {
  return request('/player')
}

export function purchasePlayerItem(itemType, itemId) {
  return request('/shop/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemType, itemId }),
  })
}

export function updatePlayerProfile(profile) {
  return request('/player/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
}

export function updatePlayerLoadout(kind, itemId) {
  return request('/player/loadout', {
    method: 'PATCH',
    body: JSON.stringify({ kind, itemId }),
  })
}

export function advancePlayerRestoration(relicId, toolId) {
  return request(`/player/relics/${encodeURIComponent(relicId)}/advance`, {
    method: 'POST',
    body: JSON.stringify({ toolId }),
  })
}

export function resetPlayerRestoration(relicId) {
  return request(`/player/relics/${encodeURIComponent(relicId)}/reset`, {
    method: 'POST',
  })
}

export function exchangePlayerCurrency(kind, amount) {
  return request('/wallet/exchange', {
    method: 'POST',
    body: JSON.stringify({ kind, amount }),
  })
}

export function grantDevelopmentCurrency(kind, amount) {
  return request('/wallet/dev/grant', {
    method: 'POST',
    body: JSON.stringify({ kind, amount }),
  })
}

export function resetDevelopmentPlayer() {
  return request('/player/dev/reset', { method: 'POST' })
}
