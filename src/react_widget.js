'use strict';

var React = window.React || require('react');
var ReactDOM = window.ReactDOM || require('react-dom');

var widgetCount_ = 0;

function deepFirstFind(node,s) { // s is string, not int
  var item = node[s];
  if (item) return item;
  
  for (var sKey in node) {       // sKey is: 'attr' or '1','2' ... 
    if (sKey != 'parent' && node.hasOwnProperty(sKey)) {
      var obj = node[sKey];
      if (Array.isArray(obj) && obj.W) {
        obj = deepFirstFind(obj,s);
        if (obj) return obj;
      }
    }
  }
  return undefined;
}

function ReactWidget(selector) { // selector: N .N .name name name.subName name.N name.N.subName
  var sType = typeof selector;
  if (sType == 'number') {
    if (this.W)
      return this[selector]
    else return W[selector];
  }
  
  if (!selector) {
    if (selector === '')
      return W;                    // ReactWidget(''), return root widget
    else {
      var obj = new Array();
      // obj.$id = widgetCount_++; // no need regist id
      // obj.component = {};       // no need regist component
      return extendWidget(obj);    // new ReactWidget(), create an empty ReactWidget
    }
  }
  
  if (sType == 'object') {
    var isBare = selector.constructor === Object;  // selector is {...}
    var obj = new Array();
    obj.$id = widgetCount_++;
    obj.component = selector;  // ReactWidget(instance)
    
    if (!isBare) selector.widget = obj; // loop-back hook, should unhook in componentWillUnmount() 
    return extendWidget(obj);
  }
  
  if (sType != 'string')  // not support, try return root widget
    return W;
  // else, query ReactWidget by selector
  
  var wd = undefined, b = selector.split('.'), iNum = 0;
  if (b[0]) {  // xxx
    var item = b.shift();
    iNum += 1;
    
    wd = (Array.isArray(this) && this.W? this: W);
    
    if (item[0] == '-') {  // -1, -2 ...
      var sTmp = item.slice(1);
      if (sTmp.search(/^[0-9]+$/) == 0)
        wd = wd[Math.max(0,wd.length-parseInt(sTmp))];
      else if (wd === W)
        wd = deepFirstFind(wd,item);
      else wd = wd[item];
    }
    else {
      if (item.search(/^[0-9]+$/) == 0)
        wd = wd[parseInt(item)];
      else if (wd === W)
        wd = deepFirstFind(wd,item);
      else wd = wd[item];
    }
  }
  
  while (b.length) {
    var item = b.shift();
    iNum += 1;
    
    if (!item) {
      if (!wd && iNum == 1)
        wd = (this.W? this: W);  // .xxx
      else return wd;   // item should not be ''
    }
    else {
      if (item[0] == '-') {  // -1, -2 ...
        var sTmp = item.slice(1);
        if (sTmp.search(/^[0-9]+$/) == 0) {
          if (wd)
            wd = wd[Math.max(0,wd.length-parseInt(sTmp))];
          else return wd;
        }
        else {
          if (wd)
            wd = wd[item];
          else return wd;
        }
      }
      else {
        if (item.search(/^[0-9]+$/) == 0) {
          if (wd)
            wd = wd[parseInt(item)];
          else return wd;
        }
        else {
          if (wd)
            wd = wd[item];
          else return wd;
        }
      }
    }
  }
  return wd;
}

