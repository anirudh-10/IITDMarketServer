import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import {PassportLocalSchema} from 'mongoose';
import {MReview} from './review';
import {MNotification} from './notification';

export interface MUser extends mongoose.Document {
  username: string;
  password: string;
  avatar: string;
  contact_number: string;
  entry_number: string;
  hostel: string;
  chatPersons: {username: string; _id: string}[];
  firstName: string;
  lastName: string;
  email: string;
  isBanned: boolean;
  banExpires: Date;
  isAdmin: boolean;
  description: string;
  notifs: MNotification[];
  reviews: MReview[];
  rating: number;
  folCategory: string[];
}

const UserSchema = new mongoose.Schema(
  {
    username: {type: String, unique: true, required: true},
    password: String,
    avatar: String,
    contact_number: String,
    entry_number: String,
    hostel: String,
    chatPersons: [
      {
        username: String,
        _id: String,
      },
    ],
    firstName: String,
    lastName: String,
    email: {type: String, required: true, unique: true},
    isBanned: {type: Boolean, default: false},
    banExpires: Date,
    isAdmin: {type: Boolean, default: false},
    description: String,
    notifs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification',
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },
    folCategory: [
      {
        type: String,
        enum: ['GENERAL', 'COOLER', 'LAPTOP', 'CYCLE', 'MATTRESS'],
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

UserSchema.plugin(passportLocalMongoose);

export default mongoose.model<MUser>('User', UserSchema as PassportLocalSchema);
