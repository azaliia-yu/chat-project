import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { api, connectChatSocket, getClientId } from '../api';
import './Chat.css';

interface Channel {
  id: number;
  name: string;
  description: string;
  messages_count: number;
  is_public?: boolean;
  last_message?: {
    id: number;
    text: string;
    file_name: string;
    created_at: string;
  } | null;
  unread_count?: number;
}

interface Message {
  id: number;
  channel: number;
  author_client_id: string;
  author_name: string;
  text: string;
  file_url: string | null;
  file_name: string;
  file_size: number;
  created_at: string;
  is_read?: boolean;
  is_mine?: boolean;
}

interface SocketHandle {
  send: (text: string, authorName?: string) => boolean;
  close: () => void;
}

export default function Chat() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newChannelInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<SocketHandle | null>(null);

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
      } catch (e: any) {
        if (e.message && e.message.includes('404')) {
          if (!cancelled) {
            setActiveChannel(null);
            setMessages([]);
            setShowChat(false);
          }
        }
      }
    })();

    // 2) WebSocket для новых сообщений
    socketRef.current = connectChatSocket(activeChannel.id, {
      onMessage: (data: any) => {
        const myId = getClientId();
        const newMsg: Message = {
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
      onError: (e: any) => console.warn('WS error', e),
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
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
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
        // только текст — через WebSocket; fallback на HTTP
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
    setFile(null);
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
            const isMine = m.is_mine === true;
            return (
              <div
                key={m.id}
                className={`m-message ${isMine ? 'm-message-mine' : 'm-message-other'}`}
              >
                {!isMine && (
                  <div className="m-message-author">
                    {m.author_name || 'Аноним'}
                  </div>
                )}

                {m.file_url && (
                  <a
                    className="m-message-file"
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    📎 {m.file_name || 'файл'}
                  </a>
                )}

                {m.text && <div className="m-message-text">{m.text}</div>}

                <div className="m-message-time">
                  {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isMine && (
                    <span className={`m-ticks ${m.is_read ? 'read' : ''}`}>
                      {m.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
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
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="m-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Прикрепить файл"
          >
            📎
          </button>
          <input
            type="text"
            placeholder="Сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">→</button>
        </form>

        {file && (
          <div className="m-file-chip">
            {file.name}
            <span
              className="m-file-chip-x"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ×
            </span>
          </div>
        )}

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
                {ch.last_message?.text ||
                  (ch.last_message?.file_name
                    ? `📎 ${ch.last_message.file_name}`
                    : `${ch.messages_count} сообщ.`)}
              </div>
            </div>
            {(ch.unread_count ?? 0) > 0 && (
              <span className="m-unread-badge">{ch.unread_count}</span>
            )}
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