const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Proposal = require('../models/Proposal'); // ⬅️ جديد

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ✅ Middleware Auth
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.user._id} (${socket.user.role})`);

    // join user-specific room
    const userRoom = `${socket.user.role}_${socket.user._id}`;
    socket.join(userRoom);

    /* =======================================
     🟠 SECTION 1: CHAT EVENTS (existing)
     ======================================= */

    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      socket.to(chatId).emit('userTyping', {
        userId: socket.user._id,
        userName: socket.user.firstName || socket.user.agencyName,
        isTyping,
      });
    });

    socket.on('sendMessage', async (data) => {
      try {
        const { chatId, content } = data;
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit('error', { message: 'Chat not found' });

        const isCustomer = chat.customer.toString() === socket.user._id.toString();
        const isAgency = chat.agency.toString() === socket.user._id.toString();
        if (!isCustomer && !isAgency)
          return socket.emit('error', { message: 'Not authorized' });

        const message = {
          sender: socket.user._id,
          content,
          timestamp: new Date(),
        };

        chat.messages.push(message);
        chat.lastMessage = { content, timestamp: new Date(), sender: socket.user._id };
        await chat.save();

        const populatedChat = await Chat.findById(chatId).populate(
          'messages.sender',
          'firstName lastName agencyName avatar role'
        );

        const newMessage = populatedChat.messages.pop();

        io.to(`customer_${chat.customer}`).emit('newMessage', { chatId, message: newMessage });
        io.to(`agency_${chat.agency}`).emit('newMessage', { chatId, message: newMessage });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('markAsRead', async (data) => {
      try {
        const { chatId } = data;
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        chat.messages.forEach((msg) => {
          if (msg.sender.toString() !== socket.user._id.toString()) msg.isRead = true;
        });

        await chat.save();

        const targetRoom =
          socket.user.role === 'customer'
            ? `agency_${chat.agency}`
            : `customer_${chat.customer}`;
        io.to(targetRoom).emit('messagesRead', { chatId });
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      console.log(`💬 Joined chat ${chatId}`);
    });

    socket.on('leaveChat', (chatId) => {
      socket.leave(chatId);
      console.log(`🚪 Left chat ${chatId}`);
    });

    /* =======================================
     🟢 SECTION 2: PROPOSAL EVENTS (new)
     ======================================= */

    // Join request-specific room
    socket.on('joinRequestRoom', (requestId) => {
      socket.join(`request_${requestId}`);
      console.log(`📦 ${socket.user._id} joined request_${requestId}`);
    });

    // Fetch proposals for a request
  // ✅ correct
socket.on('getProposals', async (requestId, callback) => {
  console.log('📥 getProposals called with requestId:', requestId);
  try {
    const proposals = await Proposal.find({ request: requestId })
      .populate('agency', 'agencyName rating')
      .lean();
    console.log('📄 Proposals found:', proposals.length);
    callback(proposals);
  } catch (err) {
    console.error('❌ Error fetching proposals:', err);
    callback([]);
  }
});



    // Real-time when a proposal is created (this event emitted from backend)
    socket.on('newProposal', (proposal) => {
      io.to(`request_${proposal.request}`).emit('newProposal', proposal);
      io.to(`customer_${proposal.customer}`).emit('newProposal', proposal);
      console.log(`📡 New proposal sent to request_${proposal.request}`);
    });

    /* =======================================
     🔴 SECTION 3: DISCONNECT
     ======================================= */

    socket.on('disconnect', () => {
      console.log(`🔴 Disconnected: ${socket.user._id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
