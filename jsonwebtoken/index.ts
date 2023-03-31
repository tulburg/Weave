// @ts-ignore
const jwt = require('jsonwebtoken');

export type CalleeFunction<T = any> = (...args: T[]) => boolean | Promise<boolean | { code: number, message?: string, stack?: any }> | { code: number, message?: string, stack?: any }
type Weave = {
  body: { [key: string]: any }
  header: { [key: string]: any }
  params: { [key: string]: any }
  store: { [key: string]: any }
  query: { [key: string]: any }
  options: { dbConnection: any }
  db: any[]
}

const part = {
  fromBody: function (args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return this._from('body', args, jwtKey, success, fail);
  },

  fromQuery: function (args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return this._from('query', args, jwtKey, success, fail);
  },

  fromHeader: function (args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return this._from('header', args, jwtKey, success, fail);
  },

  fromParams: function (args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return this._from('params', args, jwtKey, success, fail);
  },

  fromStore: function (args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return this._from('store', args, jwtKey, success, fail);
  },

  _from: function (type: 'body' | 'params' | 'header' | 'store' | 'query', args: string[], jwtKey: string, success?: CalleeFunction, fail?: CalleeFunction) {
    return (_: any[], instance: Weave) => {
      const source = {
        body: instance.body,
        params: instance.params,
        header: instance.header,
        store: instance.store,
        query: instance.query
      };
      if (!source[type]) throw "Source (" + type + ") is not mapped";
      else {
        const body: any = {};
        args.forEach(k => {
          body[k] = source[type][k];
        });
        return this._execute(instance, body, jwtKey, success, fail);
      }
    }
  }
}

export default {
  Sign: Object.assign({
    _execute: (instance: Weave, props: { [key: string]: any } & { issuer: string, expiresIn: string }, jwtKey: string, success: CalleeFunction, fail: CalleeFunction) => {
      const { header } = instance;
      const finalProps = { ...props, issuer: undefined, expiresIn: undefined };
      try {
        const token = jwt.sign({
          ...finalProps,
          timestamp: Date.now()
        }, jwtKey, {
          issuer: props && props.issuer ? props.issuer : 'x-weave-protocol',
          expiresIn: props && props.expiresIn ? props.expiresIn : '365d'
        });
        header.token = token;
        return success ? success(token, instance) : true;
      } catch (e) { return fail ? fail(e, instance) : false; }
    }
  }, part)
}


