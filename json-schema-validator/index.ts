import {Validator, Schema} from "jsonschema";
import Fern from "@fernjs/express";
import {CalleeFunction} from "@fernjs/express/types";

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

export const ShortText: any = {
  type: 'text',
  minLength: 1,
  maxLength: 64
}

ShortText.required = () => Object.assign(ShortText, {
  required: true
})

export const LongText: any = {
  type: 'text',
  minLength: 4,
  maxLength: 255 
}

LongText.required = () => Object.assign(LongText, {
  required: true
})
