const { userStore } = require('../routes/auth');
const { messageStore } = require('../routes/messages');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user login
    socket.on('user_login', (data) => {
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
      const recentMessages = messageStore.getRecentMessages(50, 'general');
      socket.emit('message_history', { messages: recentMessages });

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
    socket.on('send_message', (data) => {
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
      const message = messageStore.addMessage(user.username, content.trim(), room);

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
    socket.on('join_room', (data) => {
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
      const roomMessages = messageStore.getRecentMessages(50, room);
      socket.emit('message_history', { messages: roomMessages });

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
