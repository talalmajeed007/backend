const { userStore } = require('../routes/auth');
const { messageStore } = require('../routes/messages');

const setupSocketHandlers = (io) => {
  const getDmRoomId = (userA, userB) => {
    const [a, b] = [userA, userB].sort();
    return `dm:${a}:${b}`;
  };
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user login
    socket.on('user_login', async (data) => {
      const { username } = data;
      
      if (!username || username.trim().length === 0) {
        socket.emit('login_error', { message: 'Username is required' });
        return;
      }

      const trimmedUsername = username.trim();
      
      // Check if username is already taken
      if (userStore.getUserByUsername(trimmedUsername)) {
        socket.emit('login_error', { message: 'Username is already taken' });
        return;
      }

      // Add user to store
      const user = userStore.addUser(socket.id, trimmedUsername);
      if (!user) {
        socket.emit('login_error', { message: 'Failed to add user' });
        return;
      }

      // Join default room
      socket.join('general');
      
      // Send login success
      socket.emit('login_success', { 
        username: trimmedUsername,
        userId: socket.id
      });

      // Send recent messages
      try {
        const recentMessages = await messageStore.getRecentMessages(50, 'general');
        socket.emit('message_history', { messages: recentMessages });
      } catch (e) {
        console.error('Failed to load recent messages', e);
      }

      // Send current online users
      const onlineUsers = userStore.getUsersInRoom('general');
      socket.emit('online_users', { users: onlineUsers });

      // Notify others about new user
      socket.to('general').emit('user_joined', { 
        username: trimmedUsername,
        users: userStore.getUsersInRoom('general')
      });

      console.log(`User ${trimmedUsername} joined the chat`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      const { content, room = 'general' } = data;
      const user = userStore.getUser(socket.id);

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Add message to store
      let message;
      try {
        message = await messageStore.addMessage(user.username, content.trim(), room);
      } catch (e) {
        console.error('Failed to save message', e);
        socket.emit('error', { message: 'Failed to save message' });
        return;
      }

      // Broadcast message to all users in the room
      io.to(room).emit('new_message', {
        id: message.id,
        username: message.username,
        content: message.content,
        timestamp: message.timestamp,
        room: message.room
      });

      console.log(`Message from ${user.username}: ${content}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { room = 'general' } = data;
      const user = userStore.getUser(socket.id);

      if (!user) return;

      userStore.setUserTyping(socket.id, true);
      
      socket.to(room).emit('user_typing', {
        username: user.username,
        isTyping: true
      });
    });

    // Open or join a private DM room between current user and targetUsername
    socket.on('open_dm', async (data) => {
      try {
        const { targetUsername } = data || {};
        const currentUser = userStore.getUser(socket.id);
        if (!currentUser) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        if (!targetUsername || typeof targetUsername !== 'string') {
          socket.emit('error', { message: 'targetUsername is required' });
          return;
        }
        const dmRoom = getDmRoomId(currentUser.username, targetUsername);

        // Join caller to DM room without changing their main room
        socket.join(dmRoom);

        // If target user online, join them as well
        const targetUser = userStore.getUserByUsername(targetUsername);
        if (targetUser) {
          const targetSocket = io.sockets.sockets.get(targetUser.socketId);
          if (targetSocket) {
            targetSocket.join(dmRoom);
            targetSocket.emit('dm_opened', { room: dmRoom, with: currentUser.username });
          }
        }

        // Load last 50 messages of DM room
        try {
          const history = await messageStore.getRecentMessages(50, dmRoom);
          socket.emit('dm_history', { room: dmRoom, with: targetUsername, messages: history });
        } catch (e) {
          console.error('Failed to load DM history', e);
        }

        // Notify opener
        socket.emit('dm_opened', { room: dmRoom, with: targetUsername });
      } catch (e) {
        console.error('open_dm error', e);
        socket.emit('error', { message: 'Failed to open DM' });
      }
    });

    socket.on('typing_stop', (data) => {
      const { room = 'general' } = data;
      const user = userStore.getUser(socket.id);

      if (!user) return;

      userStore.setUserTyping(socket.id, false);
      
      socket.to(room).emit('user_typing', {
        username: user.username,
        isTyping: false
      });
    });

    // Handle room changes
    socket.on('join_room', async (data) => {
      const { room } = data;
      const user = userStore.getUser(socket.id);

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Leave current room
      socket.leave(user.room);
      
      // Update user's room
      user.room = room;
      
      // Join new room
      socket.join(room);

      // Send room messages
      try {
        const roomMessages = await messageStore.getRecentMessages(50, room);
        socket.emit('message_history', { messages: roomMessages });
      } catch (e) {
        console.error('Failed to load room messages', e);
      }

      // Send room users
      const roomUsers = userStore.getUsersInRoom(room);
      socket.emit('online_users', { users: roomUsers });

      // Notify others
      socket.to(room).emit('user_joined', { 
        username: user.username,
        users: roomUsers
      });

      console.log(`User ${user.username} joined room: ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = userStore.removeUser(socket.id);
      
      if (user) {
        console.log(`User ${user.username} disconnected`);
        
        // Notify others about user leaving
        socket.to(user.room).emit('user_left', {
          username: user.username,
          users: userStore.getUsersInRoom(user.room)
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });
};

module.exports = setupSocketHandlers;
