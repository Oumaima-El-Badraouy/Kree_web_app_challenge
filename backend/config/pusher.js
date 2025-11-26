const Pusher = require("pusher");

const pusher = new Pusher({
    appId:"2079978",
  key:"333ea303b9ce943a6a59",
  secret:"23b1dde8264ee78719dc",
  cluster:"eu",
  useTLS: true,
});

module.exports = pusher;
