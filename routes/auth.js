const express = require('express');
const router = express.Router();
const { UserStore } = require('../models/User');

// Create a shared user store instance
const userStore = new UserStore();



// Check if username is available
router.get('/check-username/:username', (req, res) => {
  const { username } = req.params;
  
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ 
      available: false, 
      message: 'Username is required' 
    });
  }
  
  const isAvailable = !userStore.getUserByUsername(username.trim());
  
  res.json({ 
    available: isAvailable,
    message: isAvailable ? 'Username is available' : 'Username is taken'
  });
});

// Get online users (for debugging/admin purposes)
router.get('/online-users', (req, res) => {
  const users = userStore.getAllUsers().map(user => ({
    username: user.username,
    joinedAt: user.joinedAt,
    room: user.room
  }));
  
  res.json({ 
    success: true, 
    users,
    count: users.length
  });
});

module.exports = { router, userStore };
