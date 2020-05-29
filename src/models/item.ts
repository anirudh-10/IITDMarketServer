import mongoose from 'mongoose';
import {MUser} from './user';
import {MChat} from './chat';

export interface MItem extends mongoose.Document {
  title: string;
  image: string[];
  description: string;
  price: number;
  seller: MUser;
  buyer: MUser;
  chats: MChat[];
  category: string;
  tag: string;
  buy_date: Date;
  ApproxTime: {
    month: number;
    year: number;
  };
  status: string;
  isReported: boolean;
  userIsAnonymous: boolean;
}

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: 'Course title cannot be blank',
    },
    image: [
      {
        type: String,
      },
    ],
    description: String,
    price: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value.',
      },
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
      },
    ],
    category: {
      type: String,
      enum: ['GENERAL', 'COOLER', 'LAPTOP', 'CYCLE', 'MATTRESS'],
      trim: true,
      default: 'GENERAL',
    },
    tag: String,
    buy_date: Date,
    ApproxTime: {
      month: {
        type: Number,
        min: 1,
        max: 12,
      },
      year: Number,
    },
    status: {
      type: String,
      enum: ['UNSOLD', 'INPROCESS', 'SOLD'],
      default: 'UNSOLD',
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    userIsAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<MItem>('Item', itemSchema);
