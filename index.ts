import {LongText, ShortText} from "./src/schema";
import {CalleeFunction, DatabaseType, SchemaType, WeaveConfiguration} from "./types";
import * as express from 'express';
import * as core from "express-serve-static-core";
import Mongoose from "mongoose";
import { LeanDocument, SchemaDefinition } from 'mongoose';
import { Validator } from 'jsonschema';
import http from 'http';
import {CheckIfExists} from "./src/callable";
import {type} from "./src/util";
const log = (...msg: any[]) => {
  console.log('['+ new Date().toLocaleString() +'] :: ', ...msg);
}

declare module 'express-serve-static-core' {
  export interface Response {
    sendOk: (json: {[key: string]: any}) => void;
    sendError: (code: number, message: string, stack?: string | any) => void;
  }
}

export class Weave {
  options: WeaveConfiguration;
  app: any; 
  response?: core.Response;
  request?: core.Request;
  method: 'post' | 'get' | 'delete' = 'get';
  callee: [CalleeFunction];

  nextDb: any[] = [] as any;
  nextBody: {[key: string]: SchemaType} = {} as any;

  defaultOptions = {
    useJSON: true
  }

  constructor(options: WeaveConfiguration) {
    this.options = Object.assign(this.defaultOptions, options);
    if(this.options.driver === 'express') {
      this.app = express.default();
      this.app.response.sendOk = function (json: {[key: string]: any}) {
        log('Send => ', 200);
        json.status = 200;
        this.status(200).json(json);
      };

      this.app.response.sendError = function (code: number, message: string, stack?: string) {
        const json: any = stack ? {message: message, stack: stack} : {message: message};
        log('Send => ', code, message);
        json.status = code;
        this.status(code).json(json);
      };

      if(this.options.useJSON) this.app.use(express.json({ limit: '15mb'}));
      const server = http.createServer(this.app);
      server.listen(8080);
      log('>> Server is listening at 8080');
    }
    this.callee = [] as any;
  }

  endpoint(path: string, method: 'POST' | 'GET' | 'DELETE'): Weave {
    this.method = method.toLowerCase() as any;
    this.app[this.method](path, (req: any, res: any) => {
      this.request = req;
      this.response = res;
      let index = 0;
      const callNext = () => {
        if(index < this.callee.length) {
          const fn = this.callee[index];
          const res = fn(this);
          if(type(res) === 'promise') {
            (<Promise<boolean>>res).then((v: boolean | { code: number, message?: string, stack?: any }) => {
              if(v === true) {
                index++;
                callNext();
              }else {
                console.log(v);
                if(!v) this.response?.sendError(500, 'Function failed');
                else this.response?.sendError(v.code, v.message as string, v.stack);
              }   
            })
          } else if(res === true) {
            index++;
            callNext();
          } else {
            const result = res as { code: number, message?: string, stack?: any };
            if(!res) this.response?.sendError(500, 'Function failed');
            else this.response?.sendError(result.code, result.message as string, result.stack);
          };   
        }
      }
      callNext();
    });
    return this;
  }

  mapBody(kvp: {[key: string]: SchemaType}) {
    // Check if value exists
    // Validate values agains schema definition
    // Register values on weave
    const fn: CalleeFunction = () => {
      if(!this.request?.body) return {
        code: 400, message: 'Invalid request'
      }
      const all = Object.keys(kvp), body: any = {};
      all.forEach(k => {
        if(!this.request?.body.hasOwnProperty(k)) {
          // Todo: give users access to control the mesage and code here
          return { code: 403, message: 'Bad request' };
        }else {
          body[k] = this.request?.body[k];
        }
      });
      const validator = new Validator(), 
      parentSchema = {
        type: 'object',
        properties: kvp,
        additionalProperties: false
      };
      const validation = validator.validate(this.method === 'get' ? this.request?.params : this.request?.body, parentSchema)
      if(!validation.valid) {
        const stack: any = { type: 'validation', instance: validation.errors[0].property.replace('instance.', '') };
        return { code: 403, message: 'Bad request', stack };
      }
      this.nextBody = body;
      return true;
    }
    this.callee.push(fn);
    return this;
  }

  useBody(callback?: (values: {[key: string]: any}) => boolean) {
    const fn: CalleeFunction = () => {
      if(callback) return callback(this.nextBody);
      else return true;
    }
    this.callee.push(fn);
    return this;
  }

  mapDB (...args: any[]) {
    const fn: CalleeFunction = () => {
      if(this.options.dbDriver === DatabaseType.MongoDB) {
        this.nextDb = args;
      }
      return true;
    }
    this.callee.push(fn);
    return this; 
  }

  useDB(pFn: (weave: Weave) => Promise<boolean>) {
    const fn: CalleeFunction = async () => {
      const res = await pFn(this);
      return res;
    }
    this.callee.push(fn);
    return this;
  }

  send(data: string | { message: string } | any) {
    const fn: CalleeFunction = () => {
      this.response?.sendOk(data);
      return true;
    };
    this.callee.push(fn);
  }
 
  //
  // useDB(callable: (map: string[] | [string[]], success: any, fail: any) => any, map: string[] | [string[]], success: any, fail: any) {
  //   callable(map, success, fail);
  // }
  //
  // mapInputs(callable: Function, field: [string]) {
  //
  // }

  
}

export default Weave;
export {
  ShortText
}
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

Mongoose.createConnection('mongodb://127.0.0.1:27017/test',{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(
  (db: any) => {
    const Api = new Weave({
      driver: 'express',
      dbConnection: db,
      dbDriver: DatabaseType.MongoDB
    });
    Api.endpoint('/login', 'POST')
    .mapBody({ email: ShortText, password: LongText.required() })
    .useBody(body => {
      body.email = body.email + 'not working';
      return true;
    })
    .useBody()
    // .mapDB('user', ['name', 'username', 'password'])
    .mapDB('user', UserSchema)
    .useDB(CheckIfExists.fromBody(['email', 'password'], () => true, () => {
      return { code: 400, message: 'Invalid query' }
    }))
    // .useDB(db => checkIfExists([db.name, db.gate]))
    // .mapInputs(fromBody, ['name', 'username', 'password'])
    // .useInputs(input => {
    //
    // })
    .send({ message: 'Login succesful!' });
  } 
)

