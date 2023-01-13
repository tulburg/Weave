import { CalleeFunction, FernConfiguration } from "./types";
import * as express from 'express';
import * as core from "express-serve-static-core";
import fs from 'fs';
import http from 'http';
import https from 'https';
import chalk from 'chalk';

import { type } from "./src/util";


const oldConsole = global.console;
global.console = {
  ...global.console,
  log: (...msg: any[]) => {
    oldConsole.log('[' + new Date().toLocaleString() + '] :: ', ...msg);
  },
  error: (...msg: any[]) => {
    oldConsole.error(chalk.red('[' + new Date().toLocaleString() + '] :: '), ...msg);
  }
}


const log = console.log;

declare module 'express-serve-static-core' {
  export interface Response {
    sendOk: (json: { [key: string]: any }) => void;
    sendError: (object: any) => void;
  }
}

export class Fern {
  options: FernConfiguration;
  private app: any;
  private server: any;
  response?: core.Response;
  request?: core.Request;
  callee: [CalleeFunction];
  registry: { [key: string]: [CalleeFunction] };

  nextDb: any[] = [] as any;
  nextBody: { [key: string]: any } = {} as any;
  nextStore: { [key: string]: any } = {} as any;
  nextHeader: { [key: string]: any } = {} as any;
  nextParams: { [key: string]: any } = {} as any;
  nextQuery: { [key: string]: any } = {} as any;
  nextMethod: 'post' | 'get' | 'delete' = 'get';

  defaultOptions = {
    useJSON: true,
    driver: 'express',
    port: 8000,
    sslCert: undefined,
    sslKey: undefined
  }
  use: any;

  constructor(options: FernConfiguration) {
    this.options = Object.assign(this.defaultOptions, options);
    if (this.options.driver === 'express') {
      this.app = express.default();
      this.use = this.app.use.bind(this.app);
      this.app.response.sendOk = function (json: { [key: string]: any }) {
        log(chalk.green('Send => '), 200, json);
        json.status = 200;
        this.status(200).json(json);
      };

      this.app.response.sendError = function (object: any) {
        const json: any = object;
        log(chalk.red('Send => '), object.code, json);
        json.status = object.code;
        this.status(object.code).json(json);
      };

      // if(this.options.useJSON) this.app.use(express.json({ limit: '15mb'}));
      this.app.use(express.json({ limit: '15mb' }));
      this.server = this.options.sslCert ? https.createServer({
        key: fs.readFileSync(this.options.sslKey as string),
        cert: fs.readFileSync(this.options.sslCert)
      }, this.app) : http.createServer(this.app);
      this.server.listen(options.port || 8000);
      log(`>>  listening at ${options.port || 8000}`);
    }
    this.callee = [] as any;
    this.registry = {} as any;
  }

  endpoint(path: string, method: 'POST' | 'GET' | 'DELETE'): Fern {
    method = method.toLowerCase() as any;

    this.registry[method + ':' + path] = [] as any
    this.callee = this.registry[method + ':' + path];
    this.app[method](path, (req: any, res: any) => {
      log(chalk.magenta('Receive => ') + method + ':' + path);
      this.request = req;
      this.response = res;
      let index = 0;
      this.nextBody = undefined as any;
      this.nextMethod = method.toUpperCase() as any;
      this.nextParams = undefined as any;
      this.nextQuery = undefined as any;
      this.nextDb = undefined as any;
      this.nextStore = {} as any;
      this.nextHeader = undefined as any;
      const callee = this.registry[method + ':' + path];
      const callNext = () => {
        if (index < callee.length) {
          const fn = callee[index];
          const res = fn(this);
          if (type(res) === 'promise') {
            (<Promise<boolean>>res).then((v: boolean | { code: number, message?: string, stack?: any }) => {
              if (v === true) {
                index++;
                callNext();
              } else {
                if (!v) this.response?.sendError({ code: 500, message: 'FernError: Function failed' });
                else if (v.code !== 200) this.response?.sendError(v);
                else this.response?.sendOk(v);
              }
            })
          } else if (res === true) {
            index++;
            callNext();
          } else {
            const result = res as { code: number, message?: string, stack?: any };
            if (!res) this.response?.sendError({ code: 500, message: 'FernError: Function failed' });
            else if (result.code !== 200) this.response?.sendError(result);
            else this.response?.sendOk(result);
          };
        }
      }
      callNext();
    });
    this.callee.push((fern: Fern) => {
      fern.nextMethod = method as any;
      return true;
    });
    return this;
  }

