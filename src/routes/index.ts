import express from 'express';
const router = express.Router();
import passport from 'passport';
import User from '../models/user';
import Item from '../models/item';
import Review from '../models/review';
import '../models/notification';
import middleware from '../middleware';
import {ChangeStream} from 'mongodb';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const foo = function (
  req: express.Request
  //res: express.Response,
  //next: express.NextFunction
) {
  let _changeStream = User.watch([
    {$match: {'fullDocument._id': req.user._id}},
  ]);
  return {
    get changeStream() {
      return _changeStream;
    },
    set changeStream(val) {
      _changeStream = val;
    },
  };
};

const globals: {changeStream: ChangeStream<unknown>} = {
  changeStream: null,
};

//handle sign up logic
router.post(
  '/register',
  middleware.checkRegister,
  async (req: express.Request, res: express.Response) => {
    try {
      const userobj: Record<string, unknown> = {
        username: req.body.username,
        avatar: req.body.avatar,
        contact_number: req.body.contactNumber,
        entry_number: req.body.entryNumber,
        hostel: req.body.hostel,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        description: req.body.description,
      };
      const newUser = new User(userobj);
      if (req.body.adminCode === process.env.ADMIN_CODE) {
        newUser.isAdmin = true;
      }
      await User.register(newUser, req.body.password);
      res.status(200).send('/register');
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

//handling login logic
router.post(
  '/login',
  passport.authenticate('local'),
  (req: express.Request, res: express.Response) => {
    // globals.changeStream = User.watch(
    //   [{$match: {'fullDocument._id': req.user._id}}],
    //   {fullDocument: 'updateLookup'}
    // );
    globals.changeStream = User.watch([
      {$match: {'documentKey._id': req.user._id}},
    ]);
    res.status(200).send(req.user._id);
  }
);

// logout route
router.get('/logout', async (req: express.Request, res: express.Response) => {
  try {
    req.logout();
    req.flash('success', 'See you later!');
    res.status(200).send('/item');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// follow user
router.patch(
  '/follow/:slug',
  middleware.isLoggedIn,
  async (req: express.Request, res: express.Response) => {
    try {
      console.log(req.user);
      const user = await User.findById(req.user._id).exec();
      user.folCategory.push(req.params.slug);
      await user.save();
      req.login(user, () => {});
      req.flash('success', 'Successfully followed ' + req.params.id + '!');
      res.status(200).send('/users/' + req.user._id);
    } catch (err) {
      req.flash('error', err.message);
      res.status(500).send('back');
    }
  }
);

router.patch(
  '/unfollow/:slug',
  middleware.isLoggedIn,
  async (req: express.Request, res: express.Response) => {
    try {
      console.log(req.user);
      const user = await User.findById(req.user._id).exec();
      user.folCategory = user.folCategory.filter(
        value => value !== req.params.slug
      );
      await user.save();
      req.login(user, () => {});
      req.flash('success', 'Successfully followed ' + req.params.id + '!');
      res.status(200).send('/users/' + req.user._id);
    } catch (err) {
      req.flash('error', err.message);
      res.status(500).send('back');
    }
  }
);

// view all notifications
router.get(
  '/notifications',
  middleware.isLoggedIn,
  async (req: express.Request, res: express.Response) => {
    try {
      const user = await User.findById(req.user._id)
        .populate({
          path: 'notifs',
          options: {sort: {_id: -1}},
        })
        .exec();
      const allNotifications = user.notifs;
      res.json(allNotifications);
    } catch (err) {
      req.flash('error', err.message);
      res.status(500).send('back');
    }
  }
);

router.get(
  '/report',
  middleware.isAdmin,
  async (req: express.Request, res: express.Response) => {
    try {
      const items = await Item.find({isReported: true}).exec();
      const reviews = await Review.find({isReported: true}).exec();
      res.json({items, reviews});
    } catch (err) {
      console.log(err);
      req.flash('error', err.message);
      res.status(500).send('back');
    }
  }
);

router.get('/streamUser', (req: express.Request, res: express.Response) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  // res.setHeader('Cache-Control', 'no-cache');
  // res.setHeader('Content-Type', 'text/event-stream');
  res.flushHeaders();
  globals.changeStream.on('change', change => {
    res.write(`data: ${JSON.stringify(change)}\n\n`);
    //res.end();
  });
  res.on('close', () => {
    res.end();
  });
});

export default router;
