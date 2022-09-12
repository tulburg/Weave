import {Schema, Validator} from "jsonschema";
import * as Mongoose from "mongoose";
import Fern from "..";
import {CalleeFunction, DatabaseType} from "../types";
import {type} from "./util";

// export async function checkIfExists(fern: Fern, map: string[] | [string[]], success?: any, fail?: any) {
//   const {dbConnection, dbDriver} = fern.options;
//   const {nextDb} = fern;
//   switch(dbDriver) {
//     case DatabaseType.Mongoose:
//       const db: Mongoose.Connection = dbConnection as any
//       const model = db.model(nextDb.table);
//       let fieldMap: any = {};
//       if(map.length > 0) {
//         const item = map[0];
//         if(type(item) === 'array') {
//           (<string[]>item).forEach(i => fieldMap[i] = nextDb.fields[i]);
//         }else fieldMap[<string>item] = nextDb.fields[<string>item];
//         try {
//           const result = await model.findOne(fieldMap);
//           if(result) success(result);
//           else fail();
//         }catch(e) { fail(e); }
//       }else throw 'Mappable fields are required!';
//       break;
//   }
// }

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
    const { dbDriver, dbConnection } = fern.options;
    const { nextDb } = fern;
    if(dbDriver === DatabaseType.MongoDB) {
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
    const { dbDriver, dbConnection } = fern.options;
    const { nextDb } = fern;
    if(dbDriver === DatabaseType.MongoDB) {
      const model = dbConnection?.model(nextDb[0], nextDb[1]);
      const get = await model?.find(params);
      if(get) {
        const result = get.forEach(i => i.toJSON());
        if(exists) return exists(result);
        else return true;
      }else {
        if(doesNotExist) return doesNotExist(); 
        else return true;
      }
    }
  }   
}


export function JSONSchemaValidator(keys: {[key: string]: Schema}, success?: CalleeFunction, fail?: CalleeFunction) {
  return (fern: Fern) => {
    const { nextParams, nextBody, nextMethod } = fern;
    const validator = new Validator(), 
    parentSchema: Schema = {
      type: 'object',
      properties: keys,
      additionalProperties: false
    }, validation = validator.validate(nextMethod === 'get' ? nextParams : nextBody, parentSchema)
    if(!validation.valid) {
      const stack: any = { type: 'validation', message: validation.errors[0].stack.replace('instance.', '') };
      return fail ? fail(stack): { code: 400, message: 'Bad request', stack };
    }
    if(success) success();
    return true;
  }
}
