const express = require('express');
const router = express.Router();
const { 
  createChat, 
  getChats, 
  getChat, 
  sendMessage, 
  getChatByBid 
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Protected routes - all chat routes require authentication
router.use(protect);

// Create new chat
router.post('/', createChat);

// Get user's chats
router.get('/', getChats);

// Get single chat
router.get('/:chatId', getChat);

// Send message (REST endpoint - real-time via Socket.io)
router.post('/:chatId/messages', sendMessage);

// Get chat by bid ID
router.get('/bid/:bidId', getChatByBid);

module.exports = router;