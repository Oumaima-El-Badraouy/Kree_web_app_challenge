const Chat = require('../models/Chat');
const Bid = require('../models/Bid.js');

// ----------------------
// Create chat
// ----------------------
exports.createChat = async (req, res, next) => {
  try {
    const { customerId, agencyId } = req.body;

    if (!customerId || !agencyId) {
      return res.status(400).json({ success: false, message: 'Both customerId and agencyId are required' });
    }

    const User = require('../models/User');
    const [customer, agency] = await Promise.all([
      User.findById(customerId),
      User.findById(agencyId)
    ]);

    if (!customer || !agency) return res.status(404).json({ success: false, message: 'Customer or agency not found' });
    if (customer.role !== 'customer' || agency.role !== 'agency') return res.status(400).json({ success: false, message: 'Invalid user roles' });

    let chat = await Chat.findOne({ customer: customerId, agency: agencyId, isActive: true })
      .populate('customer', 'firstName lastName avatar')
      .populate('agency', 'agencyName avatar');

    if (!chat) {
      chat = await Chat.create({ customer: customerId, agency: agencyId, messages: [], isActive: true });
      chat = await Chat.findById(chat._id)
        .populate('customer', 'firstName lastName avatar')
        .populate('agency', 'agencyName avatar');
    }

    res.status(201).json({ success: true, data: chat });
  } catch (err) {
    console.error('Create chat error:', err);
    next(err);
  }
};

// ----------------------
// Get all chats for user
// ----------------------
exports.getChats = async (req, res, next) => {
  try {
    const query = { isActive: true };
    if (req.user.role === 'customer') query.customer = req.user._id;
    else if (req.user.role === 'agency') query.agency = req.user._id;

    const chats = await Chat.find(query)
      .populate('customer', 'firstName lastName avatar')
      .populate('agency', 'agencyName avatar')
      .sort({ 'lastMessage.timestamp': -1 });

    const enrichedChats = chats.map(chat => {
      const unreadCount = chat.messages.filter(msg => !msg.isRead && msg.sender.toString() !== req.user._id.toString()).length;
      return { ...chat.toObject(), unreadCount };
    });

    res.status(200).json({ success: true, data: enrichedChats });
  } catch (error) {
    next(error);
  }
};

// ----------------------
// Get single chat
// ----------------------
exports.getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('customer', 'firstName lastName avatar')
      .populate('agency', 'agencyName avatar')
      .populate('messages.sender', 'firstName lastName agencyName avatar role');

    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const customerId = chat.customer?._id?.toString() || chat.customer?.toString();
    const agencyId = chat.agency?._id?.toString() || chat.agency?.toString();
    const isCustomer = customerId === req.user._id.toString();
    const isAgency = agencyId === req.user._id.toString();

    if (!isCustomer && !isAgency && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });

    chat.messages.forEach(msg => {
      const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
      if (senderId && senderId !== req.user._id.toString()) msg.isRead = true;
    });
    await chat.save();

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};


exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const isCustomer = chat.customer.toString() === req.user._id.toString();
    const isAgency = chat.agency.toString() === req.user._id.toString();
    if (!isCustomer && !isAgency) return res.status(403).json({ success: false, message: 'Not authorized' });

    const message = { sender: req.user._id, content, timestamp: new Date() };
    chat.messages.push(message);
    chat.lastMessage = message;
    await chat.save();

    const populatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'firstName lastName agencyName avatar role');
    const newMessage = populatedChat.messages[populatedChat.messages.length - 1];

    // 🔹 SOCKET.IO EVENT
    const io = req.app.get('io'); // récupération de l'instance io
    const channel = isCustomer ? `agency_${chat.agency}` : `customer_${chat.customer}`;
    io.to(channel).emit('new_message', { chatId: chat._id, message: newMessage });

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};


// ----------------------
// Get chat by bid
// ----------------------
exports.getChatByBid = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ bid: req.params.bidId })
      .populate('customer', 'firstName lastName avatar')
      .populate('agency', 'agencyName avatar')
      .populate('car', 'make model year images')
      .populate('bid')
      .populate('messages.sender', 'firstName lastName agencyName avatar role');

    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};
