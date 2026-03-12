import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import multer from 'multer';

const MESSAGES_FILE = 'messages.json';
const ROOMS_FILE = 'rooms.json';
const MAX_MESSAGE_LENGTH = 255;

async function readMessages() {
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(MESSAGES_FILE, '[]');
      return [];
    }
    throw error;
  }
}

async function writeMessages(messages) {
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

async function readRooms() {
  try {
    const data = await fs.readFile(ROOMS_FILE, 'utf8');
    const rooms = JSON.parse(data);

    return rooms.map((room) => ({
      ...room,
      theme: room.theme || 'default'
    }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      const defaultRooms = [
        {
          id: 'room-1',
          title: 'Conversation générale',
          theme: 'default'
        }
      ];
      await fs.writeFile(ROOMS_FILE, JSON.stringify(defaultRooms, null, 2));
      return defaultRooms;
    }
    throw error;
  }
}

async function writeRooms(rooms) {
  await fs.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2));
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use(express.static(join(__dirname, 'client/dist')));

// Configuration de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, 'uploads');
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'tmp';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

const connectedUsers = new Map(); // socket.id -> username

function broadcastOnlineUsers() {
  const users = Array.from(new Set(connectedUsers.values()));
  io.emit('online users', users);
}

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'));
});

// Link preview endpoint removed – service deprecated

