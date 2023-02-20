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
  registry: {
    [key: string]: {
      callee: [CalleeFunction],
      request: core.Request,
      response: core.Response,
      nextDb: any[],
      nextBody: { [key: string]: any },
      nextStore: { [key: string]: any },
      nextHeader: { [key: string]: any },
      nextParams: { [key: string]: any },
      nextQuery: { [key: string]: any },
      nextMethod: 'post' | 'get' | 'delete'
    }
  }
  key: string = "";
  defaultOptions = {
    useJSON: true,
    driver: 'express',
    port: 8000
  }
  use: any;

  constructor(options: FernConfiguration) {
    this.options = Object.assign(this.defaultOptions, options);
    if (this.options.driver === 'express') {
      this.app = express.default();
      this.use = this.app.use.bind(this.app);
      this.app.response.sendOk = function (json: { [key: string]: any }) {
        const logData = json.data;
        log(chalk.green('Send => '), 200, { ...json, data: logData?.toString() });
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
    this.registry = {} as any;
  }

  endpoint(path: string, method: 'POST' | 'GET' | 'DELETE'): Fern {
    method = method.toLowerCase() as any;
    this.key = method + ':' + path;
    this.registry[this.key] = { callee: [], options: this.options } as any
    this.app[method](path, (req: any, res: any) => {
      log(chalk.magenta('Receive => ') + method + ':' + path);
      const key = method + ':' + path;
      const instance = this.registry[key]
      instance.request = req;
      instance.response = res;
      instance.nextMethod = method.toUpperCase() as any;
      instance.nextStore = {}

      let index = 0;
      const callee = this.registry[method + ':' + path].callee;
      let response = res;
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
                if (!v) response?.sendError({ code: 500, message: 'FernError: Function failed' });
                else if (v.code !== 200) response?.sendError(v);
                else response?.sendOk(v);
              }
            })
          } else if (res === true) {
            index++;
            callNext();
          } else {
            const result = res as { code: number, message?: string, stack?: any };
            if (!res) response?.sendError({ code: 500, message: 'FernError: Function failed' });
            else if (result.code !== 200) response?.sendError(result);
            else response?.sendOk(result);
          };
        }
      }
      callNext();
    });
    return this;
  }

  mapBody(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      if (!instance.request.body) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (instance.request?.body.hasOwnProperty(k)) {
          instance.nextBody = instance.nextBody || {} as any;
          instance.nextBody[k] = instance.request?.body[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    instance.callee.push(fn);
    return this;
  }

  useBody(callback?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn = () => {
      if (callback) return callback(instance.nextBody, instance);
      else return true;
    }
    instance.callee.push(fn as CalleeFunction);
    return this;
  }

  mapParams(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      if (!instance.request?.params) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (instance.request?.params.hasOwnProperty(k)) {
          instance.nextParams = instance.nextParams || {} as any;
          instance.nextParams[k] = instance.request?.params[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    instance.callee.push(fn);
    return this;
  }

  useParams(callback?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn = () => {
      if (callback) return callback(instance.nextParams, instance);
      else return true;
    }
    instance.callee.push(fn as CalleeFunction);
    return this;
  }

  mapQuery(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      if (!instance.request?.query) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (instance.request?.query.hasOwnProperty(k)) {
          instance.nextQuery = instance.nextQuery || {} as any;
          instance.nextQuery[k] = instance.request?.query[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    instance.callee.push(fn);
    return this;
  }

  useQuery(callback?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn = () => {
      if (callback) return callback(instance.nextQuery, instance);
      else return true;
    }
    instance.callee.push(fn as CalleeFunction);
    return this;
  }

  mapHeader(keys: string[], success?: CalleeFunction, fail?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      if (!instance.request?.headers) return {
        code: 400, message: 'Invalid request'
      }
      let checks = 0;
      keys.forEach(k => {
        if (instance.request?.headers.hasOwnProperty(k)) {
          instance.nextHeader = instance.nextHeader || {} as any;
          instance.nextHeader[k] = instance.request?.headers[k];
          checks++;
        }
      });
      if (checks === keys.length) return success ? success(true) : true;
      return fail ? fail({ code: 403, message: 'Bad Request' }) : { code: 403, message: 'Bad Request' };
    }
    instance.callee.push(fn);
    return this;
  }

  useHeader(callback?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn = () => {
      if (callback) return callback(instance.nextHeader, instance);
      else return true;
    }
    instance.callee.push(fn as CalleeFunction);
    return this;
  }

  mapDB(...args: any[]) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      instance.nextDb = args;
      return true;
    }
    instance.callee.push(fn);
    return this;
  }

  useDB(pFn: (db: any[], fern: any) => Promise<boolean>) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = async () => {
      let res = false;
      try {
        res = await pFn(instance.nextDb, instance);
      } catch (e) { log(e) };
      return res;
    }
    instance.callee.push(fn);
    return this;
  }

  useStore(callback?: CalleeFunction) {
    const instance = this.registry[this.key]
    const fn = () => {
      if (callback) return callback(instance.nextStore, instance);
      else return true;
    }
    instance.callee.push(fn as CalleeFunction);
    return this;
  }

  send(data: string | { message: string } | any | ((fern: Fern) => string | { message: string } | any)) {
    const instance = this.registry[this.key]
    const fn: CalleeFunction = () => {
      if (typeof data === 'function') instance.response?.sendOk(data(instance))
      else instance.response?.sendOk(data);
      return true;
    };
    instance.callee.push(fn);
  }

}

export default Fern;
