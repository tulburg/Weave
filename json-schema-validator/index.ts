import { Validator, Schema } from "jsonschema";
import Weave from "@weave-protocol/express";
import { CalleeFunction } from "@weave-protocol/express/types";

export function JSONSchemaValidator(keys: { [key: string]: Schema }, success?: CalleeFunction, fail?: CalleeFunction) {
  return (weave: Weave) => {
    const { nextParams, nextBody, nextMethod } = weave;
    const validator = new Validator(),
      parentSchema: Schema = {
        type: 'object',
        properties: keys,
        additionalProperties: false
      }, validation = validator.validate(Object.assign({}, nextMethod === 'get' ? nextParams : nextBody), parentSchema)
    if (!validation.valid) {
      const stack: any = { type: 'validation', message: validation.errors[0].stack.replace('instance.', '') };
      return fail ? fail(stack) : { code: 400, message: 'Bad request', stack };
    }
    if (success) success();
    return true;
  }
}

export const ShortText: any = {
  type: 'text',
  minLength: 1,
  maxLength: 64
}
ShortText.required = () => Object.assign(ShortText, { required: true })

export const LongText: any = {
  type: 'text',
  minLength: 4,
  maxLength: 255
}
LongText.required = () => Object.assign(LongText, { required: true })

export const Password: any = {
  type: 'text',
  minLength: 4,
  maxLength: 255
}
Password.required = () => Object.assign(Password, { required: true });

export const Username: any = {
  type: 'text',
  minLength: 2,
  maxLength: 32
}
Username.required = () => Object.assign(Username, { required: true });