  mapBody(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const fn: CalleeFunction = () => {
      if (!this.request?.body) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (this.request?.body.hasOwnProperty(k)) {
          this.nextBody = this.nextBody || {} as any;
          this.nextBody[k] = this.request?.body[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    this.callee.push(fn);
    return this;
  }

  useBody(callback?: CalleeFunction) {
    const fn = () => {
      if (callback) return callback(this.nextBody, this);
      else return true;
    }
    this.callee.push(fn as CalleeFunction);
    return this;
  }

  mapParams(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const fn: CalleeFunction = () => {
      if (!this.request?.params) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (this.request?.params.hasOwnProperty(k)) {
          this.nextParams = this.nextParams || {} as any;
          this.nextParams[k] = this.request?.params[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    this.callee.push(fn);
    return this;
  }

  useParams(callback?: CalleeFunction) {
    const fn = () => {
      if (callback) return callback(this.nextParams, this);
      else return true;
    }
    this.callee.push(fn as CalleeFunction);
    return this;
  }

  mapQuery(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const fn: CalleeFunction = () => {
      if (!this.request?.query) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (this.request?.query.hasOwnProperty(k)) {
          this.nextQuery = this.nextQuery || {} as any;
          this.nextQuery[k] = this.request?.query[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    this.callee.push(fn);
    return this;
  }

  useQuery(callback?: CalleeFunction) {
    const fn = () => {
      if (callback) return callback(this.nextQuery, this);
      else return true;
    }
    this.callee.push(fn as CalleeFunction);
    return this;
  }

  mapHeader(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const fn: CalleeFunction = () => {
      if (!this.request?.headers) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (this.request?.headers.hasOwnProperty(k)) {
          this.nextHeader = this.nextHeader || {} as any;
          this.nextHeader[k] = this.request?.headers[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    this.callee.push(fn);
    return this;
  }

  useHeader(callback?: CalleeFunction) {
    const fn = () => {
      if (callback) return callback(this.nextHeader, this);
      else return true;
    }
    this.callee.push(fn as CalleeFunction);
    return this;
  }

  // mapHeader
  // useHeader
  // useStore

  mapDB(...args: any[]) {
    const fn: CalleeFunction = () => {
      this.nextDb = args;
      return true;
    }
    this.callee.push(fn);
    return this;
  }

  useDB(pFn: (db: any[], fern: Fern) => Promise<boolean>) {
    const fn: CalleeFunction = async () => {
      let res = false;
      try {
        res = await pFn(this.nextDb, this);
      } catch (e) { log(e) };
      return res;
    }
    this.callee.push(fn);
    return this;
  }

  // useAuthentication() {
  //   const fn: CalleeFunction = () => {
  //     const headerToken = this.request?.headers.authorization;
  //     if(headerToken && headerToken.slice(0, 6) === 'Bearer') {
  //       let token = headerToken.replace('Bearer ', '');
  //       if(token.trim().length === 0) {
  //         return { code: 401, message: 'Authorization failed' };
  //       }
  //       jwt.verify(token, process.env.jwtKey, function(err: any, data: TokenData) {
  //         if(err || data.iss !== 'x-plane.app.server') {
  //           return { code: 401, message: 'Unauthorized' };
  //         }else if(new Date(data.expiry) < new Date()) {
  //           return { code: 400, message: 'Invalid Token' };
  //         }else return true;
  //       });
  //     }else {
  //       return { code: 403, message: 'Authorization failed' }
  //     }
  //     return false;
  //   }
  //   
  //   this.callee.push(fn);
  //   return this;
  // }

  useStore(callback?: CalleeFunction) {
    const fn = () => {
      if (callback) return callback(this.nextStore, this);
      else return true;
    }
    this.callee.push(fn as CalleeFunction);
    return this;
  }

  send(data: string | { message: string } | any | ((fern: Fern) => string | { message: string } | any)) {
    const fn: CalleeFunction = () => {
      if (typeof data === 'function') this.response?.sendOk(data(this))
      else this.response?.sendOk(data);
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

// Other Database functions for useDB =>
// CheckIfExists
// Create
// CreateOrUpdate
// Delete
// Fetch
// FetchWhere
//


export default Fern;
