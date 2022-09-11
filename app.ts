// const Weave = require('./index.js');

import Weave from ".";
import {CalleeFunction, WeaveConfiguration} from "./types";


// class HomeWeave extends Weave {
//   constructor(config: WeaveConfiguration){
//     super(config);
//   }
//
//   useAuthentication() {
//     console.log('using authentication', this);
//   }
// }
//
//
// const App = new HomeWeave({
//   driver: 'express'
// });

declare module "." {
  interface Weave {
    usePop: CalleeFunction
  }
}


Weave.prototype.usePop = function() {
  console.log('popping...');
  return this;
}

const App = new Weave({
  driver: 'express'
});

App.endpoint('/', 'GET').usePop()
