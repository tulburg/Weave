import {SchemaDefinition, LeanDocument} from "mongoose";
import Mongoose from "mongoose";

function Schema(params: SchemaDefinition<LeanDocument<undefined>>, alt: any = {}) {
  return new Mongoose.Schema(params, Object.assign({
    toJSON: {
      transform: (_: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    },
    toObject: {
      transform: (_: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    }
  }, alt))
}

export const UserSchema = Schema({
  name: String,
  id: String,
  email: String,
  deviceid: String,
}, {
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.deviceid;
      delete ret.__v;
    }
  }
});
