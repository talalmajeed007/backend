const express = require('express');
const router = express.Router();
const { MessageStore } = require('../models/Message');

// Create a shared message store instance
const messageStore = new MessageStore();

// Get recent messages for a room
router.get('/:room', (req, res) => {
  const { room } = req.params;
  const { limit = 50 } = req.query;
  
  try {
    const messages = messageStore.getRecentMessages(parseInt(limit), room);
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

// Get all messages for a room (for debugging/admin purposes)
router.get('/:room/all', (req, res) => {
  const { room } = req.params;
  
  try {
    const messages = messageStore.getMessages(room);
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
router.post('/:room', (req, res) => {
  const { room } = req.params;
  const { username, content } = req.body;
  
  if (!username || !content) {
    return res.status(400).json({
      success: false,
      message: 'Username and content are required'
    });
  }
  
  try {
    const message = messageStore.addMessage(username, content, room);
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