io.on('connection', async (socket) => {
  try {
    const rooms = await readRooms();
    socket.emit('rooms list', rooms);
    socket.emit('online users', Array.from(new Set(connectedUsers.values())));
  } catch (e) {
    console.error('Erreur lecture salons :', e);
  }

  socket.on('set username', (username) => {
    if (!username || typeof username !== 'string') return;
    socket.data.username = username;
    connectedUsers.set(socket.id, username);
    broadcastOnlineUsers();
  });

  socket.on('disconnect', () => {
    if (connectedUsers.has(socket.id)) {
      connectedUsers.delete(socket.id);
      broadcastOnlineUsers();
    }
  });

  socket.on('join room', async (roomId, callback) => {
    try {
      const rooms = await readRooms();
      const room = rooms.find((r) => r.id === roomId);

      if (!room) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Room not found' });
        }
        return;
      }

      if (socket.data.currentRoom) {
        socket.leave(socket.data.currentRoom);
      }

      socket.join(roomId);
      socket.data.currentRoom = roomId;

      socket.emit('room data', {
        title: room.title,
        theme: room.theme || 'default'
      });

      const messages = await readMessages();
      const roomMessages = messages.filter((m) => m.room === roomId);
      socket.emit('room messages', roomMessages);

      if (typeof callback === 'function') {
        callback({ ok: true, roomId });
      }
    } catch (e) {
      console.error('Erreur join room :', e);
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'Join room failed' });
      }
    }
  });

  socket.on('join dm', async (targetUsername, callback) => {
    try {
      if (!socket.data.username) {
        if (typeof callback === 'function') callback({ ok: false, error: 'Non authentifié' });
        return;
      }

      const myUsername = socket.data.username;
      // Trier alphabétiquement pour avoir toujours le même ID de salon entre les deux mêmes utilisateurs
      const participants = [myUsername, targetUsername].sort();
      const dmRoomId = `dm_${participants[0]}_${participants[1]}`;

      if (socket.data.currentRoom) {
        socket.leave(socket.data.currentRoom);
      }

      socket.join(dmRoomId);
      socket.data.currentRoom = dmRoomId;

      socket.emit('room data', {
        title: `MP : ${targetUsername}`,
        theme: 'default'
      });

      const messages = await readMessages();
      const roomMessages = messages.filter((m) => m.room === dmRoomId);
      socket.emit('room messages', roomMessages);

      if (typeof callback === 'function') {
        callback({ ok: true, roomId: dmRoomId });
      }
    } catch (e) {
      console.error('Erreur join dm :', e);
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'Join dm failed' });
      }
    }
  });

  socket.on('create room', async (title, callback) => {
    try {
      const cleanTitle = title?.trim();

      if (!cleanTitle) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Titre vide' });
        }
        return;
      }

      const rooms = await readRooms();

      const alreadyExists = rooms.find(
        (room) => room.title.toLowerCase() === cleanTitle.toLowerCase()
      );

      if (alreadyExists) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Un salon porte déjà ce nom' });
        }
        return;
      }

      const newRoom = {
        id: `room-${Date.now()}`,
        title: cleanTitle,
        theme: 'default'
      };

      const updatedRooms = [...rooms, newRoom];
      await writeRooms(updatedRooms);

      io.emit('rooms list', updatedRooms);

      if (typeof callback === 'function') {
        callback({ ok: true, room: newRoom });
      }
    } catch (e) {
      console.error('Erreur création salon :', e);
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'Création impossible' });
      }
    }
  });

  socket.on('update theme', async ({ roomId, theme }) => {
    try {
      const cleanTheme = theme?.trim();
      if (!cleanTheme) return;

      const allowedThemes = ['default', 'dark', 'ocean', 'sunset', 'forest'];
      if (!allowedThemes.includes(cleanTheme)) return;

      const rooms = await readRooms();

      const updatedRooms = rooms.map((room) =>
        room.id === roomId ? { ...room, theme: cleanTheme } : room
      );

      await writeRooms(updatedRooms);

      const updatedRoom = updatedRooms.find((room) => room.id === roomId);
      if (!updatedRoom) return;

      io.emit('rooms list', updatedRooms);
      io.to(roomId).emit('room data', {
        title: updatedRoom.title,
        theme: updatedRoom.theme
      });
    } catch (e) {
      console.error('Erreur mise à jour thème :', e);
    }
  });

  socket.on('toggle pin message', async ({ roomId, messageId }) => {
    try {
      const messages = await readMessages();

      const targetMessage = messages.find(
        (m) => m.id === messageId && m.room === roomId
      );

      if (!targetMessage) return;

      const willBePinned = !targetMessage.pinned;

      const updatedMessages = messages.map((m) => {
        if (m.room !== roomId) return m;

        if (m.id === messageId) {
          return { ...m, pinned: willBePinned };
        }

        if (willBePinned) {
          return { ...m, pinned: false };
        }

        return m;
      });

      await writeMessages(updatedMessages);

      const roomMessages = updatedMessages.filter((m) => m.room === roomId);
      io.to(roomId).emit('room messages', roomMessages);
    } catch (e) {
      console.error('Erreur pin message :', e);
    }
  });

  socket.on('chat message', async (msg, clientOffset, callback) => {
    let matchedId = -1;
    let newMessage;

    try {
      const messages = await readMessages();
      const existingMessage = messages.find((m) => m.clientOffset === clientOffset);

      if (existingMessage) {
        if (typeof callback === 'function') callback();
        return;
      }

      const roomId = msg.room || socket.data.currentRoom;

      if (!roomId) {
        if (typeof callback === 'function') callback();
        return;
      }

      const safeText =
        typeof msg.text === 'string'
          ? msg.text.trim().slice(0, MAX_MESSAGE_LENGTH)
          : '';

      const safeImageUrl =
        typeof msg.imageUrl === 'string' && msg.imageUrl.startsWith('/uploads/')
          ? msg.imageUrl
          : null;

      // Rejeter si ni texte ni image
      if (!safeText && !safeImageUrl) {
        if (typeof callback === 'function') callback();
        return;
      }

      newMessage = {
        id: messages.length ? messages[messages.length - 1].id + 1 : 1,
        text: safeText,
        senderId: msg.senderId || 'unknown',
        room: roomId,
        timestamp: new Date().toISOString(),
        clientOffset,
        replyTo: msg.replyTo || null,
        pinned: false,
        imageUrl: safeImageUrl,
        avatar: typeof msg.avatar === 'string' ? msg.avatar : null
      };

      messages.push(newMessage);
      await writeMessages(messages);
      matchedId = newMessage.id;
    } catch (e) {
      console.error('Erreur envoi message :', e);
      return;
    }

    io.to(newMessage.room).emit('chat message', newMessage, matchedId);

    // Système de notification globale
    const isDM = newMessage.room.startsWith('dm_');
    if (!isDM) {
      socket.broadcast.emit('notification', newMessage);
    } else {
      const parts = newMessage.room.replace('dm_', '').split('_');
      const targetUser = parts.find((u) => u !== newMessage.senderId);
      if (targetUser) {
        let targetSocketId = null;
        for (const [sId, uname] of connectedUsers.entries()) {
          if (uname === targetUser) {
            targetSocketId = sId;
            break;
          }
        }
        if (targetSocketId) {
          io.to(targetSocketId).emit('notification', newMessage);
        }
      }
    }

    if (typeof callback === 'function') callback();
  });

  socket.on('update title', async ({ roomId, title }) => {
    try {
      const cleanTitle = title?.trim();
      if (!cleanTitle) return;

      const rooms = await readRooms();

      const duplicateRoom = rooms.find(
        (room) =>
          room.id !== roomId &&
          room.title.toLowerCase() === cleanTitle.toLowerCase()
      );

      if (duplicateRoom) return;

      const updatedRooms = rooms.map((room) =>
        room.id === roomId ? { ...room, title: cleanTitle } : room
      );

      await writeRooms(updatedRooms);

      const updatedRoom = updatedRooms.find((room) => room.id === roomId);
      if (!updatedRoom) return;

      io.emit('rooms list', updatedRooms);
      io.to(roomId).emit('room data', {
        title: updatedRoom.title,
        theme: updatedRoom.theme || 'default'
      });
    } catch (e) {
      console.error('Erreur mise à jour titre salon :', e);
    }
  });

  if (!socket.recovered) {
    try {
      const rooms = await readRooms();
      socket.emit('rooms list', rooms);
    } catch (e) {
      console.error('Erreur récupération salons :', e);
    }
  }
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`server running at http://localhost:${port}`);
});