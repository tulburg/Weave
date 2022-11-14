// @ts-ignore
const jwt = require('jsonwebtoken');

export type CalleeFunction<T = any> = (...args: T[]) => boolean | Promise<boolean | { code: number, message?: string, stack?: any }> | { code: number, message?: string, stack?: any }
export interface Fern {
  callee: [CalleeFunction];
  registry: {[key: string]: [CalleeFunction]};

  nextDb: any[];
  nextBody: {[key: string]: any};
  nextStore: {[key: string]: any};
  nextHeader: {[key: string]: any};
  nextParams: {[key: string]: any};
  nextMethod: 'post' | 'get' | 'delete';
}

export default {
  sign: (props: Record<string, any>, key: string, success?: CalleeFunction, fail?: CalleeFunction) => {
    return (fern: Fern) => {
      const { nextHeader } = fern;
      try {
        const token = jwt.sign({
          issuer: props && props.issuer ? props.issuer : 'x-app',
          exp: props && props.exp ? props.exp : Math.floor(Date.now() / 1000) + (60 * 60),
          timestamp: Date.now()
        }, key);
        nextHeader.token = token;
        return success ? success(token) : true;
      } catch(e) { return fail ? fail(e) : false }
    }
  }
}
