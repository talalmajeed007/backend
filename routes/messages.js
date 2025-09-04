const express = require('express');
const router = express.Router();
const { MessageStore } = require('../models/Message');

// Create a shared message store instance
const messageStore = new MessageStore();
// Ensure DB table exists
(async () => {
  try { await messageStore.init(); } catch (e) { console.error('Failed to init messages table', e); }
})();

// Get recent messages for a room
router.get('/:room', async (req, res) => {
  const { room } = req.params;
  const { limit = 50 } = req.query;
  
  try {
    const count = await messageStore.getMessages(room).length;
    const messages = await messageStore.getRecentMessages(parseInt(limit), room);
    res.json({
      success: true,
      messages,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Get all messages for a room (for debugging/admin purposes)
router.get('/:room/all', async (req, res) => {
  const { room } = req.params;
  
  try {
    const messages = await messageStore.getMessages(room);
    res.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Add a message (for testing purposes, normally done via Socket.io)
router.post('/:room', async (req, res) => {
  const { room } = req.params;
  const { username, content } = req.body;
  
  if (!username || !content) {
    return res.status(400).json({
      success: false,
      message: 'Username and content are required'
    });
  }
  
  try {
    const message = await messageStore.addMessage(username, content, room);
    res.json({
      success: true,
      message: 'Message added successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
});

module.exports = { router, messageStore };
