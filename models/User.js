class User {
  constructor(id, username, socketId) {
    this.id = id;
    this.username = username;
    this.socketId = socketId;
    this.joinedAt = new Date();
    this.isTyping = false;
    this.room = 'general';
  }
}

// In-memory storage for online users
class UserStore {
  constructor() {
    this.users = new Map(); // socketId -> User
    this.usernames = new Set(); // Track usernames to prevent duplicates
  }

  addUser(socketId, username) {
    if (this.usernames.has(username)) {
      return false; // Username already taken
    }
    
    const user = new User(socketId, username, socketId);
    this.users.set(socketId, user);
    this.usernames.add(username);
    return user;
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.usernames.delete(user.username);
      this.users.delete(socketId);
      return user;
    }
    return null;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  getUsersInRoom(room) {
    return Array.from(this.users.values()).filter(user => user.room === room);
  }

  setUserTyping(socketId, isTyping) {
    const user = this.users.get(socketId);
    if (user) {
      user.isTyping = isTyping;
      return user;
    }
    return null;
  }

  getTypingUsers(room) {
    return Array.from(this.users.values())
      .filter(user => user.room === room && user.isTyping)
      .map(user => user.username);
  }
}

module.exports = { User, UserStore };
