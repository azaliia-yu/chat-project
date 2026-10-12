import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './App.css';

export default function App() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const [myMessageIds, setMyMessageIds] = useState(() => new Set());

  const messagesEndRef = useRef(null);
  const newChannelInputRef = useRef(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    let cancelled = false;
    let timer = null;

    async function fetchMessages() {
      try {
        const data = await api.getMessages(activeChannel.id);
        if (!cancelled) setMessages(data);
      } catch (e) {
        // Если канал удалён — сбрасываем его и прекращаем опрос
        if (e.message && e.message.includes('404')) {
          if (!cancelled) {
            console.warn('Канал удалён, сбрасываем активный');
            setActiveChannel(null);
            setMessages([]);
          }
          if (timer) clearInterval(timer);
        } else if (!cancelled) {
          console.warn('Ошибка загрузки сообщений:', e.message);
        }
      }
    }

    fetchMessages();
    timer = setInterval(fetchMessages, 3000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
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
    if (!text || !activeChannel) return;

    try {
      const sent = await api.sendMessage(activeChannel.id, text);
      setNewMessage('');
      if (sent && sent.id) {
        setMyMessageIds((prev) => {
          const next = new Set(prev);
          next.add(sent.id);
          return next;
        });
      }
      const data = await api.getMessages(activeChannel.id);
      setMessages(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    const name = (newChannelInputRef.current?.value || '').trim();
    console.log('=== SUBMIT ===');
    console.log('name from input =', JSON.stringify(name));
    if (!name) return;
    try {
      const created = await api.createChannel({ name, description: '' });
      console.log('CREATED =', created);
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
      // Сбрасываем активный, если удалили его
      if (activeChannel?.id === id) {
        setActiveChannel(null);
        setMessages([]);
      }
      // Перезагружаем список и автовыбираем первый канал
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
                  {ch.messages_count} сообщ.
                </div>
              </div>
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
                const isMine = myMessageIds.has(m.id) || m.author === 1;
                return (
                  <div
                    key={m.id}
                    className={`message ${isMine ? 'message-mine' : 'message-other'}`}
                  >
                    {!isMine && (
                      <div className="message-author">
                        {m.author_username || 'Аноним'}
                      </div>
                    )}
                    <div className="message-text">{m.text}</div>
                    <div className="message-time">
                      {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
                type="text"
                placeholder="Написать сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                autoFocus
              />
              <button type="submit">Отправить</button>
            </form>
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