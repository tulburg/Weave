import * as Mongoose from "mongoose";
import {LongText, ShortText} from "./src/schema";

export interface WeaveConfiguration {
  driver: 'express' | 'fastify' | 'koa',
  dbDriver?: DatabaseType
  dbConnection?: DatabaseConnection
  useJSON?: boolean
}

export enum DatabaseType {
  Mongoose = 1,
  MongoDB = 2
}

export type CalleeFunction = (...args: any[]) => boolean | Promise<boolean> | { code: number, message?: string, stack?: any }

export type DatabaseConnection = Mongoose.Connection;

export type SchemaType = typeof ShortText | typeof LongText
