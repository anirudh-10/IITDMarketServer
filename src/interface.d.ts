/* eslint-disable @typescript-eslint/no-unused-vars */
import {MUser} from './models/user';
import {MItem} from './models/item';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends MUser {}
    interface Request {
      item?: MItem;
    }
  }
}