var wdgtProto_ = {
  W: ReactWidget,
  
  $set: function(attr,v) {
    if (attr || attr === 0) {   // attr can be: 'attr', 0,1 ...
      if (Array.isArray(v) && v.W) {
        var old = this[attr];
        this[attr] = v;
        v.parent = this;
        
        if (Array.isArray(old) && old.W)
          delete old.parent;
      }
      else if (!v) { // clear one item
        var old = this[attr];
        delete this[attr];  // 'delete this[N]' will assign undefined
        
        if (Array.isArray(old) && old.W)
          delete old.parent;
      }
      // else, ignore
    }
  },
  
/* // disable using: W.push/splice/unshift/shift/pop
  push: function() {
    var iRet = this.length;
    for (var i=0,item; item=arguments[i]; i++) {
      if (Array.isArray(item) && item.W) {
        iRet = Array.prototype.push.call(this,item);
        item.parent = this;
      }
    }
    return iRet;
  },
  push: function() {
    throw new Error('not support push()');
  },
  splice: function() {
    throw new Error('not support splice()');
  },
  unshift: function() {
    throw new Error('not support unshift()');
  },
  shift: function() {
    throw new Error('not support shift()');
  },
  pop: function() {
    throw new Error('not support pop()');
  }, */
  
  $unhook: function(targ,attr) {
    if (!(Array.isArray(targ) && targ.W)) return;
    var tp = typeof attr;
    
    if (tp == 'string' || tp == 'number') {
      if (this[attr] === targ)
        delete this[attr];
    }
    else { // take attr as undefined
      var b = Object.keys(this);
      for (var i=0,sKey; sKey = b[i]; i+=1) {
        if (targ === this[sKey]) {
          delete this[sKey];  // sKey maybe 'attr' or '0','1' ...
          break;              // only remove one extractly target
        }
      }
    }
    delete targ.parent;
    delete targ.$callspace;
  },
  
  getPath: function(sPost) {  // assume using this.parent
    var owner = this.parent;
    if (!owner || !owner.W || owner === this)
      return sPost || '';     // no parent
    else {
      if (this.component) {
        var keyid = this.component.$gui.keyid;
        if (keyid || keyid === 0)   // if keyid valid return quickly
          return owner.getPath('.' + keyid + (sPost || ''));
      }
      
      // try deep search
      var sPostfix = '';
      for (var sKey in owner) {     // sKey is: 'attr' or '1','2' ... 
        if (sKey != 'parent' && owner.hasOwnProperty(sKey) && owner[sKey] === this) {
          sPostfix = '.' + sKey;
          break;
        }
      }
      if (sPost) sPostfix += sPost;
      return owner.getPath(sPostfix);
    }
  },
};

function extendWidget(obj) {
  for (var sKey in wdgtProto_) {
    obj[sKey] = wdgtProto_[sKey];
  }
  if (W && W.__debug__) {
    obj.queryById = function(iId) {
      return deepFirstFind2(this,parseInt(iId));
    };
    obj.addShortcut = function() {
      var bRet = [];
      var obj = this.component;
      if (!obj) return bRet;
      
      for (var i=0,item; item = arguments[i]; i++) {
        var itemValue = obj[item];
        if (typeof itemValue == 'function') {
          this[item] = makeFunc(obj,itemValue);
          bRet.push(item);
        }
        else if (itemValue)
          this[item] = itemValue;
      }
      return bRet;
    };
  }
  return obj;
  
  function makeFunc(obj,fn) {
    return function() {
      return fn.apply(obj,arguments);
    };
  }
  
  function deepFirstFind2(node,iId) { // iId is int
    if (node.$id === iId) return node;
    
    for (var sKey in node) {          // sKey is: 'attr' or '1','2' ... 
      if (sKey != 'parent' && node.hasOwnProperty(sKey)) {
        var obj = node[sKey];
        if (Array.isArray(obj) && obj.W) {
          obj = deepFirstFind2(obj,iId);
          if (obj) return obj;
        }
      }
    }
    return undefined;
  }
}

var W = window.W;          // window.W is [] in CDN version
if (Array.isArray(W))
  extendWidget(W);
else {
  W = new ReactWidget();
  W.$modules = [];
  // window.W = W;         // for cdn version
}

// W.$dataSrc = undefined; // undefined or {sPath:dInitProp}
W.$templates = {};
W.$css       = [];
W.$main      = { $$onLoad:[], $onReady:[], $onLoad:[], isReady:false, inRunning:false, inDesign:false, isStart:false };
W.$idSetter  = {};
W.$creator   = {};
W.$staticNodes = [];

function wdgtExtending(comp) { // must be called by: new wdgtExtending(comp)
  this.component = comp;
}

W.$creator.createEx = function(comp) {
  var self = new wdgtExtending(comp);
  if (typeof self.init == 'function')
    self.init();
  return self;
};

var utils = W.$utils = {
  instantShow: function(sMsg) {
    console.log('[MSG]',sMsg);
  },
  
  widgetNum: function(iNewNum) {
    if (W.__design__) {
      if (typeof iNewNum == 'number')
        widgetCount_ = iNewNum;
    }
    return widgetCount_;
  },
  
  cssNamedColor: function(sName) {
    return undefined;  // only used in design stage, overwrite it in online_design.js
  },
  
  gotoHash: function(sHash,callback) {  // wait overwrite  // callback(sNavPath)
    if (callback) callback('');
  },
};

Object.defineProperty(utils,'DIV',{enumerable:true,configurable:false,writable:false,value:1});
Object.defineProperty(utils,'SPAN',{enumerable:true,configurable:false,writable:false,value:3});

W.$cachedClass = {};
W.$ex = new wdgtExtending(); // for extending, such as ex.update  // this.component is undefined

W.$ex.regist = function(sName,fn) { // for extending, init() is special that will be called on creating
  if (sName && fn)
    wdgtExtending.prototype[sName] = fn;
};

