import * as Mongoose from "mongoose";

export interface FernConfiguration {
  dbConnection?: DatabaseConnection,
  driver?: 'express',
  port?: number,
  sslKey?: string,
  sslCert?: string
}

export enum DatabaseType {
  Mongoose = 1,
  MongoDB = 2
}

// export type CalleeFunction = (...args: any[]) => boolean | Promise<boolean> | { code: number, message?: string, stack?: any }
export type CalleeFunction<T = any> = (...args: T[]) => boolean | Promise<boolean | { code: number, message?: string, stack?: any }> | { code: number, message?: string, stack?: any }
export interface Fern {
  callee: [CalleeFunction];
  registry: { [key: string]: [CalleeFunction] };

  nextDb: any[];
  nextBody: { [key: string]: any };
  nextStore: { [key: string]: any };
  nextHeader: { [key: string]: any };
  nextParams: { [key: string]: any };
  nextMethod: 'post' | 'get' | 'delete';
}

export type DatabaseConnection = Mongoose.Connection;
