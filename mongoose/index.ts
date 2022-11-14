import Fern from "@fernjs/express";
import { CalleeFunction } from "@fernjs/express/types";

const part = {
  fromBody: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('body', args, exists, doesNotExist);
  },

  fromHeader: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('header', args, exists, doesNotExist);
  },

  fromParams: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('params', args, exists, doesNotExist);
  },

  fromStore: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('store', args, exists, doesNotExist);
  },

  _from: function(type: 'body' | 'params' | 'header' | 'store', args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) { 
    return (fern: Fern) => {
      const source = {
        body: fern.nextBody,
        params: fern.nextParams,
        header: fern.nextHeader,
        store: fern.nextStore
      }; 
      if(!fern.nextBody) throw "Body is not mapped";
      else {
        const body: any = {};
        args.forEach(k => {
          body[k] = source[type][k];
        });
        return this._execute(fern, body, exists, doesNotExist);
      }
    }
  }
}

export const CheckIfExists = Object.assign({ 
  _execute: async function(fern: Fern, params: {[key: string]: any}, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    if(fern.nextDb.length === 0) return false;
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const model = dbConnection?.model(nextDb[0], nextDb[1]);
    const check = await model?.findOne(params);
    if(check) {
      if(exists) return exists();
      else return true;
    }else {
      if(doesNotExist) return doesNotExist(); 
      else return true;
    }
  }
}, part);

export const FetchWhere = Object.assign({
  _execute: async function(fern: Fern, params: {[key: string]: any}, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const model = dbConnection?.model(nextDb[0], nextDb[1]);
    const get = await model?.find(params);
    if(get && get.length > 0) {
      if(exists) return exists(get);
      else return true;
    }else {
      if(doesNotExist) return doesNotExist(); 
      else return false;
    }
  }
}, part);

export const FetchOne = Object.assign({
  _execute: async function(fern: Fern, params: {[key: string]: any}, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const model = dbConnection?.model(nextDb[0], nextDb[1]);
    const get = await model?.findOne(params);
    if(get) {
      if(exists) return exists(get);
      else return true;
    }else {
      if(doesNotExist) return doesNotExist(); 
      else return false;
    }
  }
}, part);

export const Fetch = {
  withLimit: function(limit?: { start: number, limit: number }, success?: CalleeFunction, fail?: CalleeFunction) {
    return (fern: Fern) => {
      return this._execute(fern, limit, success, fail);
    }
  },
  _execute: async function(fern: Fern, limit: { start: number, limit: number }, success?: CalleeFunction, fail?: CalleeFunction) {
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const model = dbConnection?.model(nextDb[0], nextDb[1]);
    const get = await (limit 
      ? model?.find({}, null, { skip: limit.start, limit: limit.limit })
      : model?.find({}));
    if(get) {
      fern.nextStore = get;
      return success ? success(get) : true;
    }else return fail ? fail(false) : false;
  }
}

export const Insert = Object.assign({
  _execute: async function(fern: Fern, params: {[key: string]: any}, success?: CalleeFunction, fail?: CalleeFunction) {
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const Model: any = dbConnection?.model(nextDb[0], nextDb[1]);
    const create = await new Model(params).save();
    if(create) {
      return success ? success(true): true;
    }else return fail ? fail(false) : false;
  }
}, part);

