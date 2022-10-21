import * as Mongoose from "mongoose";

export interface FernConfiguration {
  dbConnection?: DatabaseConnection,
  driver?: 'express'
}

export enum DatabaseType {
  Mongoose = 1,
  MongoDB = 2
}

// export type CalleeFunction = (...args: any[]) => boolean | Promise<boolean> | { code: number, message?: string, stack?: any }
export type CalleeFunction<T = any> = (...args: T[]) => boolean | Promise<boolean> | { code: number, message?: string, stack?: any }

export type DatabaseConnection = Mongoose.Connection;
