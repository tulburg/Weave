import * as Mongoose from "mongoose";
import Weave from "..";
import {CalleeFunction, DatabaseType} from "../types";
import {type} from "./util";

// export async function checkIfExists(weave: Weave, map: string[] | [string[]], success?: any, fail?: any) {
//   const {dbConnection, dbDriver} = weave.options;
//   const {nextDb} = weave;
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
    return async (weave: Weave) => {
      if(!weave.nextBody) throw "Body doesn't exist";
      else {
        const body: any = {};
        args.forEach(k => {
          body[k] = weave.nextBody[k];
        });
        return await this._execute(weave, body, exists, doesNotExist);
      }
    }
  },
  
  _execute: async function(weave: Weave, params: {[key: string]: any}, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    if(weave.nextDb.length === 0) return false;
    const { dbDriver, dbConnection } = weave.options;
    const { nextDb } = weave;
    if(dbDriver === DatabaseType.MongoDB) {
      const model = dbConnection.model(nextDb[0], nextDb[1]);
      const check = await model.findOne(params);
      if(check && check[0]) {
        if(exists) return exists();
        else return true;
      }else {
        if(doesNotExist) return doesNotExist(); 
        else return true;
      }
    }
  }
  
}
