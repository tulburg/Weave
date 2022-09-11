import {Validator, Schema} from "jsonschema";
import Weave from "..";
import {CalleeFunction} from "../types";

export function JSONSchemaValidator(keys: {[key: string]: Schema}, success?: CalleeFunction, fail?: CalleeFunction) {
  return (weave: Weave) => {
    const { nextParams, nextBody, nextMethod } = weave;
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
