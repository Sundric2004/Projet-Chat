import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import './index.css';

const AVATARS = [
  // Animaux
  '🐱','🐶','🦊','🐸','🐼','🐨','🦁','🐯','🐺','🦝','🐻','🐮',
  // Fantasy
  '🧙','🧜','🧚','🧝','🤖','👾','🦸','🧛','🧟','🧞','🦄','🐉',
  // Attitudes
  '😎','🥸','🤓','😈','👻','🎃','🤠','🥷','🧑‍🚀','🤡','💀','🥶',
  // Vibes
  '🌸','🔥','⚡','🌈','💎','🎮','🎸','🎨','🏆','👑','🌙','☀️'
];

const socket = io({
  auth: { serverOffset: 0 },
  autoConnect: false
});

const MAX_MESSAGE_LENGTH = 255;

const themeOptions = [
  { id: 'default', label: 'Défaut' },
  { id: 'dark', label: 'Dark' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' }
];

function App() {
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [input, setInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [username, setUsername] = useState('');

  const [chatTitle, setChatTitle] = useState('Conversation générale');
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('Conversation générale');

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const themeMenuRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentRoomRef = useRef(currentRoom);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    if (!username) return;

    socket.connect();

    const handleConnect = () => {
      setIsSocketConnected(true);
      socket.emit('set username', username);
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleRoomsList = (roomsList) => {
      setRooms(roomsList);

      setCurrentRoom((prevRoom) => {
        if (prevRoom && roomsList.some((room) => room.id === prevRoom)) {
          return prevRoom;
        }
        return roomsList.length > 0 ? roomsList[0].id : '';
      });
    };

    const handleRoomData = (roomData) => {
      setChatTitle(roomData.title);
      setTitleInput(roomData.title);
      setCurrentTheme(roomData.theme || 'default');
    };

    const handleRoomMessages = (roomMessages) => {
      setMessages(roomMessages);
    };

    const handleChatMessage = (msgObj, serverOffset) => {
      const normalizedMessage = {
        id: msgObj.id || serverOffset,
        text: msgObj.text || '',
        senderId: msgObj.senderId || 'unknown',
        timestamp: msgObj.timestamp || null,
        room: msgObj.room || '',
        clientOffset: msgObj.clientOffset || null,
        replyTo: msgObj.replyTo || null,
        pinned: msgObj.pinned || false,
        imageUrl: msgObj.imageUrl || null,
        avatar: msgObj.avatar || null
      };

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (m) =>
            (normalizedMessage.clientOffset &&
              m.clientOffset === normalizedMessage.clientOffset) ||
            (normalizedMessage.id && m.id === normalizedMessage.id)
        );

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = normalizedMessage;
          return updated;
        }

        return [...prev, normalizedMessage];
      });

      socket.auth.serverOffset = serverOffset;

      if (normalizedMessage.senderId !== username && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
    };

    const handleNotification = (msg) => {
      if (
        msg.room !== currentRoomRef.current &&
        msg.senderId !== username
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1
        }));

        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => { });
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('rooms list', handleRoomsList);
    socket.on('online users', handleOnlineUsers);
    socket.on('room data', handleRoomData);
    socket.on('room messages', handleRoomMessages);
    socket.on('chat message', handleChatMessage);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('rooms list', handleRoomsList);
      socket.off('online users', handleOnlineUsers);
      socket.off('room data', handleRoomData);
      socket.off('room messages', handleRoomMessages);
      socket.off('chat message', handleChatMessage);
      socket.off('notification', handleNotification);
      socket.disconnect();
    };
  }, [username]);

  useEffect(() => {
    if (!currentRoom || !isSocketConnected) return;

    if (currentRoom.startsWith('dm_')) {
      // Pour les DM, les messages sont gérés par handleJoinDm
      return;
    }

    socket.emit('join room', currentRoom, (response) => {
      if (!response?.ok) {
        console.error('Erreur accès au salon:', response?.error);
      }
    });
    setIsThemeMenuOpen(false);
    setReplyingTo(null);
    setIsEmojiPickerOpen(false);
  }, [currentRoom, isSocketConnected]);

  useEffect(() => {
    if (!currentRoom || rooms.length === 0) return;

    const room = rooms.find((r) => r.id === currentRoom);
    if (!room) return;

    setChatTitle(room.title);
    setTitleInput(room.title);
    setCurrentTheme(room.theme || 'default');
  }, [rooms, currentRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, replyingTo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false);
      }

      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setIsEmojiPickerOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsThemeMenuOpen(false);
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // link preview useEffect removed – feature disabled


  const escapeRegExp = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    const usernames = [...new Set(messages.map((msg) => msg.senderId).filter(Boolean))];

    if (usernames.length === 0) {
      return text;
    }

    const mentionPattern = new RegExp(
      `(@(?:${usernames.map(escapeRegExp).join('|')}))`,
      'g'
    );

    const parts = text.split(mentionPattern);

    return parts.map((part, index) => {
      if (part.startsWith('@') && usernames.includes(part.slice(1))) {
        return (
          <span key={index} className="mention-tag">
            {part}
          </span>
        );
      }

      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const handleEmojiClick = (emojiData) => {
    const nextValue = `${input}${emojiData.emoji}`.slice(0, MAX_MESSAGE_LENGTH);
    setInput(nextValue);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim());
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();

    if ((!input.trim() && !selectedImage) || !currentRoom || !isSocketConnected) return;

    let imageUrl = null;
    if (selectedImage) {
      const formData = new FormData();
      formData.append('image', selectedImage);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.imageUrl) {
          imageUrl = data.imageUrl;
        }
      } catch (err) {
        console.error('Erreur upload:', err);
        alert('Erreur lors de l\'envoi de l\'image');
        return;
      }
    }

    const trimmedText = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    const clientOffset = `${socket.id}-${Date.now()}`;

    const optimisticMessage = {
      id: `temp-${clientOffset}`,
      text: trimmedText,
      senderId: username,
      timestamp: new Date().toISOString(),
      room: currentRoom,
      clientOffset,
      replyTo: replyingTo,
      pinned: false,
      imageUrl,
      avatar
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    socket.emit(
      'chat message',
      {
        text: trimmedText,
        senderId: username,
        room: currentRoom,
        replyTo: replyingTo,
        imageUrl,
        avatar
      },
      clientOffset
    );

    setInput('');
    setSelectedImage(null);
    setReplyingTo(null);
    setIsEmojiPickerOpen(false);
  };

  const handleTitleSave = () => {
    if (titleInput.trim() && currentRoom) {
      socket.emit('update title', {
        roomId: currentRoom,
        title: titleInput.trim()
      });

      setIsEditingTitle(false);
    }
  };

  const handleThemeChange = (themeId) => {
    if (!currentRoom) return;

    socket.emit('update theme', {
      roomId: currentRoom,
      theme: themeId
    });

    setIsThemeMenuOpen(false);
  };

  const handleRoomClick = (roomId) => {
    setCurrentRoom(roomId);
    setMessages([]);
    setUnreadCounts((prev) => ({ ...prev, [roomId]: 0 }));
    setIsEditingTitle(false);
    setIsThemeMenuOpen(false);
    setReplyingTo(null);
    setIsEmojiPickerOpen(false);
    setIsSidebarOpen(false); // Sur mobile, ouvrir un salon ferme la sidebar
  };

  const handleJoinDm = (targetUsername) => {
    if (targetUsername === username) return;

    setMessages([]); // Vide la conversation actuelle immédiatement, comme handleRoomClick

    socket.emit('join dm', targetUsername, (response) => {
      if (response?.ok && response.roomId) {
        setCurrentRoom(response.roomId);
        setUnreadCounts((prev) => ({ ...prev, [response.roomId]: 0 }));
        setIsEditingTitle(false);
        setIsThemeMenuOpen(false);
        setReplyingTo(null);
        setIsEmojiPickerOpen(false);
        setIsSidebarOpen(false);
      } else {
        alert(response?.error || 'Impossible de rejoindre la conversation privée');
      }
    });
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();

    if (!newRoomTitle.trim()) return;

    socket.emit('create room', newRoomTitle.trim(), (response) => {
      if (response?.ok && response.room) {
        setCurrentRoom(response.room.id);
        setMessages([]);
        setNewRoomTitle('');
        setIsCreatingRoom(false);
        setIsSidebarOpen(false); // Sur mobile, la création bascule sur le chat
      } else {
        alert(response?.error || 'Impossible de créer le salon');
      }
    });
  };

  const handleTogglePin = (messageId) => {
    if (!currentRoom || !messageId) return;

    if (typeof messageId === 'string' && messageId.startsWith('temp-')) {
      return;
    }

    socket.emit('toggle pin message', {
      roomId: currentRoom,
      messageId
    });
  };

  const pinnedMessage = messages.find((msg) => msg.pinned);

  const filteredRooms = rooms.filter((room) =>
    room.title.toLowerCase().includes((roomSearchQuery || '').toLowerCase())
  );

  if (!username) {
    return (
      <div className="login-container">
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <h2>Join the Chat</h2>

          <div className="avatar-selected-preview">
            <span className="avatar-selected-emoji">{avatar}</span>
            <span className="avatar-selected-label">Ton avatar</span>
          </div>

          <div className="avatar-picker-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={`avatar-picker-item ${avatar === a ? 'active' : ''}`}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Entre ton pseudo"
            autoFocus
          />
          <button type="submit" disabled={!usernameInput.trim()}>
            Join
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`app-container with-sidebar theme-${currentTheme} ${isSidebarOpen ? 'mobile-view-sidebar' : 'mobile-view-chat'}`}>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <aside className="rooms-sidebar">
        <div className="sidebar-user-info">
          <AvatarPrimitive.Root className="avatar-root avatar-root-lg">
            <AvatarPrimitive.Fallback className="avatar-fallback avatar-fallback-lg">
              {avatar}
            </AvatarPrimitive.Fallback>
          </AvatarPrimitive.Root>
          <span className="sidebar-username">{username}</span>
        </div>
        <div className="rooms-search-container" style={{ padding: '0 1rem 1rem 1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <input
            type="text"
            className="rooms-search-input"
            placeholder="Rechercher un salon ou contact..."
            value={roomSearchQuery}
            onChange={(e) => setRoomSearchQuery(e.target.value)}
          />
        </div>

        <div className="rooms-sidebar-header">
          <h2>Salons</h2>
          <button
            type="button"
            className="new-room-btn"
            onClick={() => setIsCreatingRoom((prev) => !prev)}
          >
            + Nouveau
          </button>
        </div>

        {isCreatingRoom && (
          <form className="new-room-form" onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              placeholder="Nom du salon"
              className="new-room-input"
              maxLength={40}
            />
            <button
              type="submit"
              className="new-room-submit"
              disabled={!newRoomTitle.trim()}
            >
              Créer
            </button>
          </form>
        )}



        <div className="rooms-list">
          {filteredRooms.map((room) => {
            const hasUnread = unreadCounts[room.id] > 0;
            return (
              <button
                key={room.id}
                type="button"
                className={`room-item ${currentRoom === room.id ? 'active' : ''}`}
                onClick={() => handleRoomClick(room.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.title}</span>
                  {hasUnread && (
                    <span className="unread-badge">{unreadCounts[room.id]}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rooms-sidebar-header" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
          <h2>En ligne</h2>
        </div>

        <div className="rooms-list">
          {onlineUsers
            .filter((u) => u !== username && u.toLowerCase().includes((roomSearchQuery || '').toLowerCase()))
            .map((user) => {
              const dmRoomId = `dm_${[username, user].sort().join('_')}`;
              const isActive = currentRoom === dmRoomId;
              const hasUnread = unreadCounts[dmRoomId] > 0;
              return (
                <button
                  key={user}
                  type="button"
                  className={`room-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleJoinDm(user)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ color: '#10b981', marginRight: '6px' }}>●</span> {user}
                    </span>
                    {hasUnread && (
                      <span className="unread-badge">{unreadCounts[dmRoomId]}</span>
                    )}
                  </div>
                </button>
              );
            })}
          {onlineUsers.filter((u) => u !== username).length === 0 && (
            <div style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Personne d'autre.
            </div>
          )}
        </div>
      </aside>

      <div className="chat-window">
        <header className="chat-header">
          <div className="chat-title-area">
            <button
              className="mobile-back-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Retour aux salons"
            >
              ←
            </button>
            {isEditingTitle ? (
              <div className="title-edit-box">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="title-input"
                  maxLength={40}
                />
                <button
                  type="button"
                  className="title-btn"
                  onClick={handleTitleSave}
                >
                  OK
                </button>
              </div>
            ) : (
              <h1 onClick={() => setIsEditingTitle(true)}>
                {chatTitle}
              </h1>
            )}
          </div>

          <div className="header-actions">
            <div className="theme-menu-wrapper" ref={themeMenuRef}>
              <button
                type="button"
                className="theme-icon-btn"
                onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                title="Changer le thème"
              >
                🎨
              </button>

              {isThemeMenuOpen && (
                <div className="theme-popover">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                      onClick={() => handleThemeChange(theme.id)}
                    >
                      <span className={`theme-preview theme-preview-${theme.id}`}></span>
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="status-indicator"></span>
          </div>
        </header>

        {pinnedMessage && (
          <button
            type="button"
            className="pinned-banner pinned-banner-button"
            onClick={() => handleTogglePin(pinnedMessage.id)}
            title="Cliquer pour désépingler"
          >
            <div className="pinned-banner-label">Message épinglé — cliquer pour désépingler</div>
            <div className="pinned-banner-text">
              <strong>{pinnedMessage.senderId}</strong> : {pinnedMessage.text}
            </div>
          </button>
        )}

        <ul className="messages-list">
          {messages.map((msg, index) => {
            const isMine = msg.senderId === username;
            const isTemporary =
              typeof msg.id === 'string' && msg.id.startsWith('temp-');

            return (
              <li
                key={msg.id || index}
                className={`message-item ${isMine ? 'mine' : 'other'}`}
                onDoubleClick={() =>
                  setReplyingTo({
                    id: msg.id,
                    text: msg.text,
                    senderId: msg.senderId
                  })
                }
              >
                <div className="message-bubble-wrapper">
                  <div className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
                    {!isMine && (
                      <div className="sender-info">
                        <AvatarPrimitive.Root className="avatar-root">
                          <AvatarPrimitive.Fallback className="avatar-fallback">
                            {msg.avatar || '👤'}
                          </AvatarPrimitive.Fallback>
                        </AvatarPrimitive.Root>
                        <span className="sender-name">{msg.senderId}</span>
                      </div>
                    )}

                    {msg.pinned && <div className="pinned-badge">Épinglé</div>}

                    {msg.replyTo && (
                      <div className="reply-snippet">
                        <strong>{msg.replyTo.senderId}</strong>
                        <span>{msg.replyTo.text}</span>
                      </div>
                    )}

                    <div className="message-text">{renderMessageText(msg.text)}</div>

                    {msg.imageUrl && (
                      <div className="message-image-container">
                        <img src={msg.imageUrl} alt="upload" className="message-image" />
                      </div>
                    )}


                    <div className="message-time">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : ''}
                    </div>
                  </div>

                  {!isTemporary && (
                    <button
                      type="button"
                      className={`pin-mini-btn ${msg.pinned ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(msg.id);
                      }}
                      title={msg.pinned ? 'Désépingler' : 'Épingler'}
                    >
                      •
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          <div ref={messagesEndRef} />
        </ul>

        {replyingTo && (
          <div className="reply-preview">
            <div className="reply-preview-content">
              <strong>Réponse à {replyingTo.senderId}</strong>
              <span>{replyingTo.text}</span>
            </div>

            <button
              type="button"
              className="reply-cancel-btn"
              onClick={() => setReplyingTo(null)}
            >
              ✕
            </button>
          </div>
        )}

        <form className="chat-form" onSubmit={handleMessageSubmit}>
          <div className="chat-input-wrapper">
            <div className="chat-input-row">
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder={isSocketConnected ? 'Type your message...' : 'Connexion au serveur...'}
                autoComplete="off"
                maxLength={MAX_MESSAGE_LENGTH}
              />

              <div className="emoji-picker-container" ref={emojiPickerRef}>
                <button
                  type="button"
                  className="emoji-toggle-btn"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                >
                  😊
                </button>

                {isEmojiPickerOpen && (
                  <div className="emoji-picker-popover">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={currentTheme === 'dark' ? 'dark' : 'light'}
                      width={window.innerWidth <= 768 ? Math.min(window.innerWidth - 16, 350) : 320}
                      height={window.innerWidth <= 768 ? 340 : 380}
                    />
                  </div>
                )}
              </div>
              <div className="image-upload-container">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  className="image-upload-btn emoji-toggle-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Envoyer une image"
                  style={{ marginLeft: '4px' }}
                >
                  📷
                </button>
              </div>

            </div>

            {selectedImage && (
              <div className="selected-image-preview">
                <span className="selected-image-name">📎 {selectedImage.name}</span>
                <button
                  type="button"
                  className="selected-image-clear"
                  onClick={() => setSelectedImage(null)}
                  title="Annuler"
                >✕</button>
              </div>
            )}

            <div className="message-length-counter">
              {input.length}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>

          <button
            type="submit"
            className="chat-submit"
            disabled={(!input.trim() && !selectedImage) || !currentRoom || !isSocketConnected}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;