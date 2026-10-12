import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { api } from '../api';
import './Chat.css';

interface Channel {
  id: number;
  name: string;
  description: string;
  messages_count: number;
}

interface Message {
  id: number;
  channel: number;
  author: number | null;
  author_username: string | null;
  text: string;
  created_at: string;
}

export default function Chat() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [myMessageIds, setMyMessageIds] = useState<Set<number>>(() => new Set());
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newChannelInputRef = useRef<HTMLInputElement>(null);

  // Загружаем каналы
  useEffect(() => {
    loadChannels();
  }, []);

  // Загружаем сообщения + polling
  useEffect(() => {
    if (!activeChannel) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchMessages() {
      try {
        const data = await api.getMessages(activeChannel!.id);
        if (!cancelled) setMessages(data);
      } catch (e: any) {
        if (e.message && e.message.includes('404')) {
          if (!cancelled) {
            setActiveChannel(null);
            setMessages([]);
            setShowChat(false);
          }
          if (timer) clearInterval(timer);
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
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
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
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = (newChannelInputRef.current?.value || '').trim();
    if (!name) return;
    try {
      const created = await api.createChannel({ name, description: '' });
      if (newChannelInputRef.current) newChannelInputRef.current.value = '';
      const fresh = await api.getChannels();
      setChannels(fresh);
      const exists = fresh.find((c: Channel) => c.id === created.id);
      if (exists) {
        setActiveChannel(exists);
        setShowChat(true);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteChannel(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Удалить канал?')) return;
    try {
      await api.deleteChannel(id);
      if (activeChannel?.id === id) {
        setActiveChannel(null);
        setMessages([]);
        setShowChat(false);
      }
      const fresh = await api.getChannels();
      setChannels(fresh);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openChannel(ch: Channel) {
    setActiveChannel(ch);
    setShowChat(true);
  }

  function goBack() {
    setShowChat(false);
    setActiveChannel(null);
    setMessages([]);
  }

  // ---------- Экран чата ----------
  if (showChat && activeChannel) {
    return (
      <div className="m-chat">
        <header className="m-chat-header">
          <button className="m-back-btn" onClick={goBack}>←</button>
          <div className="m-chat-avatar">
            {activeChannel.name[0]?.toUpperCase() || '#'}
          </div>
          <div className="m-chat-info">
            <div className="m-chat-title">{activeChannel.name}</div>
            <div className="m-chat-subtitle">
              {activeChannel.description || 'Без описания'}
            </div>
          </div>
        </header>

        <div className="m-messages">
          {messages.map((m) => {
            const isMine = myMessageIds.has(m.id) || m.author === 1;
            return (
              <div
                key={m.id}
                className={`m-message ${isMine ? 'm-message-mine' : 'm-message-other'}`}
              >
                {!isMine && (
                  <div className="m-message-author">
                    {m.author_username || 'Аноним'}
                  </div>
                )}
                <div className="m-message-text">{m.text}</div>
                <div className="m-message-time">
                  {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="m-empty-messages">
              Нет сообщений. Напишите первое!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="m-message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">→</button>
        </form>

        {error && (
          <div className="m-error-toast" onClick={() => setError(null)}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ---------- Экран списка каналов ----------
  return (
    <div className="m-channels">
      <header className="m-channels-header">
        <h1>Чаты</h1>
      </header>

      <form className="m-new-channel-form" onSubmit={handleCreateChannel}>
        <input
          ref={newChannelInputRef}
          type="text"
          placeholder="Новый канал..."
        />
        <button type="submit">+</button>
      </form>

      <ul className="m-channel-list">
        {channels.map((ch) => (
          <li
            key={ch.id}
            className="m-channel-item"
            onClick={() => openChannel(ch)}
          >
            <div className="m-channel-avatar">
              {ch.name[0]?.toUpperCase() || '#'}
            </div>
            <div className="m-channel-info">
              <div className="m-channel-name">{ch.name}</div>
              <div className="m-channel-preview">
                {ch.messages_count} сообщ.
              </div>
            </div>
            <button
              type="button"
              className="m-delete-channel"
              onClick={(e) => handleDeleteChannel(ch.id, e)}
              title="Удалить"
            >
              ×
            </button>
          </li>
        ))}
        {channels.length === 0 && (
          <li className="m-empty-hint">Нет каналов. Создайте первый.</li>
        )}
      </ul>

      {error && (
        <div className="m-error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}