// define ex.update
//------------------------ port from react/lib/update

var update_ = (function() {

function assign(target, sources) {
  if (target == null) {
    throw new TypeError('Object.assign target cannot be null or undefined');
  }

  var to = Object(target);
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
    var nextSource = arguments[nextIndex];
    if (nextSource == null) {
      continue;
    }

    var from = Object(nextSource);

    // We don't currently support accessors nor proxies. Therefore this
    // copy cannot throw. If we ever supported this then we must handle
    // exceptions and side-effects. We don't support symbols so they won't
    // be transferred.

    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }
  }

  return to;
}

function keyOf(oneKeyObj) {
  var key;
  for (key in oneKeyObj) {
    if (!oneKeyObj.hasOwnProperty(key)) {
      continue;
    }
    return key;
  }
  return null;
}

function invariant(condition, format, a, b, c, d, e, f) {
  if (process.env.NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}

var hasOwnProperty = ({}).hasOwnProperty;

function shallowCopy(x) {
  if (Array.isArray(x)) {
    return x.concat();
  } else if (x && typeof x === 'object') {
    return assign(new x.constructor(), x);
  } else {
    return x;
  }
}

var COMMAND_PUSH = keyOf({ $push: null });
var COMMAND_UNSHIFT = keyOf({ $unshift: null });
var COMMAND_SPLICE = keyOf({ $splice: null });
var COMMAND_SET = keyOf({ $set: null });
var COMMAND_MERGE = keyOf({ $merge: null });
var COMMAND_APPLY = keyOf({ $apply: null });

var ALL_COMMANDS_LIST = [COMMAND_PUSH, COMMAND_UNSHIFT, COMMAND_SPLICE, COMMAND_SET, COMMAND_MERGE, COMMAND_APPLY];

var ALL_COMMANDS_SET = {};

ALL_COMMANDS_LIST.forEach(function (command) {
  ALL_COMMANDS_SET[command] = true;
});

function invariantArrayCase(value, spec, command) {
  !Array.isArray(value) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): expected target of %s to be an array; got %s.', command, value) : invariant(false) : undefined;
  var specValue = spec[command];
  !Array.isArray(specValue) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): expected spec of %s to be an array; got %s. ' + 'Did you forget to wrap your parameter in an array?', command, specValue) : invariant(false) : undefined;
}

return ( function update(value, spec) {
  !(typeof spec === 'object') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): You provided a key path to update() that did not contain one ' + 'of %s. Did you forget to include {%s: ...}?', ALL_COMMANDS_LIST.join(', '), COMMAND_SET) : invariant(false) : undefined;

  if (hasOwnProperty.call(spec, COMMAND_SET)) {
    !(Object.keys(spec).length === 1) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Cannot have more than one key in an object with %s', COMMAND_SET) : invariant(false) : undefined;

    return spec[COMMAND_SET];
  }

  var nextValue = shallowCopy(value);

  if (hasOwnProperty.call(spec, COMMAND_MERGE)) {
    var mergeObj = spec[COMMAND_MERGE];
    !(mergeObj && typeof mergeObj === 'object') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): %s expects a spec of type \'object\'; got %s', COMMAND_MERGE, mergeObj) : invariant(false) : undefined;
    !(nextValue && typeof nextValue === 'object') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): %s expects a target of type \'object\'; got %s', COMMAND_MERGE, nextValue) : invariant(false) : undefined;
    assign(nextValue, spec[COMMAND_MERGE]);
  }

  if (hasOwnProperty.call(spec, COMMAND_PUSH)) {
    invariantArrayCase(value, spec, COMMAND_PUSH);
    spec[COMMAND_PUSH].forEach(function (item) {
      nextValue.push(item);
    });
  }

  if (hasOwnProperty.call(spec, COMMAND_UNSHIFT)) {
    invariantArrayCase(value, spec, COMMAND_UNSHIFT);
    spec[COMMAND_UNSHIFT].forEach(function (item) {
      nextValue.unshift(item);
    });
  }

  if (hasOwnProperty.call(spec, COMMAND_SPLICE)) {
    !Array.isArray(value) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Expected %s target to be an array; got %s', COMMAND_SPLICE, value) : invariant(false) : undefined;
    !Array.isArray(spec[COMMAND_SPLICE]) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): expected spec of %s to be an array of arrays; got %s. ' + 'Did you forget to wrap your parameters in an array?', COMMAND_SPLICE, spec[COMMAND_SPLICE]) : invariant(false) : undefined;
    spec[COMMAND_SPLICE].forEach(function (args) {
      !Array.isArray(args) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): expected spec of %s to be an array of arrays; got %s. ' + 'Did you forget to wrap your parameters in an array?', COMMAND_SPLICE, spec[COMMAND_SPLICE]) : invariant(false) : undefined;
      nextValue.splice.apply(nextValue, args);
    });
  }

  if (hasOwnProperty.call(spec, COMMAND_APPLY)) {
    !(typeof spec[COMMAND_APPLY] === 'function') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'update(): expected spec of %s to be a function; got %s.', COMMAND_APPLY, spec[COMMAND_APPLY]) : invariant(false) : undefined;
    nextValue = spec[COMMAND_APPLY](nextValue);
  }

  for (var k in spec) {
    if (!(ALL_COMMANDS_SET.hasOwnProperty(k) && ALL_COMMANDS_SET[k])) {
      nextValue[k] = update(value[k], spec[k]);
    }
  }

  return nextValue;
});

})();

