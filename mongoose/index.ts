import Fern from "@fernjs/express";
import { CalleeFunction } from "@fernjs/express/types";

export const CheckIfExists = {
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
    return async (fern: Fern) => {
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
        return await this._execute(fern, body, exists, doesNotExist);
      }
    }
  },
  
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
  
}

export const FetchWhere = {
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
      console.log(fern.nextBody);
      if(!fern.nextBody) throw "Body is not mapped";
      else {
        const body: any = {};
        args.forEach(k => {
          body[k] = source[type][k];
        });
        return this._execute(fern, body, exists, doesNotExist);
      }
    }
  },

  _execute: async function(fern: Fern, params: {[key: string]: any}, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = fern.options;
    const { nextDb } = fern;
    const model = dbConnection?.model(nextDb[0], nextDb[1]);
    const get = await model?.find(params);
    if(get && get.length > 0) {
      const result = get.forEach(i => i.toJSON());
      if(exists) return exists(result);
      else return true;
    }else {
      if(doesNotExist) return doesNotExist(); 
      else return false;
    }
  }   
}
