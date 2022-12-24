export const type = (o: any) => Object.prototype.toString.call(o).substr(8).replace(']','').toLowerCase();
