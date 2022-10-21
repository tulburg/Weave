import Mongoose from "mongoose";
import Fern from "@fernjs/express";
import {JSONSchemaValidator, ShortText, LongText} from "@fernjs/json-schema-validator";
import {CheckIfExists, FetchWhere} from "@fernjs/mongoose";
import {UserSchema} from "./db/schema";

const db = Mongoose.createConnection('mongodb://127.0.0.1:27017/test');

const Api = new Fern({
  dbConnection: db
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
  .mapBody(['userid'])
  .mapDB('user', UserSchema)
  .useDB(
    FetchWhere.fromBody(
      ['userid'], 
      () => true, 
      () => ({ code: 404, message: 'User not found' })
    )
  )
  // .useStore((store: any) => {
  //   console.log(store.token.name);
  // })
  // .sendResult((data: any) => {
  //   data.robot = robot;
  //   return Array.from(data)
  // });
