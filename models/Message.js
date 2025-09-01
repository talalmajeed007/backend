class Message {
  constructor(id, username, content, timestamp, room = 'general') {
    this.id = id;
    this.username = username;
    this.content = content;
    this.timestamp = timestamp;
    this.room = room;
  }
}

// In-memory storage for messages
class MessageStore {
  constructor() {
    this.messages = [];
    this.maxMessages = 100; // Keep only last 100 messages
  }

  addMessage(username, content, room = 'general') {
    const message = new Message(
      Date.now().toString(),
      username,
      content,
      new Date(),
      room
    );
    
    this.messages.push(message);
    
    // Keep only the last maxMessages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    return message;
  }

  getMessages(room = 'general') {
    return this.messages.filter(msg => msg.room === room);
  }

  getRecentMessages(limit = 50, room = 'general') {
    const roomMessages = this.messages.filter(msg => msg.room === room);
    return roomMessages.slice(-limit);
  }
}

module.exports = { Message, MessageStore };
