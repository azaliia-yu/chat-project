const API_BASE = 'http://127.0.0.1:8000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  // DELETE возвращает 204 без тела — читать JSON нельзя
  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return data;
}

export const api = {
  getChannels: async () => unwrap(await request('/channels/')),
  createChannel: (data) =>
    request('/channels/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteChannel: (id) =>
    request(`/channels/${id}/`, { method: 'DELETE' }),

  getMessages: async (channelId) =>
    unwrap(await request(`/channels/${channelId}/messages/`)),
  sendMessage: (channelId, text) =>
    request(`/channels/${channelId}/send_message/`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};