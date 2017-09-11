// index_cdn.js
// for cdn package of shadow-widget, exclude react & react-dom
// package by: browserify -u react -u react-dom src/index_cdn.js -o src/bundle_cdn.js -t [ babelify --compact false --presets [ es2015 react ] ]

'use strict';

var React = window.React;
var ReactDOM = window.ReactDOM;

var W = undefined, T = undefined;

if (!React || !ReactDOM) {
  console.log('fatal error! React or ReactDom not found, cdn version of React library should be loaded first.');
}
else {
  if (typeof React.version == 'string') {
    var bVer = React.version.split('.');
    if (parseInt(bVer[0]) == 0 && parseInt(bVer[1]) < 14)
      console.log('warning: react@>=0.14 is required, current is ' + React.version);
  }
  W = require('./react_widget');
  T = require('./template');
}

//---------------------------------
// trigger shadow-widget's loading
//---------------------------------
var exportModules = {
  react: React,
  'react-dom': ReactDOM,
  'shadow-widget': W,
};

var reactRequire_ = arguments[3], reactModules_ = arguments[4], reactExport_ = arguments[5];
if ((typeof reactRequire_ == 'function') && reactModules_) {         // from browserify
  Object.keys(exportModules).forEach( function(sName) {
    reactExport_[sName] = { exports:exportModules[sName] };
  });
  
  // regist pseudo module, module ID is fixed to 9998 (cdn)
  reactModules_[9998] = [W.$utils.loadingEntry,reactModules_[1][1]]; // reactModules_[1][1] is first module's depending modules dict
  setTimeout( function() {
    if (!W.$main.isStart) {
      W.$main.isStart = true;
      reactRequire_(reactModules_,reactExport_,[9998]); // load pseudo module
    }
  },300);  // delay, wait main modules ready and let window initial event run first
}
else if (typeof __webpack_require__ != 'undefined' && __webpack_require__.c) { // from webpack  
  // regist pseudo module, module ID is fixed to 9998
  var module = { exports:{}, id:9998, loaded:true };
  __webpack_require__.c[9998] = module;
  
  setTimeout( function() {
    if (!W.$main.isStart) {
      W.$main.isStart = true;
      W.$utils.loadingEntry( function(nameOrId) { // wrap require()
        if (typeof nameOrId == 'number')
          return __webpack_require__(nameOrId);   // such as require(1), only used when debugging
        else {
          var ret = exportModules[nameOrId];
          if (!ret)
            console.log('can not find module: ' + nameOrId);
          return ret;
        }
      }, module,module.exports);
    }
  },300);
}
else console.log('fatal error: unknown package tool!');
