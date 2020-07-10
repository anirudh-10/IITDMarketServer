import express from 'express';
const router = express.Router();
import User from '../models/user';
import Item from '../models/item';
import Chat from '../models/chat';
import Message from '../models/message';
import '../models/review';
import '../models/notification';
import middleware from '../middleware';

//User Profile
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const foundUser = await User.findById(req.params.id)
      .populate('reviews')
      .exec();
    const foundItem = await Item.find({seller: foundUser}).exec();
    if (req.user || !req.user.id.equals(req.params.id)) {
      await foundUser.depopulate('chats').execPopulate();
    }
    res.json({user: foundUser, item: foundItem});
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.put(
  '/:id/ban',
  middleware.isAdmin,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.params.id).exec();
      if (!user.isAdmin) {
        user.isBanned = true;
      }
      user.folCategory = [];
      const chats = await Chat.find({
        $or: [
          {user1: {_id: req.params.id, username: user.username}},
          {user2: {_id: req.params.id, username: user.username}},
        ],
      });
      for (const chat of chats) {
        await Message.remove({
          _id: {$in: chat.messages},
        });
        chat.remove();
      }
      await Item.remove({seller: user._id}).exec();
      await user.save();
      res.send();
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

router.put(
  '/:id/ban/temp',
  middleware.isAdmin,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.params.id).exec();
      if (!user.isAdmin) {
        user.banExpires = new Date(
          Date.now() + 3600000 * 24 * Number(req.body.day)
        );
      }
      await user.save();
      res.send();
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

router.put(
  '/:id',
  middleware.isLoggedIn,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.params.id).exec();
      if (!user._id.equals(req.user._id) || !req.user.isAdmin) {
        console.log(req.user._id !== user._id, req.user._id, user._id);
        throw new Error('invalid user');
      }
      user.avatar = req.body.avatar;
      user.contact_number = req.body.contactNumber;
      user.entry_number = req.body.entryNumber;
      user.hostel = req.body.hostel;
      user.firstName = req.body.firstName;
      user.lastName = req.body.lastName;
      user.email = req.body.email;
      user.description = req.body.description;
      await user.save();
      req.login(user, () => {});
      res.send('Done');
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

export default router;
