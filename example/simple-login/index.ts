import Mongoose, {SchemaDefinition, LeanDocument} from "mongoose";
import Fern from "@fernjs/express";
import {JSONSchemaValidator} from "@fernjs/json-schema-validator";
import {CheckIfExists, FetchWhere} from "../../src/callable";
import {ShortText, LongText} from "../../src/schema";
import {DatabaseType} from "../../types";


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

const db = Mongoose.createConnection('mongodb://127.0.0.1:27017/test');

const Api = new Fern({
  driver: 'express',
  dbConnection: db,
  dbDriver: DatabaseType.MongoDB
});
// Api.use(FireWall);
// Api.use(Cache);
Api.endpoint('/login', 'POST')
  .mapBody(['email', 'password'])
  .useBody(JSONSchemaValidator({
    email: ShortText.required(), 
    password: LongText.required()
  }))
  .useBody((fern: Fern) => {
    const { nextBody: body } = fern;
    body.email = body.email + 'not working';
    return true;
  })
  // .useHeader(SetToken(token => {
  //   token.permission = 10001;
  //   token.dependency = 10002;
  // }))
  // .mapDB('user', ['name', 'username', 'password'])
  .mapDB('user', UserSchema)
  .useDB(CheckIfExists.fromBody(['email', 'password'], () => true, () => {
    return { code: 400, message: 'Invalid query' }
  }))
  // .useAuthentication('bod')
  // .useDB(db => checkIfExists([db.name, db.gate]))
  // .mapInputs(fromBody, ['name', 'username', 'password'])
  // .useInputs(input => {
  //
  // })
  .send({ message: 'Login succesful!' });
Api.endpoint('/users', 'GET')
  // .useHeader(ValidateToken)
  .mapDB('user', UserSchema)
  .useDB(
    FetchWhere.fromBody(
      ['userid'], 
      () => true, 
      () => ({ code: 500, message: 'Internal error' })
    )
  )
  // .useStore((store: any) => {
  //   console.log(store.token.name);
  // })
  // .sendResult((data: any) => {
  //   data.robot = robot;
  //   return Array.from(data)
  // });
