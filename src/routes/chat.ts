// import express from 'express';
// const router = express.Router({mergeParams: true});
// import middleware from '../middleware/index';
// import Item from '../models/item';
import Chat from '../models/chat';
import User from '../models/user';
import Message from '../models/message';
import server from 'socket.io';
import events from 'events';
import _ from 'lodash';

const eventEmitter = new events.EventEmitter();
const io = server();
const userStack: Record<string, unknown> = {};
const userSocket: Record<string, string> = {};
const ioChat = io.of('/chat');
let setRoom: (roomId: string) => void, gUsername: string;
let gRoom: string;
const sendUserStack = () => {
  for (const i in userSocket) {
    for (const j in userStack) {
      if (j === i) {
        userStack[j] = 'Online';
      }
    }
  }
  ioChat.emit('onlineStack', userStack);
};
const oldChats = (
  result: Record<string, unknown>,
  username: string,
  room: string
) => {
  ioChat.to(userSocket[username]).emit('oldChats', {
    result: result,
    room: room,
  });
};
ioChat.on('connection', socket => {
  console.log('User connected');
  socket.on('setUserData', username => {
    console.log(username + ' logged in!');
    gUsername = username;
    userSocket[gUsername] = socket.id;
    eventEmitter.emit('getAllUsers');
  });
  socket.on('setRoom', room => {
    //leaving room.
    socket.leave(gRoom);
    //getting room data.
    eventEmitter.emit('getRoomData', room);
    //setting room and join.
    setRoom = (roomId: string) => {
      gRoom = roomId;
      console.log('roomId : ' + gRoom);
      socket.join(gRoom);
      ioChat.to(userSocket[gUsername]).emit('setRoom', gRoom);
    };
  });
  socket.on('oldChatsInit', data => {
    eventEmitter.emit('readChat', data);
  });
  socket.on('oldChats', data => {
    eventEmitter.emit('readChat', data);
  });
  //showing msg on typing.
  socket.on('typing', () => {
    socket.to(gRoom).broadcast.emit('typing', gUsername + ' : is typing...');
  });
  socket.on('chatMsg', data => {
    //emits event to save chat to database.
    eventEmitter.emit('saveChat', {
      msgFrom: data.msgFrom,
      msgTo: data.msgTo,
      msg: data.msg,
      chatId: gRoom,
    });
    //emits event to send chat msg to all clients.
    ioChat.to(gRoom).emit('chatMsg', {
      msgFrom: gUsername,
      msg: data.msg,
      date: data.date,
    });
    socket.on('disconnect', () => {
      console.log(gUsername + ' logged out');
      socket.leaveAll();
      console.log('chat disconnected.');
      _.unset(userSocket, gUsername);
      userStack[gUsername] = 'Offline';
      ioChat.emit('onlineStack', userStack);
    });
  });
});

eventEmitter.on('saveChat', async data => {
  const newMessage = new Message({
    from: data.msgFrom,
    to: data.msgTo,
    message: data.msg,
  });
  await newMessage.save();
  const chat = await Chat.findById(data.chatId).exec();
  chat.messages.push(newMessage);
  await chat.save();
});

eventEmitter.on('readChat', async data => {
  const result = await Chat.findById(data.chatId)
    .populate({
      path: 'messages',
      options: {
        limit: 20,
        skip: parseInt(data.msgCount),
      },
    })
    .lean()
    .exec();
  oldChats(result, data.username, data.room);
});

eventEmitter.on('getAllUsers', async data => {
  const user = await User.findById(data._id).exec();
  for (let i = 0; i < user.chatPersons.length; i++) {
    userStack[user.chatPersons[i].username] = 'Offline';
  }
  sendUserStack();
});

eventEmitter.on('createNewChat', async data => {
  const newMessage = new Message({
    from: data.user1,
    to: data.user2,
    message: '',
  });
  await newMessage.save();
  const newChat = new Chat({
    user1: data.from,
    user2: data.to,
    item: data.item,
    messages: [newMessage],
  });
  const chat = await newChat.save();
  const user = await User.findById(data.from._id).exec();
  user.chatPersons = [...new Set(user.chatPersons.concat(data.to))];
  await user.save();
  const userb = await User.findById(data.to._id).exec();
  userb.chatPersons = [...new Set(user.chatPersons.concat(data.from))];
  await userb.save();
  setRoom(chat._id);
});

eventEmitter.on('getRoomData', data => {
  Chat.findOne(
    {
      $and: [
        {$or: [{user1: data.from}, {user1: data.to}]},
        {$or: [{user2: data.from}, {user2: data.to}]},
      ],
    },
    (err, result) => {
      if (err) {
        console.log(err);
      } else if (result === undefined || result === null) {
        eventEmitter.emit('createNewChat', data);
      } else {
        setRoom(result._id);
      }
    }
  );
});

export default io;

// router.post(
//   '/new',
//   middleware.isLoggedIn,
//   async (req: express.Request, res: express.Response) => {
//     const item = await Item.findById(req.params.id).exec();
//     const user = await User.findById(req.user._id).exec();
//     const newChat = {
//       user1: item.seller,
//       user2: user,
//       item: item,
//       message: ['jjjk'],
//     };
//     const chat = await Chat.create(newChat);
//     item.seller.chats.push(chat);
//     await item.seller.save();
//     item.chats.push(chat);
//     await item.save();
//     req.user.chats.push(chat);
//     user.chats.push(chat);
//     await user.save();
//     req.login(user, () => {});
//     req.flash('success', 'Successfully followed ' + req.params.id + '!');
//     socket.emit
//     res.status(200).send('/item/' + req.params._id);
//   }
// );

// router.get('/:chatId', middleware.isLoggedIn, async (req, res) => {
//   const chat = await Chat.findById(req.params.chatId).exec();
//   res.status(200).json(chat);
// });

// router.put('/:chatId', middleware.isLoggedIn, async (req, res) => {
//   const chat = await Chat.findById(req.params.chatId).exec();
//   chat.messages.push(req.body.message);
//   await chat.save();
//   res.status(200).send('Done');
// });
