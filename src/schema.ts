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