W.$ex.regist('update',update_);

// define shallowCompare
//------------------------ port from react-addons-shallow-compare
(function() {
var hasOwnProperty = Object.prototype.hasOwnProperty;

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  var bHasOwnProperty = hasOwnProperty.bind(objB);
  for (var i = 0; i < keysA.length; i++) {
    if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
}

function shallowCompare(instance,nextProps,nextState) {
  var thisProps = instance.props || {}, thisState = instance.state || {};
  if ( Object.keys(thisProps).length !== Object.keys(nextProps).length ||
       Object.keys(thisState).length !== Object.keys(nextState).length )
    return true;
  
  for (var key in nextProps) {
    if (!shallowEqual(thisProps[key],nextProps[key])) return true;
  }
  for (var key in nextState) {
    if (!shallowEqual(thisState[key],nextState[key])) return true;
  }
  return false;
}

this.shallowEqual = shallowEqual;     // W.$utils.shallowEqual(a,b)
this.shallowCompare = shallowCompare; // W.$utils.shallowCompare(obj,p,s)

// utils.shouldUpdate is default using, change it: W.$utils.shouldUpdate = function(obj,p,s){return true};
this.shouldUpdate = shallowCompare;
}).call(utils);
//------------------------

// inline markdown process
//------------------------ from github.com/chjj/marked/blob/master/lib/marked.js
(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *(>|&gt;|::)[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *(>|&gt;|::) ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;  // '"

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,     // '"
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')  // '"
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')    // '
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')  // '"
    // closing doubles
    .replace(/"/g, '\u201d')    // "
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')  // "
    .replace(/'/g, '&#39;');  // '
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

/* if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}  */

this.marked = marked;  // regist as W.$utils.marked

}).call(utils);
//------- end of chjj/marked --------

var re_plain_ = /^(?:plain|text)$/i;
var re_html_ = /^(?:xml|html|xhtml|rss|atom|xjb|xsd|xsl|plist|markdown|md|mkdown|mkd)$/i;
var re_lt_ = /&lt;/g, re_gt_ = /&gt;/g, re_amp_ = /&amp;/g;

( function(hljs) {
  if (!hljs || !hljs.highlight) return;
  
  utils.marked.setOptions( {
    highlight: function (code,sTag) {
      var isHtml = false;
      if (sTag) {
        if (sTag.search(re_plain_) == 0)
          sTag = 'plain';
        else if (sTag.search(re_html_) == 0)
          isHtml = true;
      }
      else sTag = 'plain';
      
      if (sTag == 'plain' || !isHtml)
        code = code.replace(re_lt_,'<').replace(re_gt_,'>').replace(re_amp_,'&');
      if (sTag == 'plain')
        return code;
      else return hljs.highlight(sTag,code,true).value;
    }
  });
})(window.hljs);  // fix to cdn version of highlight.js

// inline jsonp/ajax process
//--------------------------
(function() {

if (!window.TRIGGER__) window.TRIGGER__ = {count:0};

function newJsonPid_() {
  return ++window.TRIGGER__.count;
}

var validHeadType_ = {GET:1, POST:1, PUT:1, DELETE:1, HEAD:1};

// req:{url:sUrl,data:dInput,callback:fn,scriptCharset:'utf-8',notifyError:false}
function jsonp(req) {
  var sUrl = req.url, inData = req.data, callback = req.callback;
  if (!sUrl || typeof sUrl != 'string')
    throw new Error('invalid URL');
  if (inData && typeof inData != 'object')
    throw new Error('invalid input argument (data)');
  if (typeof callback != 'function')
    throw new Error('input argument (callback) should be a function');
  
  var id = newJsonPid_();
  if (sUrl.indexOf('?') > 0)
    sUrl += '&';
  else sUrl += '?';
  sUrl += 'callback=TRIGGER__%5B' + id + '%5D'; // encodeURIComponent('[' + id + ']')
  
  if (inData) {
    Object.keys(inData).forEach( function(sKey) {
      var item = inData[sKey];
      sUrl += '&' + sKey + '=' + encodeURIComponent(item+'');
    });
  }
  
  var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  var script = document.createElement('script');
  script.async = 'async';
  if (req.scriptCharset)
    script.charset = req.scriptCharset;
  script.src = sUrl;
  script.onload = script.onreadystatechange = function() {
    if (!script.readyState || /loaded|complete/.test(script.readyState)) {
      script.onload = script.onreadystatechange = null; // handle memory leak in IE
      if (head && script.parentNode) // remove the script node
        head.removeChild(script);
      
      script = undefined;   // dereference the script
      setTimeout( function() {
        var fn = window.TRIGGER__[id];
        if (fn) {
          delete window.TRIGGER__[id];
          if (req.notifyError)
            callback(null); // null means failed, fn not removed in TRIGGER__[id]() yet
        }
      },0);
    }
  };
  head.insertBefore(script,head.firstChild);
  
  window.TRIGGER__[id] = function(json) {
    var fn = window.TRIGGER__[id];
    if (fn) {
      delete window.TRIGGER__[id]; // unregist callback: TRIGGER__[xxx]
      callback(json);
    }
  };
}
this.jsonp = jsonp;  // regist as W.$utils.jsonp

// req: {type:GET_POST_PUT,url:sUrl,data:dInput,
//   dataType:'json',   // 'json' or 'text', default is 'text'
//   timeout:0,headers:{},succuss:fn,error:fn,username:s,password:s }

var _multiLnPattern  = /"{3}[^\\]*(?:\\[\S\s][^\\]*)*"{3}/gm;
var _commentPattern  = /^\s*\/\/.*$/gm;

function ajax(req) {
  var sUrl = req.url, sType = (req.type || 'GET').toUpperCase(), inData = req.data;
  if (!sUrl || typeof sUrl != 'string')
    throw new Error('invalid URL');
  if (inData && typeof inData != 'object')
    throw new Error('invalid input argument (data)');
  if (!(sType in validHeadType_))
    throw new Error('invalid request type (' + sType + ')');
  
  var iTimeout = req.timeout || 60000; // default max wait 60 seconds
  var hasQuest = sUrl.indexOf('?') > 0;
  var dataType = req.dataType;
  if (dataType === undefined && sUrl.slice(-5) == '.json')
    dataType = 'json';
  
  var sendData = null;
  if (inData) {
    if (sType != 'PUT' && sType != 'POST') {
      Object.keys(inData).forEach( function(sKey) {
        var item = inData[sKey];
        if (!hasQuest) {
          hasQuest = true;
          sUrl += '?';
        }
        else sUrl += '&';  // send with application/x-www-form-urlencoded
        sUrl += sKey + '=' + encodeURIComponent(item+'');
      });
    }
    else sendData = JSON.stringify(inData);  // send with json format
  }
  
  var xmlHttp = null, finished = false;    
  if (window.XMLHttpRequest)      // Firefox, Opera, IE7, etc
    xmlHttp = new XMLHttpRequest();
  else if (window.ActiveXObject)  // IE6, IE5
    xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
  if (!xmlHttp)
    throw new Error('invalid XMLHttpRequest');
  
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4) { // 4 is "loaded"
      var resText = xmlHttp.responseText || '';
      var statusText = xmlHttp.statusText || '', status = xmlHttp.status || (resText?200:404);
      if (finished)
        ;  // do nothing
      else if ((status >= 200 && status < 300) && resText) {
        var isPre = false;
        if (dataType === 'json' || (dataType === 'pre-json' && (isPre=true))) { // take as json
          var jsonData, isErr = true;
          try {
            if (isPre) {
              resText = resText.replace(_multiLnPattern, function (s) {
                var sBody = s.slice(3,-3).replace(/\\/gm,'\\\\').replace(/\n/gm,'\\n').replace(/"/gm,'\\"');  // "'
                return '"' + sBody + '"';
              });
              resText = resText.replace(_commentPattern,'');
            }
            jsonData = JSON.parse(resText.replace(/[\cA-\cZ]/gi,''));
            isErr = false;
          }
          catch(e) {
            if (req.error) {
              statusText = 'JSON format error';
              req.error(xmlHttp,statusText);
            }
          }
          if (!isErr && req.success) req.success(jsonData,statusText,xmlHttp);
        }
        else {  // take as plain text
          if (req.success) req.success(resText,statusText,xmlHttp);
        }
      }
      else {  // failed
        if (req.error)
          req.error(xmlHttp,statusText);
      }
      xmlHttp = null;
      finished = true;
    }
  };
  
  var sName, headers;
  if (req.username)
    xmlHttp.open(sType,sUrl,true,req.username,req.password);
  else xmlHttp.open(sType,sUrl,true);
  if (headers = req.headers) {
    for (sName in headers) {
      xmlHttp.setRequestHeader(sName,headers[sName]);
    }
  }
  if (sendData)
    xmlHttp.setRequestHeader('Content-Type','application/json');
  xmlHttp.send(sendData);
  
  if (typeof iTimeout == 'number') {
    setTimeout( function() {
      if (!finished) {
        finished = true;
        xmlHttp.abort();
        if (req.error)
          req.error(xmlHttp,'request timeout');
        xmlHttp = null;
      }
    },iTimeout);
  }
}
this.ajax = ajax;  // regist as W.$utils.ajax

}).call(utils);
//------- end of jsonp/ajax --------

utils.loadingEntry = function(require,module,exports) {
  var containNode_ = document.getElementById('react-container');
  if (!containNode_) return;
  
  if (containNode_.hasAttribute('__debug__'))
    W.__debug__  = parseInt(containNode_.getAttribute('__debug__') || 0);
  if (containNode_.hasAttribute('__design__'))
    W.__design__ = parseInt(containNode_.getAttribute('__design__') || 0);
  if (window.W !== W) { // old window.W maybe only has W.$modules
    if (window.W) W.$modules = window.W.$modules; // main.js maybe included after react-widget
    if (W.__debug__ || W.__design__)
      window.W = W;     // regist for debugging
  }
  
  var bImporting_ = W.$modules;
  if (Array.isArray(bImporting_)) {
    bImporting_.forEach( function(fn) {
      if (typeof fn == 'function')
        fn.call(exports,require,module,exports);
    });
    bImporting_.splice(0);  // clear
  }
  
  function loadCssModule(bCss,sFilter,callback) {
    var b = [];
    bCss.forEach( function(item) { // item[0]: 'pseudo' for plugin-editor, 'basic' for loading before render, 'lazy' for no waiting load
      if (item[0] == sFilter) b.push(item[1]); // item[1] is sUrl
    });
    
    var cssNum = b.length, loaded = 0;
    if (cssNum) {
      b.forEach( function(sUrl) {
        var node = document.createElement('link');
        if ('onload' in node) {
          if (callback) {
            node.onload = function(event) {
              loaded += 1;
              if (loaded >= cssNum) callback();
            };
          }
          node.setAttribute('rel','stylesheet');
          node.setAttribute('href',sUrl);
          document.head.appendChild(node);
        }
        else {
          node = document.createElement('img');
          if (callback) {
            node.onerror = function(event) {
              loaded += 1;
              if (loaded >= cssNum) callback();
            };
          }
          node.setAttribute('src',sUrl);
          document.body.appendChild(node);
        }
      });
    }
    else {
      if (callback) callback();
    }
  }
  
  var b = document.querySelectorAll('link[rel="stylesheet"]');
  for (var i=b.length-1,item; i >= 0; i -= 1) {
    var item = b[i], s = item.getAttribute('shared');
    if (s && s != 'false' && s != '0')
      W.$css.unshift(['pseudo',item.href]);
  }
  
  loadCssModule(W.$css,'basic', function() {
    loadCssModule(W.$css,'lazy');  // no waiting
    
    var _msPattern = /^-ms-/;
    var _hyphenPattern = /-(.)/g;
    var _jsStrPattern  = /(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*")/g;
    var _dotNumPattern = /\.[0-9]/;  // just check one number char
    
    var T = W.$templates;
    var main = W.$main;
    var utils = W.$utils;
    var dataSource = W.$dataSrc;
    var dTemplate = {}, dTemplate2 = {};  // dTemplate is default template extending, dTemplate2 is original
    
    var dataSegment_ = ['data','$data','dual','$dual','aria','$aria'];
    
    function jsxJsonParse(sJson,sAttr,sPrefix,idx) {
      try {
        return JSON.parse(sJson);
      }
      catch(e) {
        console.log('invalid JSON format: ' + (sPrefix?sPrefix+'['+idx+'].':'') + sAttr);
      }
      return undefined;
    }
    
    function camelizeStyleName(s) {
      return s.replace(_msPattern,'ms-').replace(_hyphenPattern, function(_,chr) {
        return chr.toUpperCase();
      });
    }
    
    function transCssStyle(sStyle,node) {
      sStyle = sStyle.replace(_jsStrPattern,'');  // remove string literally
      var b = sStyle.split(';'), bProp = [];
      b.forEach( function(item) {
        var iPos = item.indexOf(':');
        if (iPos > 0) {
          item = item.slice(0,iPos).trim();
          if (item) bProp.push(item);  // get every property item
        }
      });
      
      var dRet = {}, hasSome = false;
      bProp.forEach( function(item) {
        var item2 = camelizeStyleName(item);
        var sValue = node.style[item2];
        if (sValue) {
          dRet[item2] = sValue;
          hasSome = true;
        }
        else if (item != item2) {
          sValue = node.style[item];
          if (sValue) {
            dRet[item] = sValue;
            hasSome = true;
          }
        }
      });
      return (hasSome?dRet:null);
    }
    
    function scanNodeAttr(node,sPrefix,idx) {
      var sTemplate = '', bProp = [], sStyle='', attrLen = node.attributes.length;
      var isSpan = false, isPre = false;
      for (var i2=0; i2 < attrLen; i2++) {
        var sNodeTag, item = node.attributes[i2], sName = item.name;
        if (sName == '$') {
          var ch, sValue = item.value;
          if (!sValue) return null;     // invalid node
          
          if ((sNodeTag=node.nodeName) == 'SPAN')
            isSpan = true;
          else if (sNodeTag == 'PRE')
            isPre = true;
          
          if ((ch=sValue[0]) == '.' || ch == '/') {
            bProp.push([sName,sValue]); // is link path
            sTemplate = isSpan? 'RefSpan': 'RefDiv';
          }
          else sTemplate = sValue;
        }
        else if (sName == 'style')
          sStyle = item.value;
        else bProp.push([sName,item.value]);
      }
      
      if (sTemplate) {
        var dProp = {};
        if (sStyle) {
          var dStyle = (sStyle[0] == '{' && sStyle.slice(-1) == '}')? 
                jsxJsonParse(sStyle.slice(1,-1),'style',sPrefix,0):
                transCssStyle(sStyle,node);
          if (dStyle) dProp.style = dStyle;
        }
        
        bProp.forEach( function(item) {
          var sValue = item[1], sAttr = item[0]; // item[0].toLowerCase()
          var b = sAttr.split('-'); // sAttr should be lowercased
          if (b.length > 1 && dataSegment_.indexOf(b[0]) < 0) { // keep: dual- $dual- data- $data- aria- $aria-
            sAttr = b.shift();
            while (b.length) {
              var s = b.shift();
              if (s) sAttr += s[0].toUpperCase() + s.slice(1);
            }
          }
          if (sAttr == 'className') return;  // ignore class-name
          
          if (sValue && sValue[0] == '{' && sValue[sValue.length-1] == '}' && sAttr[0] != '$')
            dProp[sAttr] = jsxJsonParse(sValue.slice(1,-1),sAttr,sPrefix,idx);
          else dProp[sAttr] = sValue;
        });
        
        if (isPre) {
          var sText = node.innerHTML; // decodeEntity(node.innerHTML)
          if (node.children.length)
            node.innerHTML = '';      // clear children, avoid scan sub level
          if (sText) dProp['html.'] = sText;
          dProp['isPre.'] = true;
        }
        else {
          if (node.children.length == 0) { // <span $=Span>htmlText</span>
            var sText = node.textContent;
            if (sText) dProp['html.'] = sText;
          }
        }
        return [sTemplate,dProp,[]];
      }
      else return null;
      
/*    function decodeEntity(s) {
        if (!s) return '';
        var textArea = document.createElement('textarea');
        textArea.innerHTML = s;
        return textArea.value;
      } */
    }
    
    function scanJsxNode(container) {
      if (!container) return null;
      
      var bRet = [null,null,[]], bKeyids = [''];
      if (scanOneLevel(bRet,container,true,''))
        return bRet[2][0];
      else return null;
      
      function scanOneLevel(bOwner,htmlNode,isTopmost,sPrefix) {
        var bChild = bOwner[2];
        
        for (var i=0,node; node=htmlNode.children[i]; i++) { // not use htmlNode.childNodes that includes text segment
          var item = scanNodeAttr(node,sPrefix,i);
          if (isTopmost) {
            if (i == 0 && (!item || item[0] != 'BodyPanel')) {
              console.log('error: root node of JSX should be BodyPanel');
              return false;
            }
            
            // adjust key/width/height for topmost, others will be adjusted in getInitialState() 
            var dProp_ = item[1];
            if (dProp_.hasOwnProperty('width')) {
              // dProp_.width = parseFloat(dProp_.width);
              if (isNaN(dProp_.width)) dProp_.width = null; // avoid invalid using '200px'
            }
            if (dProp_.hasOwnProperty('height')) {
              // dProp_.height = parseFloat(dProp_.height);
              if (isNaN(dProp_.height)) dProp_.height = null;
            }
            
            if (i > 0) return true;  // if is topmost, only scan first child node
          }
          
          if (!item) {
            bChild.push(node);
          }
          else {
            bChild.push(item);
            
            var sKeyid = (item[1].key || i) + '';
            bKeyids.push(sKeyid);
            item[3] = bKeyids.join('.');
            
            var toReturn = false;
            var sPath = (sPrefix? sPrefix + '[' + i + '].' + item[0]: item[0]);
            if (!scanOneLevel(item,node,false,sPath)) // quit if failed
              toReturn = true;
            
            bKeyids.pop();
            if (toReturn) return false;
          }
        }
        return true;
      }
    }
    
    function loadTemplate(sName,sPath,noDotNum) {
      var isCustom = noDotNum && !W.__design__, shadowCls = null;
      if (isCustom) {
        shadowCls = main[sPath];
        if (!shadowCls) isCustom = false;
      }
      
      var temp = (isCustom? dTemplate2[sName]: dTemplate[sName]);
      if (!isCustom) {
        if (temp) return temp;
        temp = dTemplate2[sName];
        if (temp) {
          temp = dTemplate[sName] = React.createClass(temp._extend());
          return temp;
        }
      }
      
      if (!temp) {
        var b = sName.split('.'), sAttr = b.shift();
        temp = T[sAttr];
        while (temp && (sAttr = b.shift())) {
          temp = temp[sAttr];
        }
        if (!temp || !temp._extend) {
          console.log('error: can not find template (' + sName + ')');
          return null;
        }
        dTemplate2[sName] = temp;  // cache original template
      }  // else, assert(temp && isCustom), temp also is original template
      
      if (isCustom)
        return React.createClass(temp._extend(shadowCls));
      else {  // cache template extending
        temp = dTemplate[sName] = React.createClass(temp._extend());
        return temp;
      }
    }
    
    function makeReactComp(bNode,parentHasNum) {
      var tempName = bNode[0], sPath = bNode[3];
      var noDotNum = (!parentHasNum && sPath && sPath.search(_dotNumPattern) < 0);  // no .Number
      var temp = loadTemplate(tempName,sPath,noDotNum);
      if (!temp) return null;
      
      var dProp = bNode[1], bChild = bNode[2], iNum = bChild.length;
      if (noDotNum && dataSource && !W.__design__) {
        var dInitProp = dataSource[sPath];
        if (dInitProp) Object.assign(dProp,dInitProp);
      }
      var bArgs = [temp,dProp], hasStatic = false, parentHasNum_ = !noDotNum;
      
      for (var i=0; i < iNum; i++) {
        var item = bChild[i];
        if (Array.isArray(item)) {  // assert(item.length >= 4)
          var child = makeReactComp(item,parentHasNum_);
          if (child) bArgs.push(child);
        }
        else {  // item is static html node
          var tmpNode, bList = [item];
          if (!item.classList.contains('rewgt-static')) {
            while (i+1 < iNum && !Array.isArray(tmpNode=bChild[i+1])) { // try get continous node
              i += 1;
              bList.push(tmpNode);
            }
          }
          for (var i2 = bList.length-1; i2 >= 0; i2--) {
            tmpNode = bList[i2];
            if (tmpNode.classList.contains('rewgt-static')) {
              bList.splice(i2,1);
              for (var i3=tmpNode.childNodes.length-1; i3 >= 0; i3--) {
                bList.splice(i2,0,tmpNode.childNodes[i3]); // include text node
              }
            }
          }
          
          var idx = W.$staticNodes.push(bList) - 1;
          bArgs.push(React.createElement('div',{className:'rewgt-static',name:idx+''}));
          hasStatic = true;
        }
      }
      if (hasStatic) dProp['hasStatic.'] = true;
      return React.createElement.apply(null,bArgs);
    }
    
    W.$creator.scanNodeAttr = scanNodeAttr;
    
    var container = document.getElementById('react-container');
    var bJsxNode = scanJsxNode(container);
    if (bJsxNode) {
      var bodyEle = makeReactComp(bJsxNode,false);
      if (bodyEle) {
        W.$cachedClass = dTemplate;
        ReactDOM.render(bodyEle,container, function() {
          W.$dataSrc = null;
          container.style.visibility = 'visible';
          
          main.isReady = true;
          var onLoad = main.$$onLoad_;
          if (typeof onLoad == 'function')
            onLoad();
        });
      }
    }
  });  // end of loadBasicCss()
};

module.exports = W;
