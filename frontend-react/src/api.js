const API_BASE = 'http://127.0.0.1:8000/api';

function getOrCreateClientId() {
  let id = localStorage.getItem('client_id');
  if (!id) {
    id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('client_id', id);
  }
  return id;
}
const CLIENT_ID = getOrCreateClientId();

export function getClientId() {
  return CLIENT_ID;
}

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      'X-Client-Id': CLIENT_ID,
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return data;
}

export const api = {
  getChannels: async () => unwrap(await request('/channels/')),
  createChannel: (data) =>
    request('/channels/', { method: 'POST', body: JSON.stringify(data) }),
  deleteChannel: (id) =>
    request(`/channels/${id}/`, { method: 'DELETE' }),

  getMessages: async (channelId) =>
    unwrap(await request(`/channels/${channelId}/messages/`)),

  sendMessage: (channelId, { text = '', file = null, authorName = '' } = {}) => {
    const fd = new FormData();
    if (text) fd.append('text', text);
    if (file) fd.append('file', file);
    if (authorName) fd.append('author_name', authorName);
    return request(`/channels/${channelId}/send_message/`, {
      method: 'POST',
      body: fd,
    });
  },

  markRead: (messageId) =>
    request(`/messages/${messageId}/mark_read/`, { method: 'POST' }),
  markChannelRead: (channelId) =>
    request('/messages/mark_channel_read/', {
      method: 'POST',
      body: JSON.stringify({ channel: channelId }),
    }),
};
// ===== WebSocket (только текст; файлы — через HTTP send_message) =====
export function connectChatSocket(channelId, handlers = {}) {
  const url = `ws://127.0.0.1:8000/ws/chat/${channelId}/?client_id=${encodeURIComponent(CLIENT_ID)}`;
  const ws = new WebSocket(url);

  ws.onopen = () => handlers.onOpen?.();
  ws.onclose = () => handlers.onClose?.();
  ws.onerror = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try {
      handlers.onMessage?.(JSON.parse(e.data));
    } catch (err) {
      console.warn('WS parse error', err);
    }
  };

  return {
    send: (text, authorName = '') => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: text, author_name: authorName }));
        return true;
      }
      return false;
    },
    close: () => ws.close(),
  };
}