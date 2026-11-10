import { useEffect, useRef, useState } from 'react';
import { api, connectChatSocket, getClientId } from './api';
import './App.css';

export default function App() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const newChannelInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadChannels();
  }, []);

  // WebSocket + первичная загрузка истории при смене канала
  useEffect(() => {
    if (!activeChannel) return;
    let cancelled = false;

    // 1) история
    (async () => {
      try {
        const data = await api.getMessages(activeChannel.id);
        if (!cancelled) setMessages(data);
        api.markChannelRead(activeChannel.id).catch(() => {});
      } catch (e) {
        if (e.message && e.message.includes('404')) {
          if (!cancelled) {
            console.warn('Канал удалён, сбрасываем активный');
            setActiveChannel(null);
            setMessages([]);
          }
        } else if (!cancelled) {
          console.warn('Ошибка загрузки сообщений:', e.message);
        }
      }
    })();

    // 2) WebSocket для новых сообщений
    socketRef.current = connectChatSocket(activeChannel.id, {
      onMessage: (data) => {
        const myId = getClientId();
        const newMsg = {
          id: data.id,
          channel: activeChannel.id,
          author_client_id: data.author_client_id,
          author_name: data.author_name,
          text: data.message,
          file_url: null,
          file_name: '',
          file_size: 0,
          created_at: new Date().toISOString(),
          is_mine: data.author_client_id === myId,
          is_read: false,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      onError: (e) => console.warn('WS error', e),
    });

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChannels() {
    try {
      const data = await api.getChannels();
      setChannels(data);
      if (data.length > 0) {
        const stillExists = data.find((c) => c.id === activeChannel?.id);
        if (!stillExists) setActiveChannel(data[0]);
      } else {
        setActiveChannel(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = newMessage.trim();
    if ((!text && !file) || !activeChannel) return;

    try {
      const authorName = localStorage.getItem('author_name') || '';

      if (file) {
        // файл + текст — только HTTP (multipart)
        await api.sendMessage(activeChannel.id, { text, file, authorName });
        const data = await api.getMessages(activeChannel.id);
        setMessages(data);
      } else {
        // только текст — через WebSocket; если сокет не открыт — HTTP fallback
        const ok = socketRef.current?.send(text, authorName);
        if (!ok) {
          await api.sendMessage(activeChannel.id, { text, authorName });
          const data = await api.getMessages(activeChannel.id);
          setMessages(data);
        }
      }

      setNewMessage('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    const name = (newChannelInputRef.current?.value || '').trim();
    if (!name) return;

    try {
      const created = await api.createChannel({ name, description: '' });
      if (newChannelInputRef.current) newChannelInputRef.current.value = '';
      await loadChannels();
      if (created && created.id) setActiveChannel(created);
    } catch (err) {
      console.error('ERROR =', err);
      setError(err.message);
    }
  }

  async function handleDeleteChannel(id, e) {
    e.stopPropagation();
    if (!confirm('Удалить канал?')) return;

    try {
      await api.deleteChannel(id);
      if (activeChannel?.id === id) {
        setActiveChannel(null);
        setMessages([]);
      }
      const fresh = await api.getChannels();
      setChannels(fresh);
      if (fresh.length > 0) {
        setActiveChannel(fresh[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Каналы</h2>
        </div>

        <form className="new-channel-form" onSubmit={handleCreateChannel}>
          <input
            ref={newChannelInputRef}
            type="text"
            placeholder="Новый канал..."
          />
          <button type="submit" title="Создать">+</button>
        </form>

        <ul className="channel-list">
          {channels.map((ch) => (
            <li
              key={ch.id}
              className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChannel(ch)}
            >
              <div className="channel-avatar">
                {ch.name[0]?.toUpperCase() || '#'}
              </div>
              <div className="channel-info">
                <div className="channel-name">{ch.name}</div>
                <div className="channel-preview">
                  {ch.last_message?.text ||
                    (ch.last_message?.file_name
                      ? `📎 ${ch.last_message.file_name}`
                      : `${ch.messages_count} сообщ.`)}
                </div>
              </div>
              {(ch.unread_count ?? 0) > 0 && (
                <span className="unread-badge">{ch.unread_count}</span>
              )}
              <button
                type="button"
                className="delete-channel"
                onClick={(e) => handleDeleteChannel(ch.id, e)}
                title="Удалить"
              >
                ×
              </button>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="empty-hint">Нет каналов. Создайте первый.</li>
          )}
        </ul>
      </aside>

      <main className="chat-area">
        {activeChannel ? (
          <>
            <header className="chat-header">
              <div className="channel-avatar large">
                {activeChannel.name[0]?.toUpperCase() || '#'}
              </div>
              <div>
                <div className="chat-title">{activeChannel.name}</div>
                <div className="chat-subtitle">
                  {activeChannel.description || 'Без описания'}
                </div>
              </div>
            </header>

            <div className="messages">
              {messages.map((m) => {
                const isMine = m.is_mine === true;
                return (
                  <div
                    key={m.id}
                    className={`message ${isMine ? 'message-mine' : 'message-other'}`}
                  >
                    {!isMine && (
                      <div className="message-author">
                        {m.author_name || 'Аноним'}
                      </div>
                    )}

                    {m.file_url && (
                      <a
                        className="message-file"
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📎 {m.file_name || 'файл'}
                      </a>
                    )}

                    {m.text && <div className="message-text">{m.text}</div>}

                    <div className="message-time">
                      {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isMine && (
                        <span className={`ticks ${m.is_read ? 'read' : ''}`}>
                          {m.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="empty-messages">
                  Нет сообщений. Напишите первое!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Прикрепить файл"
              >
                📎
              </button>
              <input
                type="text"
                placeholder="Написать сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                autoFocus
              />
              <button type="submit">Отправить</button>
            </form>

            {file && (
              <div className="file-chip">
                {file.name}
                <span
                  className="file-chip-x"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ×
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="no-channel">
            <h2>Выберите канал</h2>
            <p>или создайте новый слева</p>
          </div>
        )}
      </main>

      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          {error} (клик — закрыть)
        </div>
      )}
    </div>
  );
}