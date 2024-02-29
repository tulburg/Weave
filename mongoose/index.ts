type Weave = {
  body: { [key: string]: any }
  header: { [key: string]: any }
  params: { [key: string]: any }
  store: { [key: string]: any }
  query: { [key: string]: any }
  options: { dbConnection: any }
  db: any[]
};
type CalleeFunction<T = any> = (...args: T[]) => boolean | Promise<boolean | { code: number, message?: string, stack?: any }> | { code: number, message?: string, stack?: any }

const Call = (fn: any, ...args: any[]) => {
  try {
    return fn(...args);
  } catch (e) {
    return e;
  }
}
const part = {
  fromBody: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('body', args, exists, doesNotExist);
  },

  fromQuery: function (args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    return this._from('query', args, exists, doesNotExist);
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

  _from: function (type: 'body' | 'params' | 'header' | 'store' | 'query', args: string[], exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
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
        if (this.limit) {
          return this._execute(instance, this.limit, body, exists, doesNotExist);
        } else return this._execute(instance, body, exists, doesNotExist);
      }
    }
  }
}

export const CheckIfExists = Object.assign({
  _execute: async function (instance: Weave, params: { [key: string]: any }, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    if (instance.db.length === 0) return false;
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const check = await model?.findOne(params);
    if (check) {
      if (exists) return exists(instance);
      else return true;
    } else {
      if (doesNotExist) return doesNotExist(instance);
      else return false;
    }
  }
}, part);

export const FetchWhere = Object.assign({
  limit: function ({ start = 0, limit = 10 }: { start: number, limit: number }) {
    this.limit = { start, limit };
    return this;
  },
  rawParams: function (params: any, success?: CalleeFunction, fail?: CalleeFunction) {
    return (instance: Weave) => {
      this._execute(instance, this.limit, params, success, fail)
    }
  },
  _execute: async function (instance: Weave, limit: { start: number, limit: number }, params: { [key: string]: any }, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const get = await model?.find(params, null, { skip: limit.start, limit: limit.limit });
    if (get && get.length > 0) {
      if (exists) return exists(get, instance);
      else return true;
    } else {
      if (doesNotExist) return doesNotExist(instance);
      else return false;
    }
  }
}, part);

export const Count = Object.assign({
  rawParams: function (params: any, success?: CalleeFunction, fail?: CalleeFunction) {
    return (instance: Weave) => {
      this._execute(instance, params, success, fail)
    }
  },
  _execute: async function (instance: Weave, params: { [key: string]: any }, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const get = await model?.count(params);
    if (get) {
      if (exists) return exists(get, instance);
      else return true;
    } else {
      if (doesNotExist) return doesNotExist(instance);
      else return false;
    }
  }
}, part);

export const FetchOne = Object.assign({
  _execute: async function (instance: Weave, params: { [key: string]: any }, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const get = await model?.findOne(params);
    if (get) {
      if (exists) return Call(exists, get, instance);
      else return true;
    } else {
      if (doesNotExist) return Call(doesNotExist, instance);
      else return false;
    }
  }
}, part);

export const Fetch = {
  withLimit: function (limit?: { start: number, limit: number }, success?: CalleeFunction, fail?: CalleeFunction) {
    return (_: any, instance: Weave) => {
      return this._execute(instance, limit, success, fail);
    }
  },
  _execute: async function (instance: Weave, limit: { start: number, limit: number }, success?: CalleeFunction, fail?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const get = await (limit
      ? model?.find({}, null, { skip: limit.start, limit: limit.limit })
      : model?.find({}));
    if (get) {
      return success ? success(get, instance) : true;
    } else return fail ? fail(false, instance) : false;
  }
}

export const Insert = Object.assign({
  _execute: async function (instance: Weave, params: { [key: string]: any }, success?: CalleeFunction, fail?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model: any = dbConnection?.model(db[0], db[1]);
    const create = await model.create(params);
    if (create) {
      return success ? success(create, instance) : true;
    } else return fail ? fail(false, instance) : false;
  }
}, part);

export const InsertMany = Object.assign({
  _execute: async function (instance: Weave, params: { [key: string]: any }, success?: CalleeFunction, fail?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model: any = dbConnection?.model(db[0], db[1]);
    const create = await model.insertMany(Object.values(params).flat());
    if (create) {
      return success ? success(create, instance) : true;
    } else return fail ? fail(false, instance) : false;
  }
}, part);

export const InsertOrUpdateWhere = (clause: string[]) => {
  const main: any = {
    _execute: async function (instance: Weave, params: { [key: string]: any }, success?: CalleeFunction, fail?: CalleeFunction) {
      const { dbConnection } = instance.options;
      const { db } = instance;
      const clause: any = {};
      Object.keys(params).forEach((key: string) => {
        if (this.clause.indexOf(key) > -1) {
          clause[key] = params[key];
          delete params[key];
        }
      });
      const model: any = dbConnection?.model(db[0], db[1]);
      const update = await model.updateOne(clause, params, { upsert: true });
      if (update) {
        return success ? success(update, instance) : true;
      } else return fail ? fail(false, instance) : false;
    }
  }
  main.clause = clause;
  return Object.assign(main, part)
};


export const UpdateWhere = (clause: string[]) => {
  const main: any = {
    _execute: async function (instance: Weave, params: { [key: string]: any }, success?: CalleeFunction, fail?: CalleeFunction) {
      const { dbConnection } = instance.options;
      const { db } = instance;
      const clause: any = {};
      Object.keys(params).forEach((key: string) => {
        if (this.clause.indexOf(key) > -1) {
          clause[key] = params[key];
          delete params[key];
        }
      });
      const model: any = dbConnection?.model(db[0], db[1]);
      const update = await model.updateOne(clause, params);
      if (update) {
        return success ? success(update, instance) : true;
      } else return fail ? fail(false, instance) : false;
    }
  };
  main.clause = clause;
  return Object.assign(main, part)
};

export const DeleteOne = Object.assign({
  _execute: async function (instance: Weave, params: { [key: string]: any }, exists?: CalleeFunction, doesNotExist?: CalleeFunction) {
    const { dbConnection } = instance.options;
    const { db } = instance;
    const model = dbConnection?.model(db[0], db[1]);
    const get = await model?.deleteOne(params);
    if (get) {
      if (exists) return exists(get, instance);
      else return true;
    } else {
      if (doesNotExist) return doesNotExist(instance);
      else return false;
    }
  }
}, part);
