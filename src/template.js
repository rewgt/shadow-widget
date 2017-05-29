'use strict';

var React = window.React || require('react');
var ReactDOM = window.ReactDOM || require('react-dom');

var createClass_ = React.createClass;
if (!createClass_) console.log('fatal error: invalid React.createClass'); // before v15.5

var W = require('./react_widget');
var T = W.$templates, utils = W.$utils, ex = W.$ex;
var idSetter = W.$idSetter, creator = W.$creator;

( function(loc) {
  var b = loc.pathname.split('/');
  if (!b[0]) b.shift();
  creator.repoName = b.shift() || '';
  
  var sName = loc.hostname;
  creator.isLocal  = sName == 'localhost' || sName == '127.0.0.1';
  creator.isGithub = sName.indexOf('.github.io') > 0;
  creator.appBase  = function() {
    return '/app/files/rewgt/web';
  };
})(window.location);

utils.version = function() {
  return '0.1.4';
};

var vendorId_ = (function(sUA) {
  var m = sUA.match(/trident.*rv[ :]*([\d.]+)/); // >= IE11, can not use sUA.match(/msie ([\d.]+)/)
  if (m) {
    if (parseFloat(m[1]) >= 11.0)
      return ['ie',m[1]];
  }
  else {
    m = sUA.match(/firefox\/([\d.]+)/);
    if (m) return ['firefox',m[1]];
    
    m = sUA.match(/chrome\/([\d.]+)/);
    if (m) return ['chrome',m[1]];
    
    m = sUA.match(/opera.([\d.]+)/);
    if (m) return ['opera',m[1]];
    
    m = sUA.match(/safari\/([\d.]+)/);
    if (m) return ['safari',m[1]];
    
    m = sUA.match(/webkit\/([\d.]+)/);
    if (m) return ['webkit',m[1]];
  }
  
  if (sUA.match(/msie ([\d.]+)/))
    return ['ie',''];  // IE 10 or lower, no version number because I hate it!
  else return ['','']; // unknown browser
})(window.navigator.userAgent.toLowerCase());

utils.vendorId = vendorId_;

var re_decode64_ = /[^A-Za-z0-9\+\/\=]/g;
var base64Key_   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

var Base64_ = utils.Base64 = {
  encode: function(input) {
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var output = '', i = 0;
    
    input = Base64_._utf8_encode(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2))
        enc3 = enc4 = 64;
      else if (isNaN(chr3))
        enc4 = 64;
      output = output + base64Key_.charAt(enc1) + base64Key_.charAt(enc2) +
               base64Key_.charAt(enc3) + base64Key_.charAt(enc4);
    }

    return output;
  },

  decode: function(input) {
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var output = '', i = 0;
    
    input = input.replace(re_decode64_,'');
    while (i < input.length) {
      enc1 = base64Key_.indexOf(input.charAt(i++));
      enc2 = base64Key_.indexOf(input.charAt(i++));
      enc3 = base64Key_.indexOf(input.charAt(i++));
      enc4 = base64Key_.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);
      if (enc3 != 64)
        output = output + String.fromCharCode(chr2);
      if (enc4 != 64)
        output = output + String.fromCharCode(chr3);
    }
    
    output = Base64_._utf8_decode(output);
    return output;
  },

  _utf8_encode: function(string) {
    // string = string.replace(/\r\n/g,'\n');   // not replace win32 '\r\n'
    
    var utftext = '';
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);

      if (c < 128)
        utftext += String.fromCharCode(c);
      else if(c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  },

  _utf8_decode: function(utftext) {
    var c,c2,c3, i = 0, string = '';
    while ( i < utftext.length ) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if (c > 191 && c < 224) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
};

var containNode_      = null;
var topmostWidget_    = null;
var inFirstLoading_   = true;
var inReactReloading_ = false;
var justFirstRender_  = false; // root node just first render and before inFirstLoading change to false
var pendingRefers_    = [];

var splitterMouseDn_  = false;

var internalDomKey_   = '';
var getKeyFromNode_   = null;

var findDomNode_  = ReactDOM.findDOMNode;
var reactClone_   = React.cloneElement;
var reactCreate_  = React.createElement;
var children2Arr_ = React.Children.toArray;

var ReferenceProps_ = { '$': true, styles: true,
  'tagName.': true, 'isReference.': true, 'hookTo.': true,
  width: true, height: true, className: true, 'childInline.': true,
};

var ctrlExprCmd_ = ['for','if','elif','else'];

/* function htmlEncode(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
} */

function keyOfNode_(node) {
  if (!getKeyFromNode_) {
    if (node.hasAttribute('data-reactid')) {
      getKeyFromNode_ = function(node) {
        return keyOf(node.getAttribute('data-reactid') || '');
      };
    }
    else {
      for (var sKey in node) {
        if (sKey.indexOf('__reactInternalInstance$') == 0) {
          internalDomKey_ = sKey;
          break;
        }
      }
      if (!internalDomKey_) {
        console.log('warning: invalid react version!');
        return '';
      }
      
      getKeyFromNode_ = function(node) {
        return keyidOf(node[internalDomKey_]);
      };
    }
  }
  
  return getKeyFromNode_(node);
  
  function keyOf(sKeyid) {
    sKeyid = sKeyid.split('.').pop();
    if (sKeyid[0] == '$') sKeyid = sKeyid.slice(1);
    return sKeyid;
  }
  
  function keyidOf(internal) {
    var ele = internal && internal._currentElement;
    var owner = ele && ele._owner;
    var comp = owner && owner._instance;
    var gui = comp && comp.$gui;
    return gui? (gui.keyid+''): '';
  }
}

utils.keyOfNode = function(node) {
  return keyOfNode_(node);
};
utils.dragInfo = {
  inDragging: false, justResized: false,
};

var identicalId_ = 4;    // 0,1,2 reserved
function identicalId() {
  return ++identicalId_;
}
utils.identicalId = identicalId;

function classNameOf(comp) {
  var s = comp.$gui.className, s2 = comp.state.klass;
  if (s)
    return s2? s + ' ' + s2: s;
  else return s2 || '';
}
utils.classNameOf = classNameOf;

function hasClass_(sClsName, cls) {   // cls: ['clsA','clsB']  'clsA'  'clsA clsB'
  if (!sClsName) return false;
  var s2 = ' ' + sClsName + ' ';
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/), iLen = bCls.length;
  
  for (var i = 0; i < iLen; i++) {
    var sCls = bCls[i];
    if (sCls && s2.indexOf(' ' + sCls + ' ') >= 0) return true;
  }
  return false;
}

utils.hasClass = function(comp, cls) { // cls: ['clsA','clsB']  'clsA'  'clsA clsB'
  return hasClass_(classNameOf(comp),cls);
};

function addClass_(sClsName, cls) {
  var s = ' ' + (sClsName || '') + ' ';
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/), iLen = bCls.length;
  
  for (var i = 0; i < iLen; i++) {
    var sCls = bCls[i];
    if (sCls) {
      var iPos = s.indexOf(' ' + sCls + ' ');
      if (iPos < 0) s += sCls + ' ';
    }
  }
  
  return s.trim();
}

utils.addClass = function(comp, cls) {
  var sKlass = comp.state.klass || '';
  var s = ' ' + (comp.$gui.className || '') + ' ' + sKlass + ' ';
  
  var sTail = '';
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/), iLen = bCls.length;
  for (var i = 0; i < iLen; i++) {
    var sCls = bCls[i];
    if (sCls && s.indexOf(' ' + sCls + ' ') < 0)
      sTail += ' ' + sCls;
  }
  
  if (sTail) {
    if (sKlass)
      comp.duals.klass += sTail;
    else comp.duals.klass = sTail.slice(1);
    return true;  // changed
  }
  return false;   // not changed
};

function removeClass_(sClsName, cls) {
  if (!sClsName) return '';
  
  var s = ' ' + sClsName + ' ';
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/);
  
  for (var i = bCls.length - 1; i >= 0; i--) {
    var sCls = bCls[i];
    if (sCls) s = s.replace(' ' + sCls + ' ', ' ');
  }
  return s.trim();
}

function removeCls_(sClass,sKlass,cls,bAdd) {
  var s1 = ' ' + sClass, i1 = s1.length;
  var s2 = s1 + ' ' + sKlass + ' ';
  
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/);
  for (var i = bCls.length - 1; i >= 0; i--) {
    var iPos, sCls = bCls[i];
    if (sCls && (iPos = s2.indexOf(' ' + sCls + ' ')) >= 0) {
      if (iPos < i1) // can not remove className part
        throw new Error('can not remove readonly class name: ' + sCls);
      s2 = s2.slice(0,iPos) + s2.slice(iPos + sCls.length + 1);
    }
    // else, not exist sCls
  }
  
  if (Array.isArray(bAdd)) {
    var iLen2 = bAdd.length;
    for (var ii = 0; ii < iLen2; ii++) {
      var sCls = bAdd[ii];
      if (sCls && s2.indexOf(' ' + sCls + ' ') < 0)
        s2 += sCls + ' ';
    }
  }
  
  return s2.slice(i1).trim();
}

utils.removeClass = function(comp, cls, bAdd) {
  var sKlass = comp.state.klass || '';
  var sNew = removeCls_(comp.$gui.className || '',sKlass,cls,bAdd);
  if (sKlass !== sNew) {
    comp.duals.klass = sNew;
    return true;  // changed
  }
  return false;   // not changed
};

function setClass_(comp, cls) {
  var bCls = Array.isArray(cls) ? cls: String(cls).split(/ +/);
  
  var bRmv = [], bAdd = [];
  for (var i = bCls.length - 1; i >= 0; i--) {
    var sCls = bCls[i];
    if (sCls) {
      var ch = sCls[0];
      if (ch == '-')
        bRmv.unshift(sCls.slice(1));
      else if (ch == '+')
        bAdd.unshift(sCls.slice(1));
      else bAdd.unshift(sCls);
    }
  }
  
  return utils.removeClass(comp,bRmv,bAdd);
}
utils.setClass = setClass_;

var S123456_ = ['S1','S2','S3','S4','S5','S6'];

function analyseMerge_(cls) {
  var bCls = Array.isArray(cls)? cls: String(cls).split(/ +/);
  var bRmv = [], bAdd = [];
  for (var i = bCls.length - 1; i >= 0; i--) {
    var sCls = bCls[i];
    if (sCls) {
      var bSeg = sCls.split('-'), iSeg = bSeg.length;
      if (iSeg > 1) {
        for (var ii = 1; ii < iSeg; ii++) {
          var sTmp = bSeg.shift();
          bSeg.push(sTmp);
          bRmv.push(bSeg.join('-'));
        }
      }
      else {
        var iPos;
        if (sCls[0] == 'S' && (iPos=S123456_.indexOf(sCls)) >= 0) {
          S123456_.forEach( function(item,idx) {
            if (idx != iPos) bRmv.push(item);  // take S1~S6 as one group
          });
        }
      }
      
      bAdd.push(sCls);
    }
  }
  return [bRmv,bAdd];
}

creator.mergeClass = function(sClass,sKlass,sKlassNew) { // sKlassNew merge into sKlass
  var b = analyseMerge_(sKlassNew), bRmv = b[0], bAdd = b[1];
  return removeCls_(sClass,sKlass,bRmv,bAdd);
};

utils.mergeClass = function(comp,cls) {
  var b = analyseMerge_(cls), bRmv = b[0], bAdd = b[1];
  return utils.removeClass(comp,bRmv,bAdd);
};

var re_react_key_ = /^(\.\$)+/g;

function getElementKey_(child) {
  var s = (child.key || '').replace(re_react_key_,'');
  if (s[0] == '.')
    return s.slice(1);
  else return s;
}
utils.keyOfElement = getElementKey_;

function getRefProp_(sourProp) {
  var dProp = {};
  Object.keys(sourProp).forEach( function(sKey) {
    if (!ReferenceProps_[sKey]) dProp[sKey] = sourProp[sKey];
  });
  if (sourProp.width) dProp.width = sourProp.width;     // not: 0/undefined/null
  if (sourProp.height) dProp.height = sourProp.height;
  return dProp;
}

function getWdgtType_(targ) {  // targ can be: widget or component
  var comp = targ;
  if (targ && targ.component && !targ.props)
    comp = targ.component;
  if (!comp) return 'unknown';
  
  if (comp.$gui.isPanel)
    return 'panel';
  
  if (hasClass_(comp.props.className,'rewgt-unit')) {
    if (comp.props['childInline.'])
      return 'paragraph';
    else return 'unit';
  }
  else if (comp.props['childInline.'])
    return 'span';
  else if (comp.widget === topmostWidget_)
    return 'root';
  else return 'unknown';
}
utils.getWdgtType = getWdgtType_;

utils.eachElement = function(comp,callback) {
  if (!callback) return;
  comp.$gui.comps.forEach( function(item,idx) {
    if (item) callback(item,idx);
  });
};

utils.setElement = function(comp,idx,ele) {
  comp.$gui.comps[idx] = ele;
};

utils.eachComponent = function(comp,callback) {
  if (!callback) return;  
  var wdgt = comp.widget;
  if (!wdgt) return;
  
  comp.$gui.comps.forEach( function(item,idx) {
    if (!item) return;
    var sKey = getElementKey_(item);
    var child = sKey && wdgt[sKey], childObj = child && child.component;
    if (childObj) callback(childObj,idx);
  });
};

function setupRenderProp_(comp,dStyle) {
  var lnkPath, cls = classNameOf(comp), dState = comp.state, gui = comp.$gui;
  var tagAttrs = gui.tagAttrs, dataset = gui.dataset2;
  var props = Object.assign({style:dStyle || dState.style},gui.eventset);
  for (var i=0,sKey; sKey=tagAttrs[i]; i++) {
    props[sKey] = dState[sKey];
  }
  for (var i=0,sKey; sKey=dataset[i]; i++) {
    props[sKey] = dState[sKey];
  }
  if (cls) props.className = cls;
  
  if (W.__design__ && (lnkPath=dState['data-group.opt']))
    props['data-group.opt'] = lnkPath;  // help for designer
  return props;
}
utils.setupRenderProp = setupRenderProp_;

function fireTrigger_(oldData,comp) {
  // step 1: get trigger data
  if (arguments.length >= 3) {
    var value = arguments[2], isOK = false;
    if (value) {
      var tp = typeof value;
      if (tp == 'string') {
        value = [value];
        isOK = true;
      }
      else if (tp == 'object') {
        if (Array.isArray(value)) {
          var modifier;
          if (typeof value[0] == 'string' && (typeof (modifier=value[1]) == 'object')) {
            if (typeof modifier.$trigger != 'string') // value is [sPath,modifier]
              value = [value];
            // else, value is action array, use it, not copy by value.slice(0)
          }
          // else, value is action array
          isOK = true;
        }
        else if (typeof value.$trigger == 'string') { // newOpt for pop window
          isOK = true;
          value = [value];
        }
      }
    }
    if (isOK)
      comp.duals.trigger = value;
    else {
      console.log('warning: invalid trigger data (key=' + comp.$gui.keyid + ')');
      return;  // ignore
    }
  }
  else { // reuse comp.duals.trigger, try update $trigger first
    var gui = comp.$gui, syncId = gui.syncTrigger;
    if (syncId && syncId > 1) {    // gui.syncTrigger=1 means no reverse fire $trigger
      if (syncId < identicalId_) { // need re-eval $trigger, must not in $trigger evaluating
        var fn = gui.exprAttrs.trigger;
        if (fn) {
          try {
            gui.syncTrigger = 2;   // avoid re-call fireTrigger_()
            fn(comp); // auto renew gui.syncTrigger, and auto assign duals.trigger
          }
          catch(e) {
            console.log(e);
          }
        }
      }
      else gui.syncTrigger = 3;    // from $trigger evaluating, let next can fire
    }
  }
  
  setTimeout( function() { // maybe 'duals.trigger = xx' just called, run in next tick
    if (!comp.isHooked) return;
    if (oldData === comp.state.trigger)
      return;              // maybe data not change and not isForce
    fireOptTrigger_(comp); // if comp.state.trigger not array, will be ignored
  },0);
  
  function fireOptTrigger_(thisObj) {
    var bRet = thisObj.state.trigger;
    if (!Array.isArray(bRet)) return;  // unknown format
    
    bRet = bRet.slice(0);         // copy it
    var item = bRet.shift();
    while (item) {
      var sPath2, tp2 = typeof item;
      if (tp2 == 'string')
        triggerCheck(item,null);  // item must not '' // can not trigger self
      else if (tp2 == 'object') {
        if (Array.isArray(item))
          triggerData(item[0] || '',item[1],item[2] || 'data'); // update duals.data
        else if (typeof (sPath2=item.$trigger) == 'string') {
          var cfgData = Object.assign({},item);
          delete cfgData.$trigger;
          triggerCheck(sPath2,cfgData);
        }
        else break; // unexpected, no warning
      }
      else break;   // unexpected, no warning
      
      item = bRet.shift();
    }
    
    function triggerData(sPath,modifier,sAttr) {
      if (typeof sPath != 'string' || !modifier) return;
      
      var targ = sPath? getCompByPath_(thisObj,sPath): thisObj;
      if (!targ) {
        console.log('warning: can not find target (' + sPath + ')');
        return;
      }
      if (!targ.duals.hasOwnProperty(sAttr)) return;  // ignore, no warning
      
      setTimeout( function() {
        targ.duals[sAttr] = ex.update(targ.duals[sAttr],modifier);
      },0);
    }
    
    function triggerCheck(sPath,cfgData) {
      var dCfg = undefined;
      if (cfgData && typeof cfgData == 'object')
        dCfg = cfgData;
      
      setTimeout( function() {
        var targ = sPath? getCompByPath_(thisObj,sPath): thisObj;
        if (!targ) {
          console.log('warning: can not find target (' + sPath + ')');
          return;
        }
        if (targ === thisObj) {
          console.log('warning: trigger can not fire widget itself.');
          return;
        }
        
        if (targ.props['isOption.'] && targ.setChecked)
          targ.setChecked(null,dCfg);  // callback is null
      },0);
    }
  }
}
utils.fireTrigger = function(comp) {
  if (arguments.length >= 2)
    fireTrigger_(undefined,comp,arguments[1]);
  else fireTrigger_(undefined,comp);
};

utils.setChildren = function(comp,children,callback) {
  if (!Array.isArray(children)) return; // fatal error
  
  var bChild = [], argLen = children.length;
  for (var i = 0; i < argLen; i++) {
    var item = children[i];
    if (Array.isArray(item))
      loadReactTreeEx_(bChild, item, W.$staticNodes, W.$cachedClass);
    else if (typeof item == 'string')
      bChild.push(reactCreate_(comp.props['childInline.']?Span__:P__,{'html.':item})); // item maybe ''
    else if (React.isValidElement(item))
      bChild.push(item);
    // else, unknown format, ignore it
  }
  
  var gui = comp.$gui, existNum = 0, rmvEx = 0;
  bChild.forEach( function(item,idx) {
    if (!item) return;
    
    var keyid, sKey = getElementKey_(item);
    if (sKey) {
      if (typeof gui.compIdx[sKey] == 'number') { // already exist, ignore clone
        existNum += 1;
        return;
      }
      
      var iTmp = parseInt(sKey);
      if ((iTmp+'') == sKey)
        keyid = iTmp
      else keyid = sKey;
    }
    else {
      rmvEx += 1;
      return; // ignore clone, change removeNum wait to rescan that will clone 'keyid.'
    }
    
    bChild[idx] = reactClone_(item,{'keyid.':keyid,key:sKey});
  });
  
  // gui.removeNum only can increase, can not decrease
  gui.removeNum += Math.max(0,gui.comps.length - existNum) + rmvEx;
  gui.comps = bChild;
  
  if (!gui.inSync) {
    if (gui.compState >= 2) {
      var newId = comp.state.id__ === identicalId_? identicalId(): identicalId_;
      comp.setState({id__:newId},callback);   // trigger re-render
    }
    else { // maybe duals.id__ == 1
      setTimeout( function() {
        var newId = comp.state.id__ === identicalId_? identicalId(): identicalId_;
        comp.setState({id__:newId},callback); // trigger re-render
      },0);
    }
  }
  else {
    if (callback) {
      setTimeout( function() {
        callback();
      },0);
    }
  }
};

function getTemplate_(sName) {
  if (!sName || typeof sName != 'string') return null;
  
  var temp = W.$cachedClass[sName];
  if (temp || temp === null)  // if temp is null, means invalid WTC
    return temp;
  
  var ch, b = sName.split('.'), sAttr = b.shift();
  temp = T[sAttr];
  while (temp && (sAttr = b.shift())) {
    temp = temp[sAttr];
  }
  if (!temp || !temp._extend)
    W.$cachedClass[sName] = temp = null; // set null, no try next time
  else W.$cachedClass[sName] = temp = createClass_(temp._extend());
  return temp;
}

function getWTC_(cls) {  // getWTC('*') getWTC('usr.*') getWTC(['*','Panel','usr.Submit','usr2.*'])
  var ret = {}, tp = typeof cls;
  
  if (tp == 'string') {
    if (!cls) cls = '*';
    
    var b = cls.split('.'), isAll = false;
    if (b[b.length-1] == '*') {
      isAll = true;
      b.pop();
    }
    var sPath = b.join('.');
    
    var temp = T, sAttr = b.shift(), sLast = '';
    if (sAttr) {
      temp = temp[sLast=sAttr];
      while (temp && (sAttr = b.shift())) {
        temp = temp[sLast=sAttr];
      }
    }
    
    if (temp) {
      if (isAll) {
        if (temp._extend) {
          if (sLast)
            ret[sLast] = createClass_(temp._extend());
        }
        else scanAllSub(ret,sPath,temp);  // maybe sPath = ''
      }
      else { // !isAll, cls must be full path
        if (temp._extend) {
          var tmp = W.$cachedClass[cls];
          if (tmp !== null && sLast) {
            if (!tmp)
              tmp = W.$cachedClass[cls] = createClass_(temp._extend());
            ret[sLast] = tmp;
          }
        }
        // else, ignore
      }
    }
    // else, ignore
  }
  else if (Array.isArray(cls)) {
    var iLen = cls.length;
    for (var i = 0; i < iLen; i += 1) {
      var item = cls[i];
      if (item && typeof item == 'string')
        Object.assign(ret,getWTC_(item));
    }
  }
  // else, ignore
  
  return ret;
  
  function scanAllSub(ret,sPath,temp) {
    var b = Object.keys(temp);
    b.forEach( function(item) {
      var temp_ = temp[item];
      if (!temp_ || !temp_._extend) return;
      
      var sPath_ = sPath? sPath + '.' + item: item;
      var tmp = W.$cachedClass[sPath_];
      if (tmp !== null) {
        if (!tmp) 
          tmp = W.$cachedClass[sPath_] = createClass_(temp_._extend());
        ret[item] = tmp;
      }
    });
  }
}
utils.getWTC = getWTC_;

var browserVendorPrefix_ = {
  ie: 'ms',
  firefox: 'Moz',
  opera: 'O',
  chrome: 'Webkit',
  safari: 'Webkit',
  webkit: 'Webkit',
};

ex.regist('vendor', function() {
  return browserVendorPrefix_[vendorId_[0]] || '';
});

ex.regist('vendorId', function() {
  return '-' + (browserVendorPrefix_[vendorId_[0]] || '').toLowerCase() + '-';
});

ex.regist('__design__', function() {
  return parseInt(W.__design__ || 0);
});

ex.regist('__debug__', function() {
  return parseInt(W.__debug__ || 0);
});

ex.regist('time', function(tm) {
  var t;
  if (tm)
    t = new Date(tm);
  else t = new Date();
  return t.valueOf();
});

ex.regist('isFalse', function(b) {
  return !b;
});

ex.regist('isTrue', function(b) {
  return !!b;
});

ex.regist('parseInt', function(s) {
  return parseInt(s);
});

ex.regist('parseFloat', function(s) {
  return parseFloat(s);
});

ex.regist('escape', function(s) {
  return escape(s);
});

ex.regist('unescape', function(s) {
  return unescape(s);
});

ex.regist('evalInfo', function() {  // return [comp,sKey,iTimeId] or undefined
  var ret = undefined;
  var comp = this.component;
  if (!comp) return ret;  // return undefined
  
  var wdgt = comp.widget, callspace = wdgt && wdgt.$callspace;
  if (callspace) {
    ret = callspace.exprSpace.$info;
    if (callspace.forSpace) {
      var ret2 = callspace.forSpace.exprSpace.$info;
      if (ret) {
        if (ret2 && ret2[2] >= ret[2]) // choose newest one
          ret = ret2;
      }
      else ret = ret2;
    }
  }
  return ret;
});

ex.regist('tagValue', function(modifier) { // for: ex.update(data,{$set_$merge:{}}) ex.update(data,{a:{},b:{}}}
  if (typeof modifier != 'object') return modifier;
  
  var tm, ret = Object.assign({},modifier), root = ret.$set;
  if (root) {
    if (typeof root != 'object') return modifier;
    root = ret.$set = Object.assign({},root);
  }
  else {
    root = ret.$merge;
    if (root) {
      if (typeof root != 'object') return modifier;
      root = ret.$merge = Object.assign({},root);
    }
    else {
      tm = ex.time();
      Object.keys(ret).forEach( function(sKey) {
        if (sKey[0] == '$') return;
        var item = ret[sKey];
        if (typeof item != 'object') return;
        
        item = ret[sKey] = Object.assign({},item);
        var root2 = item.$set;
        if (root2) {
          if (typeof root2 != 'object') return;
          root2 = item.$set = Object.assign({},root2);
          root2.time = tm;
        }
        else {
          root2 = item.$merge;
          if (root2) {
            if (typeof root2 != 'object') return;
            root2 = item.$merge = Object.assign({},root2);
            root2.time = tm;
          }
          else {
            if (item.hasOwnProperty('value'))
              item.time = {$set:tm};
            // else, ignore
          }
        }
      });

      return ret;
    }
  }
  
  tm = ex.time();
  Object.keys(root).forEach( function(sKey) {
    if (sKey[0] != '$') {
      var item = root[sKey];
      if (typeof item == 'object')
        item.time = tm;
    }
  });
  
  return ret;
});

ex.regist('tagFired', function() {
  var argLen = arguments.length;
  if (argLen < 2) return '';
  
  var i, data = arguments[0];
  for (i=1; i < argLen; i++) {
    var item = data[arguments[i]];
    if (!item || !item.time)
      return '';
  }
  
  // all meet, reset time
  for (i=1; i < argLen; i++) {
    data[arguments[i]].time = 0;
  }
  return 'true';
});

ex.regist('setChecked', function(sPath,newOpt) {
  var info = this.evalInfo();
  var comp = info && info[0];
  if (comp) {
    var targ = getCompByPath_(comp,sPath);
    if (targ && targ.props['isOption.'])
      targ.setChecked(null,newOpt); // callback=null
  }
});

function getCurrExprSpace_(ex,comp) {
  var wdgt = comp && comp.widget;
  var callspace = wdgt && wdgt.$callspace;
  if (callspace) {
    if (callspace.forSpace) {
      var info = ex.evalInfo();
      if (info && info[1] == 'for')  // in for-expr
        callspace = callspace.forSpace;
    }
    return callspace.exprSpace;
  }
  else return null;
}

ex.regist('setVar', function(sName,value) {
  if (!sName || typeof sName != 'string') return value;  // fatal error
  
  var comp = this.component, space = getCurrExprSpace_(this,comp);
  if (!space)
    console.log('warning: invalid callspace for ex.setVar(' + sName + ')');
  else space[sName] = value;
  return value;
});

ex.regist('log', function() {  // return [comp,sKey,iTimeId] or undefined
  var info = this.evalInfo(), sOwner = '';
  if (info) {
    try {
      var comp = info[0], wdgt = comp && comp.widget;
      if (wdgt)
        sOwner = wdgt.getPath() + ':' + info[1];
    }
    catch(e) { }
  }
  
  var sOut, iLen = arguments.length;
  if (sOwner)
    sOut = 'ex(' + sOwner + ')>';
  else sOut = 'ex>';
  if (iLen <= 0) {
    if (sOwner)
      console.log(sOut);
    return;
  }
  
  for (var i=0; i < iLen; i++) {
    sOut += ' ' + arguments[i];
  }
  console.log(sOut);
});

ex.regist('map', function(data,sExpr) {
  if (!Array.isArray(data)) return [];    // fatal error
  var itemLen = data.length;
  if (!itemLen) return [];
  if (!sExpr || typeof sExpr != 'string') return data.slice(0);
  
  var bAst = setupExprAst(sExpr,null,'map');
  if (!bAst) return [];
  if (bAst[0] == 61) bAst = bAst[1][2]; // ignore headId // expr_items_1 : expr : expr
  
  var comp = this.component, space = getCurrExprSpace_(this,comp);  // comp can undefined
  if (space)
    adjustExprAst(bAst,[]);
  else space = {};
  
  var bRet = [];
  space.$count = itemLen;
  for (var ii=0; ii < itemLen; ii++) {
    space.$item = data[ii];
    space.$index = ii;
    try {
      bRet.push(evalInSpace(bAst,space));
    }
    catch(e) {  // ignore this item 
      console.log('error: run map() failed ($index=' + ii + ')');
      console.log(e);
    }
  }
  delete space.$item;
  delete space.$index;
  delete space.$count;
  
  return bRet;
});

ex.regist('filter', function(data,sExpr) {
  if (!Array.isArray(data)) return [];    // fatal error
  var itemLen = data.length;
  if (!itemLen) return [];
  if (!sExpr || typeof sExpr != 'string')
    sExpr = '$item !== null';
  
  var bAst = setupExprAst(sExpr,null,'filter');
  if (!bAst) return [];
  if (bAst[0] == 61) bAst = bAst[1][2]; // ignore headId // expr_items_1 : expr : expr
  
  var comp = this.component, space = getCurrExprSpace_(this,comp);
  if (space)
    adjustExprAst(bAst,[]);
  else space = {};
  
  var bRet = [];
  space.$count = itemLen;
  for (var ii=0; ii < itemLen; ii++) {
    var oneItem  = space.$item = data[ii];
    space.$index = ii;
    try {
      if (evalInSpace(bAst,space))
        bRet.push(oneItem);
    }
    catch(e) {  // ignore this item 
      console.log('error: run filter() failed ($index=' + ii + ')');
      console.log(e);
    }
  }
  delete space.$item;
  delete space.$index;
  delete space.$count;
  
  return bRet;
});

ex.regist('order', function(data) {  // ex.order(items,"attr",-1) or ex.order(items,["attr",-1])
  if (!Array.isArray(data)) return data;
  
  var arg, bList = null, argLen = arguments.length, byInc = true;
  if (argLen >= 2) {
    arg = arguments[argLen-1];
    if (typeof arg == 'number') {
      if (arg < 0) byInc = false;
      argLen -= 1;
    }
    else if (argLen == 2 && Array.isArray(arg)) {
      bList = arg;
      argLen = bList.length;
      if (argLen >= 1 && typeof (arg=bList[argLen-1]) == 'number') {
        if (arg < 0) byInc = false;
        argLen -= 1;
      }
    }
  }
  
  var bAttr = [];
  if (bList) {
    for (var i=0; i < argLen; i++) {
      arg = bList[i];
      if (arg && typeof arg == 'string')
        bAttr.push(arg.split('.'));
    }
  }
  else {
    for (var i=1; i < argLen; i++) {
      arg = arguments[i];
      if (arg && typeof arg == 'string')
        bAttr.push(arg.split('.'));
    }
  }
  
  var attrNum = bAttr.length, data2 = data.slice(0); // no change source data
  if (!attrNum) {
    return data2.sort( function(a,b) {
      return byInc? (a === b? 0: (a > b? 1: -1)): (a === b? 0: (a > b? -1: 1));
    });
  }
  else {
    return data2.sort( function(a,b) {
      for (var i=0,attr; attr=bAttr[i]; i++) {
        var aa = attrOf(a,attr), bb = attrOf(b,attr);
        if (aa === bb)
          continue;
        else if (aa > bb)
          return byInc?1:-1;
        else return byInc?-1:1;
      }
      return 0;
    });
  }
  
  function attrOf(data,b) {
    var sAttr, ret = data, i = 0;
    while (sAttr = b[i++]) {
      if (ret)
        ret = ret[sAttr];
      else break;
    }
    return ret;
  }
});

ex.regist('jsonp', function(req,initValue) {
  var info = this.evalInfo(), comp = null, sKey = '';
  if (info) {
    comp = info[0]; sKey = info[1];
    if (initValue && comp && comp.duals.hasOwnProperty(sKey)) {
      if (comp.state[sKey] === undefined)
        comp.duals[sKey] = initValue;
    }
  }
  
  // req.callback should not pre-defined
  req = Object.assign({},req);
  req.callback = function(ret) {
    if (comp && sKey && comp.duals.hasOwnProperty(sKey))
      comp.duals[sKey] = ret;  // ret maybe null, if req.notifyError is true and request failed
  };
  utils.jsonp(req);
  return comp && sKey? comp.state[sKey]: undefined;
});

ex.regist('ajax', function(req,initValue) {
  var info = this.evalInfo(), comp = null, sKey = '';
  if (info) {
    comp = info[0]; sKey = info[1];
    if (initValue && comp && sKey && comp.duals.hasOwnProperty(sKey)) {
      if (comp.state[sKey] === undefined)
        comp.duals[sKey] = initValue;  // initValue should be {status:xx, data:xx}
    }
  }
  
  // req.success and req.error should not pre-defined
  req.success = function(ret) {
    if (comp && sKey && comp.duals.hasOwnProperty(sKey))
      comp.duals[sKey] = {status:'success',data:ret};
  };
  req.error = function(xhr,statusText) {
    if (comp && sKey && comp.duals.hasOwnProperty(sKey))
      comp.duals[sKey] = {status:statusText || 'error',data:null};
  };
  utils.ajax(req);
  return comp? comp.state[sKey]: undefined;
});

// Lexer, port from https://github.com/aaditmshah/lexer
//-----------------------------------------------------
function Lexer(defunct) {
  if (typeof defunct !== "function") defunct = Lexer.defunct;
  
  var tokens = [], rules = [], remove = 0;
  
  this.state = 0;
  this.index = 0;
  this.input = "";
  
  this.addRule = function (pattern, action, start) {
    var global = pattern.global;
    
    if (!global) {
      var flags = "g";
      if (pattern.multiline) flags += "m";
      if (pattern.ignoreCase) flags += "i";
      pattern = new RegExp(pattern.source, flags);
    }
    
    if (!Array.isArray(start)) start = [0];

    rules.push({
      pattern: pattern,
      global: global,
      action: action,
      start: start
    });

    return this;
  };

  this.setInput = function (input) {
    remove = 0;
    this.state = 0;
    this.index = 0;
    tokens.length = 0;
    this.input = input;
    return this;
  };

  this.lex = function () {
    if (tokens.length) return tokens.shift();

    this.reject = true;

    while (this.index <= this.input.length) {
      var matches = scan.call(this).splice(remove);
      var index = this.index;

      while (matches.length) {
        if (this.reject) {
          var match = matches.shift();
          var result = match.result;
          var length = match.length;
          this.index += length;
          this.reject = false;
          remove++;

          var token = match.action.apply(this, result);
          if (this.reject)
            this.index = result.index;
          else if (typeof token !== "undefined") {
            if (Array.isArray(token)) {
              tokens = token.slice(1);
              token = token[0];
            }
            if (length) remove = 0;
            return token;
          }
        }
        else break;
      }

      var input = this.input;

      if (index < input.length) {
        if (this.reject) {
          remove = 0;
          var token = defunct.call(this, input.charAt(this.index++));
          if (typeof token !== "undefined") {
            if (Array.isArray(token)) {
              tokens = token.slice(1);
              return token[0];
            }
            else return token;
          }
        }
        else {
          if (this.index !== index)
            remove = 0;
          this.reject = true;
        }
      }
      else if (matches.length)
        this.reject = true;
      else break;
    }
  };

  function scan() {
    var matches = [];
    var index = 0;

    var state = this.state;
    var lastIndex = this.index;
    var input = this.input;

    for (var i = 0, length = rules.length; i < length; i++) {
      var rule = rules[i];
      var start = rule.start;
      var states = start.length;

      if ((!states || start.indexOf(state) >= 0) ||
        (state % 2 && states === 1 && !start[0])) {
        var pattern = rule.pattern;
        pattern.lastIndex = lastIndex;
        var result = pattern.exec(input);

        if (result && result.index === lastIndex) {
          var j = matches.push({
            result: result,
            action: rule.action,
            length: result[0].length
          });

          if (rule.global) index = j;

          while (--j > index) {
            var k = j - 1;

            if (matches[j].length > matches[k].length) {
              var temple = matches[j];
              matches[j] = matches[k];
              matches[k] = temple;
            }
          }
        }
      }
    }

    return matches;
  }
}

Lexer.defunct = function(chr) {
  throw new Error('Unexpected character (' + chr + ') at offset (' + (this.index - 1) + ')');
};

//---------
var lexer = new Lexer(), exprToken_ = [];

function appendToken_(lexeme,id,iLevel) {
  exprToken_.push([id,lexeme,lexer.index-lexeme.length,iLevel]);
  return id;
}

lexer.addRule(/\s+/, function(lexeme) {
  return appendToken_(lexeme,1,-1);   // WHITE
}).addRule(/[0-9]+(?:\.[0-9]+)?\b/, function(lexeme) {
  return appendToken_(lexeme,2,-1);   // NUMBER
}).addRule(/[_$A-Za-z](?:[_$A-Za-z0-9]+)?/, function(lexeme) {
  return appendToken_(lexeme,3,-1);   // ID
}).addRule(/(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)')/, function(lexeme) { // '"
  return appendToken_(lexeme,4,-1);   // STRING
}).addRule(/[?]/, function(lexeme) {
  return appendToken_(lexeme,5,4);    // QUESTION_MARK
}).addRule(/[:]/, function(lexeme) {
  return appendToken_(lexeme,6,-1);   // COLON
}).addRule(/[,]/, function(lexeme) {
  return appendToken_(lexeme,7,-1);   // COMMA
}).addRule(/[{]/, function(lexeme) {
  return appendToken_(lexeme,8,-1);   // L_BRACKET
}).addRule(/[}]/, function(lexeme) {
  return appendToken_(lexeme,9,-1);   // R_BRACKET
}).addRule(/[\[]/, function(lexeme) {
  return appendToken_(lexeme,10,-1);  // L_SQUARE
}).addRule(/[\]]/, function(lexeme) {
  return appendToken_(lexeme,11,-1);  // R_SQUARE
}).addRule(/[(]/, function(lexeme) {
  return appendToken_(lexeme,12,-1);  // L_PARENTHES
}).addRule(/[)]/, function(lexeme) {
  return appendToken_(lexeme,13,-1);  // R_PARENTHES
}).addRule(/[.]/, function(lexeme) {
  return appendToken_(lexeme,14,18);  // OP
}).addRule(/[*]/, function(lexeme) {
  return appendToken_(lexeme,14,14);  // OP
}).addRule(/[/]/, function(lexeme) {
  return appendToken_(lexeme,14,14);  // OP
}).addRule(/[%]/, function(lexeme) {
  return appendToken_(lexeme,14,14);  // OP
}).addRule(/[+]/, function(lexeme) {
  return appendToken_(lexeme,14,13);  // OP
}).addRule(/[-]/, function(lexeme) {
  return appendToken_(lexeme,14,13);  // OP
}).addRule(/[>]{3}/, function(lexeme) {
  return appendToken_(lexeme,14,12);  // OP
}).addRule(/[>]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,12);  // OP
}).addRule(/[<]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,12);  // OP
}).addRule(/[<][=]/, function(lexeme) {
  return appendToken_(lexeme,14,11);  // OP
}).addRule(/[<]/, function(lexeme) {
  return appendToken_(lexeme,14,11);  // OP
}).addRule(/[>][=]/, function(lexeme) {
  return appendToken_(lexeme,14,11);  // OP
}).addRule(/[>]/, function(lexeme) {
  return appendToken_(lexeme,14,11);  // OP
}).addRule(/[=]{3}/, function(lexeme) {
  return appendToken_(lexeme,14,10);  // OP
}).addRule(/[!][=]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,10);  // OP
}).addRule(/[=]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,10);  // OP
}).addRule(/[!][=]/, function(lexeme) {
  return appendToken_(lexeme,14,10);  // OP
}).addRule(/[&]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,6);   // OP
}).addRule(/[&]/, function(lexeme) {
  return appendToken_(lexeme,14,9);   // OP
}).addRule(/[\^]/, function(lexeme) {
  return appendToken_(lexeme,14,8);   // OP
}).addRule(/[|]{2}/, function(lexeme) {
  return appendToken_(lexeme,14,5);   // OP
}).addRule(/[|]/, function(lexeme) {
  return appendToken_(lexeme,14,7);   // OP
}).addRule(/$/, function(lexeme) {
  return appendToken_(lexeme,20,-1);  // EOF
});

// -------- yacc rules --------
// expr_1 :   number
// expr_2 :   ID
// expr_3 :   string
// expr_4 :   expr  OP  expr
// expr_5 :   expr ?  expr : expr
// expr_6 :   expr (  )                  -->  expr  OP  null
// expr_7 :   (  expr_list  )
// expr_8 :   [  ]
// expr_9 :   [  expr_list  ]
// expr_10 :  {  }
// expr_11 :  { expr_items  }
// expr_12 :  expr  [  expr_list  ]      -->  expr  OP  expr
// expr_13 :  expr ( expr_list )         -->  expr  OP  expr
// expr_list_1 :  expr
// expr_list_2 :  expr_list  ,  expr
// expr_items_1 : expr : expr
// expr_items_2 : expr_item , expr : expr

var bOperandToken_ = [2,3,4,9,11,13, 31,32,33,34,35,36,37,38,39,40,41,42,43];

function processYacc(bToken,allowLabel) {  // first scan: setup AST
  var bPending = [];
  
  function pushOpExpr(exprL,opCurr,exprR,levelR) {
    if (exprL[0] == 34) {
      var b = exprL[1], opPrev = b[1], exprLR = b[2];
      var tpLR = (exprLR?exprLR[0]:0), levelL = opPrev[3];
      if (levelL < levelR && tpLR >= 31 && tpLR <= 43) {
        b[2] = [34,[exprLR,opCurr,exprR],exprLR[2]];
        bPending.push(exprL);
        return;
      }
    }
    bPending.push([34,[exprL,opCurr,exprR],exprL[2]]);
  }
  
  // not keepExpr before: EOF ,  )  ]
  // keepExpr before: {  ?  :  [  (  OP  ]  }
  function adjustOnComma(iLen,keepExpr,joinable) { // joinable for: ? [ ( OP
    if (iLen >= 3) {
      var tok4,tok5, tok1 = bPending[iLen-1], tok2 = bPending[iLen-2], tok3 = bPending[iLen-3];
      var tp4,tp5, tp1 = tok1[0], tp2 = tok2[0], tp3 = tok3[0];
      if (iLen >= 5) {  // expr ? expr : expr  --> expr_5
        tok4 = bPending[iLen-4]; tp4 = tok4[0];
        tok5 = bPending[iLen-5]; tp5 = tok5[0];
        if (!joinable && tp5 >= 31 && tp5 <= 43 && tp4 == 5 && tp3 >= 31 && tp3 <= 43 && tp2 == 6 && tp1 >= 31 && tp1 <= 43) {
          bPending.splice(iLen-5,5,[35,[tok5,tok4,tok3,tok2,tok1],tok5[2]]);
          return true;
        }
      }
      
      // expr OP expr  --> expr_4
      if (tp3 >= 31 && tp3 <= 43 && tp2 == 14 && tp1 >= 31 && tp1 <= 43) {
        bPending.splice(iLen-3,3)
        pushOpExpr(tok3,tok2,tok1,tok2[3]);
        return true;
      }
      
      // expr_list_2 : expr_list , expr
      if (!joinable && tp3 >= 51 && tp3 <= 52 && tp2 == 7 && tp1 >= 31 && tp1 <= 43) {
        bPending.splice(iLen-3,3,[52,[tok3,tok2,tok1],tok3[2]]);
        return true;
      }
      
      if (!joinable && tp3 >= 31 && tp3 <= 43 && tp2 == 6 && tp1 >= 31 && tp1 <= 43) {
        if (iLen >= 5 && tp5 >= 61 && tp5 <= 62 && tp4 == 7) {
          // expr_items_2 : expr_item , expr : expr
          bPending.splice(iLen-5,5,[62,[tok5,tok4,tok3,tok2,tok1],tok5[2]]);
        }
        else { // expr_items_1 : expr : expr
          bPending.splice(iLen-3,3,[61,[tok3,tok2,tok1],tok3[2]]);
        }
        return true;
      }
    }
    
    if (iLen >= 1 && !keepExpr) {    // can not translate to expr_list if before ':'
      var tok1 = bPending[iLen-1], tp1 = tok1[0];
      if (tp1 >= 31 && tp1 <= 43) {  // expr  --> expr_list_1
        bPending.splice(iLen-1,1,[51,[tok1],tok1[2]]);
        return true;
      }
    }
    
    return false;
  }
  
  function processStep(tok) {
    var iType = tok[0];
    if (iType == 3 && tok[1] == 'in') {
      iType = tok[0] = 14;   // in: ID --> OP
      tok[3] = 11;
    }
    
    var iLen = bPending.length;
    if (iType == 20) {       // EOF
      if (iLen >= 2 && bPending[iLen-1][0] == 7) { // ignore last ,
        iLen -= 1;
        bPending.pop();
      }
      
      while (adjustOnComma(iLen)) {
        iLen = bPending.length;
      }
    }
    
    else if (iType == 2) {  // number
      if (iLen) {
        var bLast = bPending[iLen-1];
        if (bLast[0] == 14 && bLast[1] == '-') {
          var addNeg = false;
          if (iLen == 1)
            addNeg = true;
          else {
            var bLast2 = bPending[iLen-2], tpLast = bLast2[0];
            if (bOperandToken_.indexOf(tpLast) < 0)
              addNeg = true;
          }
          
          if (addNeg) {  // such like:  3 * -5
            bPending.pop();
            iLen -= 1;
            tok[1] = '-' + tok[1];
          }
        }
      }
      bPending.push([31,[tok],tok[2]]);  // 31: expr_1
    }
    else if (iType == 3 || iType == 4)   // ID string
      bPending.push([29 + iType,[tok],tok[2]]);  // 32: expr_2, 33:expr_3
    else if (iType == 7) {  // ,
      while (adjustOnComma(iLen)) {
        iLen = bPending.length;
      }
      bPending.push(tok);
    }
    else if (iType == 6 || iType == 8) { // : {
      while (adjustOnComma(iLen,true)) {
        iLen = bPending.length;
      }
      bPending.push(tok);
    }
    else if (iType == 5 || iType == 10 || iType == 12 || iType == 14) { // ? [  (  OP
      while (adjustOnComma(iLen,true,true)) {
        iLen = bPending.length;
      }
      bPending.push(tok);
    }
    else if (iType == 11) {  // ]
      if (iLen >= 2 && bPending[iLen-1][0] == 7) { // ignore last ,
        iLen -= 1;
        bPending.pop();
      }
      
      while (adjustOnComma(iLen)) {
        iLen = bPending.length;
      }
      
      if (iLen >= 3) {
        var tok1 = bPending[iLen-1], tok2 = bPending[iLen-2], tok3 = bPending[iLen-3];
        var tp1 = tok1[0], tp2 = tok2[0], tp3 = tok3[0];
        if (tp3 >= 31 && tp3 <= 43 && tp2 == 10 && tp1 == 51) {
          tok2[0] = 14; tok2[3] = 18;    // change '[' to OP, op level is 18
          tok1 = tok1[1][0];  // get expr from expr_list_1
          bPending.splice(iLen-3,3);
          pushOpExpr(tok3,tok2,tok1,18); // expr [ expr_list ]  --> expr_4 : expr OP expr
          return;
        }
      }
      
      if (iLen >= 2) {
        var tok1 = bPending[iLen-1], tok2 = bPending[iLen-2];
        var tp1 = tok1[0], tp2 = tok2[0];
        if (tp2 == 10) {
          if (tp1 >= 31 && tp1 <= 43) {      // [ expr ] --> [ expr_list ] --> expr_9 : [ expr_list ]
            bPending.splice(iLen-2,2,[39,[tok2,[51,[tok1],tok1[2]],tok],tok2[2]]);
            return;
          }
          else if (tp1 >= 51 && tp1 <= 52) { // expr_9 : [ expr_list ]
            bPending.splice(iLen-2,2,[39,[tok2,tok1,tok],tok2[2]]);
            return;
          }
        }
      }
      
      if (iLen >= 1) {
        var tok1 = bPending[iLen-1], tp1 = tok1[0];
        if (tp1 == 10) {     // expr_8 : [ ]
          bPending[iLen-1] = [38,[tok1,tok],tok1[2]];
          return;
        }
      }
      
      bPending.push(tok);    // should be error
    }
    else if (iType == 13) {  // )   // not ignore last ,
      while (adjustOnComma(iLen)) {
        iLen = bPending.length;
      }
      
      if (iLen >= 3) {
        var tok1 = bPending[iLen-1], tok2 = bPending[iLen-2], tok3 = bPending[iLen-3];
        var tp1 = tok1[0], tp2 = tok2[0], tp3 = tok3[0];
        if (tp3 >= 31 && tp3 <= 43 && tp2 == 12 && tp1 >= 51 && tp1 <= 52) {
          tok2[0] = 14; tok2[3] = 17;    // change '(' to OP, op level is 17
          bPending.splice(iLen-3,3);
          pushOpExpr(tok3,tok2,tok1,17); // expr ( expr_list )  --> expr_4 : expr OP expr_list
          return;
        }
      }

      if (iLen >= 2) {
        var tok1 = bPending[iLen-1], tok2 = bPending[iLen-2];
        var tp1 = tok1[0], tp2 = tok2[0];
        if (tp2 >= 31 && tp2 <= 43 && tp1 == 12) {  // expr_6: expr ( )
          tok1[0] = 14; tok1[3] = 17;    // change '(' to OP, op level is 17
          bPending.splice(iLen-2,2);
          pushOpExpr(tok2,tok1,null,17); // --> expr_4 : expr OP null
          return;
        }
        else if (tp2 == 12 && tp1 >= 51 && tp1 <= 52) { // expr_7 : ( expr_list )
          bPending.splice(iLen-2,2,[37,[tok2,tok1,tok],tok2[2]]);
          return;
        }
      }
      bPending.push(tok);    // should be error
    }
    else if (iType == 9) {   // }
      if (iLen >= 2 && bPending[iLen-1][0] == 7) { // ignore last ,
        iLen -= 1;
        bPending.pop();
      }
      
      while (adjustOnComma(iLen,true)) {
        iLen = bPending.length;
      }
      
      if (iLen >= 2) {
        var tok1 = bPending[iLen-1], tok2 = bPending[iLen-2];
        var tp1 = tok1[0], tp2 = tok2[0];
        if (tp2 == 8 && tp1 >= 61 && tp1 <= 62) { // expr_11 : { expr_items }
          bPending.splice(iLen-2,2,[41,[tok2,tok1,tok],tok2[2]]);
          return;
        }
      }
      if (iLen >= 1) {
        var tok1 = bPending[iLen-1], tp1 = tok1[0];
        if (tp1 == 8) {   // expr_10 : { }
          bPending[iLen-1] = [40,[tok1,tok],tok1[2]];
          return;
        }
      }
      
      bPending.push(tok); // should be error
    }
    // else do nothing    // ignore expr(31-43) expr_list(51-52) expr_items(61-62)
  }
  
  var tok;
  while (tok = bToken.shift()) {
    if (tok[0] != 1)
      processStep(tok);
  }
  
  if (bPending.length == 0)
    throw new Error('expression is empty');
  else {
    tok = bPending[0];
    if (bPending.length == 1) {
      var retType = tok[0];
      if (retType >= 51 && retType <= 52)    // expr_list
        return tok;
      else if (retType == 61 && allowLabel)  // expr_items_1 // support all:expr
        return tok;
    }
    
    if (tok[0] < 20)
      throw new Error('invalid operand (' + tok[1] + ') at offset (' + tok[2] + ')');
    
    var i = 0, iOffset = tok[2];
    while (i < bPending.length) {
      var item = bPending[i++], itemType = item[0];
      if (itemType < 51 || itemType > 52) { // not expr_list
        iOffset = item[2];
        break;
      }
    }
    
    // console.log('AST buffer, len:',bPending.length,JSON.stringify(bPending));
    throw new Error('syntax error at offset (' + iOffset + ')');
  }
}

function evalInSpace(bAst,rootSpace) {
  var tp = bAst[0], b = bAst[1];
  
  if (tp == 31)
    return parseFloat(b[0][1]);
  else if (tp == 32) {
    var sId = b[0][1];
    if (sId == 'null')
      return null;
    else if (sId == 'undefined')
      return undefined;
    else if (sId == 'true')
      return true;
    else if (sId == 'false')
      return false;
    else if (sId == 'NaN')
      return NaN;
    else {
      var ret = rootSpace[sId];
      if (ret === undefined && !rootSpace.hasOwnProperty(sId))
        throw new Error('symbol (' + sId + ') not defined');
      else return ret;
    }
  }
  else if (tp == 33) {
    var s = b[0][1];
    return s? s.slice(1,-1):'';
  }
  else if (tp == 34) {
    var exprL = b[0], op = b[1], exprR = b[2], sOp = op[1];
    if (sOp == '.') {
      if (exprR[0] != 32)
        throw new Error('syntax error at offset (' + bAst[2] + '): invalid attribute name');
      
      var owner = evalInSpace(exprL,rootSpace), sAttr = exprR[1][0][1];
      try {
        return owner[sAttr];
      }
      catch(e) {
        console.log('error: get attribute (' + sAttr + ') failed');
        return undefined;
      }
    }
    else if (sOp == '[') {
      var owner = evalInSpace(exprL,rootSpace);
      var sAttr = evalInSpace(exprR,rootSpace);
      try {
        return owner[sAttr];
      }
      catch(e) {
        console.log('error: get attribute ([' + sAttr + ']) failed');
        return undefined;
      }
    }
    else if (sOp == '(') {
      if (exprL[0] == 32 && exprL[1][0][1] == 'while') {
        var iLoopNum = 0;
        if (!exprR) return iLoopNum;  // while();  // no argument
        
        var cond = evalCondition(exprR);
        while (cond) {
          iLoopNum += 1;
          evalLoopBody(exprR);
          cond = evalCondition(exprR);
        }
        return iLoopNum;
      }
      
      var bArgs = [];
      if (exprR) evalArgList(bArgs,exprR);
      
      if (exprL[0] == 34) {
        var b2 = exprL[1];
        if (b2[1][1] == '.') {
          var attrExpr = b2[2];
          if (attrExpr[0] != 32)
            throw new Error('syntax error at offset (' + attrExpr[2] + '): invalid attribute name');
          
          var thisObj = evalInSpace(b2[0],rootSpace);
          var subAttr = attrExpr[1][0][1];
          return thisObj[subAttr].apply(thisObj,bArgs); // if not function, will raise error // support pseudo: {apply:fn}
        }
      }
      
      var fn = evalInSpace(exprL,rootSpace);
      return fn.apply(null,bArgs); // if not function, will raise error // support pseudo: {apply:fn}
    }
    else if (sOp == '&&') {
      var valueL = evalInSpace(exprL,rootSpace);
      if (!valueL) return valueL;  // shortcut
      return evalInSpace(exprR,rootSpace);
    }
    else if (sOp == '||') {
      var valueL = evalInSpace(exprL,rootSpace);
      if (valueL) return valueL;   // shortcut
      return evalInSpace(exprR,rootSpace);
    }
    else {
      var valueL = evalInSpace(exprL,rootSpace);
      var valueR = evalInSpace(exprR,rootSpace);
      if (sOp == '*')
        return valueL * valueR;
      else if (sOp == '/')
        return valueL / valueR;
      else if (sOp == '%')
        return valueL % valueR;
      else if (sOp == '+')
        return valueL + valueR;
      else if (sOp == '-')
        return valueL - valueR;
      else if (sOp == '<<')
        return valueL << valueR;
      else if (sOp == '>>')
        return valueL >> valueR;
      else if (sOp == '>>>')
        return valueL >>> valueR;
      else if (sOp == '<')
        return valueL < valueR;
      else if (sOp == '<=')
        return valueL <= valueR;
      else if (sOp == '>')
        return valueL > valueR;
      else if (sOp == '>=')
        return valueL >= valueR;
      else if (sOp == 'in')
        return valueL in valueR;
      else if (sOp == '==')
        return valueL == valueR;
      else if (sOp == '!=')
        return valueL != valueR;
      else if (sOp == '===')
        return valueL === valueR;
      else if (sOp == '!==')
        return valueL !== valueR;
      else if (sOp == '&')
        return valueL & valueR;
      else if (sOp == '^')
        return valueL ^ valueR;
      else if (sOp == '|')
        return valueL | valueR;
      else throw new Error('unknown operator: ' + sOp);
    }
  }
  else if (tp == 35) {
    var cond = evalInSpace(b[0],rootSpace);
    return evalInSpace(cond?b[2]:b[4],rootSpace);
  }
  else if (tp == 37) {
    var bArgs = [];
    evalArgList(bArgs,b[1]);
    return bArgs[bArgs.length-1];
  }
  else if (tp == 38)
    return [];
  else if (tp == 39) {
    var bArgs = [];
    evalArgList(bArgs,b[1]);
    return bArgs;
  }
  else if (tp == 40)
    return {};
  else if (tp == 41) {
    var ret = {}, bArgs = [];
    evalKeyValue(bArgs,b[1]);
    bArgs.forEach( function(item) {
      ret[item[0]] = item[1];
    });
    return ret;
  }
  else if (tp == 51) {
    return evalInSpace(b[0],rootSpace);
  }
  else if (tp == 52) {
    var bArgs = [];
    evalArgList(bArgs,bAst);
    return bArgs[bArgs.length-1];
  }
  
  // expr_items has scaned in expr_11   // no expr_6, expr_12, expr_13
  else throw new Error('syntax error at offset (' + bAst[2] + ')');
  
  function evalKeyValue(bArgs,expr) {
    var tp = expr[0], b = expr[1];
    if (tp == 61) {
      var keyExpr = b[0], keyTp = keyExpr[0];
      var key = keyTp == 32? keyExpr[1][0][1]: evalInSpace(keyExpr,rootSpace);
      bArgs.push([key,evalInSpace(b[2],rootSpace)]);
    }
    else if (tp == 62) {
      evalKeyValue(bArgs,b[0]);
      var keyExpr = b[2], keyTp = keyExpr[0];
      var key = keyTp == 32? keyExpr[1][0][1]: evalInSpace(keyExpr,rootSpace);
      bArgs.push([key,evalInSpace(b[4],rootSpace)]);
    }
    else throw new Error('syntax error at offset (' + expr[2] + ')');
  }
  
  function evalArgList(bArgs,expr) {  // expr can be expr or expr_list
    var tp = expr[0], b = expr[1];
    if (tp == 51)
      bArgs.push(evalInSpace(b[0],rootSpace));
    else if (tp == 52) {
      evalArgList(bArgs,b[0]);
      bArgs.push(evalInSpace(b[2],rootSpace));
    }
    else bArgs.push(evalInSpace(expr,rootSpace));
  }
  
  function evalCondition(expr) {
    var tp = expr[0], b = expr[1];
    if (tp == 51)
      return evalInSpace(b[0],rootSpace);
    else if (tp == 52)
      return evalCondition(b[0],rootSpace);
    else return evalInSpace(expr,rootSpace);
  }
  
  function evalLoopBody(expr) {
    if (expr[0] == 52) {
      var b = expr[1];
      evalLoopBody(b[0],rootSpace);
      evalInSpace(b[2],rootSpace);
    }
    // else do nothing  // expr_list_1 (51) or expr, used as condition
  }
}

function setupExprAst(sExpr,comp,sKey) {
  var ret = null, succ = false;
  exprToken_ = [];
  
  try {
    lexer.setInput(sExpr);
    while (lexer.lex()) ;      // maybe raise exception
    succ = true;
  }
  catch(e) {
    utils.instantShow('error: lexical analysis failed at ' + (comp?comp.widget.getPath():'') + ':' + sKey);
    console.log(e);
  }
  if (!succ) return null;
  
  try {
    ret = processYacc(exprToken_,true); // maybe raise exception
  }
  catch(e) {
    utils.instantShow('error: yacc analysis failed at ' + (comp?comp.widget.getPath():'') + ':' + sKey);
    console.log(e);
  }
  return ret;
}

// find target component and locate which callspace, pathFlag: -N or sPath
function findComponent_(comp,pathFlag,bInfo,parentIdx) {
  var wdgt = comp.widget;
  var parentNum = parentIdx || 0; // if parentNum > 0 means access from sub level
  if (typeof pathFlag == 'number') {
    var iLastIdx = undefined;
    while (wdgt) {
      var comp_ = wdgt.component, idx = comp_ && comp_.props['for.index'];
      
      if (wdgt.$callspace && wdgt.$callspace.hasOwnProperty('flowFlag')) {  // has callspace
        if (wdgt.$callspace.forSpace) { // two spaces in one comp
          if (pathFlag >= -1) {
            if (pathFlag == -1) {       // go next segment
              if (typeof idx == 'number')
                iLastIdx = idx;
              else iLastIdx = undefined;
            }
            else {  // pathFlag >= 0
              if (parentNum == 0) {     // eval at comp directly, ignore forSpace, enter new segment // wdgt.$callspace must not $for
                if (typeof idx == 'number')
                  iLastIdx = idx;
                else iLastIdx = undefined;
              }
              // else, use last segment's index
            }
            if (bInfo) {
              bInfo.unshift(pathFlag >= 0 && parentNum != 0); // true means uses forSpace
              bInfo.unshift(wdgt.$callspace);
              bInfo.unshift(iLastIdx);  // last props['for.index']
            }
            return wdgt.component;      // found
          }
          else pathFlag += 2;
        }
        else { // must not '$$for', can be $for=''
          if (pathFlag >= 0) {
            var flowFlag_ = wdgt.$callspace.flowFlag;
            if ((flowFlag_ == 'for' || flowFlag_ == 'for0') && parentNum == 0) {  // ignore this $for callspace  // enter new segment
              if (typeof idx == 'number')
                iLastIdx = idx;
              else iLastIdx = undefined;
              
              wdgt = wdgt.parent;
              parentNum += 1;
              continue;
            }
            
            if (bInfo) {
              bInfo.unshift(false);
              bInfo.unshift(wdgt.$callspace);
              bInfo.unshift(iLastIdx); // use last segment's index
            }
            return wdgt.component;     // found
          }
          else pathFlag += 1;
        }
        
        if (typeof idx == 'number')
          iLastIdx = idx;
        else iLastIdx = undefined;
      }
      else {
        if (iLastIdx === undefined && typeof idx == 'number')
          iLastIdx = idx;
      }
      
      wdgt = wdgt.parent;
      parentNum += 1;
    }
    return null;
  }
  else { // pathFlag must be string, no need find props['for.index']
    while (wdgt) { // if parentNum == 0 means find from current node
      if (wdgt.$callspace && wdgt.$callspace.hasOwnProperty('flowFlag')) { // has callspace
        if (parentNum > 0 || wdgt.$callspace.forSpace)    // find from sub node, or from current node and current has two spaces ($$for)
          return getCompByPath_(wdgt.component,pathFlag); // according to nearest callspace
      }
      
      wdgt = wdgt.parent;
      parentNum += 1;
    }
    return null;
  }
}

function setupExprSpace(space,comp,isEmptyFor) {
  // space is: comp.widget.$callspace.exprSpace
  space.ex = creator.createEx(comp);
  space.Math = Math;
  
  var indexFunc_ = function(idx,parentIdx) {
    if (idx === undefined)
      idx = 0;
    else if (typeof idx != 'number' || isNaN(idx) || idx > 0) {
      console.log('warning: invalid expression: index(' + idx + ')');
      idx = 0;
    }
    // if idx == 0 && isEmptyFor, report error when compiling
    
    var bInfo = [], targ = findComponent_(comp,idx,bInfo,parentIdx);
    return targ? bInfo[0]: undefined;
  };
  space.index = indexFunc_;
  
  function makePropsDualsFn(sName) {
    return ( function(idxOrPath) {
      var path_ = idxOrPath || 0, tp = typeof path_;
      if (tp == 'number') {
        if (path_ > 0) path_ = 0;
      }
      else if (tp != 'string')
        path_ = 0;
      
      if (path_ === 0)
        return comp[sName]; // quick found
      
      var parentIdx = 0;
      if (indexFunc_ !== space.index) parentIdx = 1; // eval from sub-level component
      var bInfo = [], targ = findComponent_(comp,path_,bInfo,parentIdx);
      return (targ? targ[sName]: null);
    });
  }
  space.props = makePropsDualsFn('props');
  space.state = makePropsDualsFn('state');
  space.duals = makePropsDualsFn('duals');
  
  space.typeof = function(value) {
    return typeof value;
  };
  
  space.count = function(idx) {
    if (idx === undefined)
      idx = 0;
    else if (typeof idx != 'number' || isNaN(idx) || idx > 0) {
      console.log('warning: invalid expression: count(' + idx + ')');
      idx = 0;
    }
    if (idx === 0 && isEmptyFor)
      throw new Error('invalid expression: count(0)');
    
    var parentIdx = 0;
    if (indexFunc_ !== space.index) parentIdx = 1; // eval from sub-level component
    var bInfo = [], targ = findComponent_(comp,idx,bInfo,parentIdx), callspace = bInfo[1];
    if (targ && callspace) // bInfo[2]: using callspace.forSpace
      return ((bInfo[2]?callspace.forSpace:callspace)['data-for.path'] || []).length;
    else return 0;
  };
  
  space.item = function(idx) {
    if (idx === undefined)
      idx = 0;
    else if (typeof idx != 'number' || isNaN(idx) || idx > 0) {
      console.log('warning: invalid expression: item(' + idx + ')');
      idx = 0;
    }
    if (idx === 0 && isEmptyFor)
      throw new Error('invalid expression: item(0)');
    
    var parentIdx = 0;
    if (indexFunc_ !== space.index) parentIdx = 1; // eval from sub-level component
    var bInfo = [], targ = findComponent_(comp,idx,bInfo,parentIdx), callspace = bInfo[1];
    if (targ && callspace) {
      var index = parentIdx? space.index(idx): bInfo[0];
      if (typeof index == 'number')  // bInfo[2] means use callspace.forSpace
        return ((bInfo[2]?callspace.forSpace:callspace)['data-for.path'] || {})[index];
    }
    return undefined;
  };
}

var flowExprIndex_ = 1;

function anyPrevIfTrue2(comp) {
  var owner = comp.widget;
  owner = owner && owner.parent;
  if (!owner) return false;
  
  var ownerObj = owner.component;
  if (!ownerObj) return false;
  var idx = ownerObj.$gui.compIdx[comp.$gui.keyid];
  if (typeof idx != 'number') return false;
  
  var ret = false, comps = ownerObj.$gui.comps, bTodo = [];
  idx -= 1;
  while (idx >= 0) {
    var obj = comps[idx--], sKey = getElementKey_(obj);
    obj = obj && sKey && owner[sKey];
    obj = obj && obj.component;
    if (obj && obj.$gui.compState) {   // if compState == 0, not ready yet
      var sFlag = obj.$gui.flowFlag;
      if (sFlag == 'if') {
        if (obj.state[sFlag]) ret = true;  // condition fulfilled: any True
        break; // avoid meet previous '$elif'
      }
      else if (sFlag == 'elif') {
        if (obj.state[sFlag]) {
          ret = true;  // condition fulfilled: any True
          break;
        }
      }
      else break;
    }
  }
  
  return ret;
}

var reservedCallable_ = ['props','state','duals','item','count','index'];

function adjustExprAst(bAst,bDepend,isRight) { // isRight=true means 'expr.' or 'expr[' prefixed
//  A) adjust i)item.attr --> item().attr  ii)item[sAttr] --> item()[s]  iii)item --> item()
//     includes: props duals item count index
//  B) get all depends of: duals(path).attr
//  C) get all depends of: item(N) count(N) index(N)
  
  var dualFlag, tp = bAst[0], b = bAst[1];
  if (tp >= 51) {
    if (tp == 51)
      adjustExprAst(b[0],bDepend);
    else if (tp == 52) {
      adjustExprAst(b[0],bDepend);
      adjustExprAst(b[2],bDepend);
    }
    else if (tp == 61) {
      adjustExprAst(b[0],bDepend);
      adjustExprAst(b[2],bDepend);
    }
    else if (tp == 62) {
      adjustExprAst(b[0],bDepend);
      adjustExprAst(b[2],bDepend);
      adjustExprAst(b[4],bDepend);
    }
    // else ignore
  }
  else if (tp >= 31) {
    if (tp == 32) {
      if (!isRight && (dualFlag=isCallableId(bAst))) {  // ID --> ID(), such as: props duals count item index
        var iLn = bAst[2], idExpr = bAst.slice(0);
        bAst[0] = 34; bAst[1] = [idExpr,[14,'(',iLn,17], null];
        return bDepend.push([dualFlag,0]);
      }
      // else, ignore
    }
    else if (tp == 34) {  // expr OP expr     expr OP null     expr OP expr_list
      var exprL = b[0], op = b[1], exprR = b[2], opName = op[1];
      if (opName == '.') {
        if (!isRight && (dualFlag=isCallableId(exprL))) {   // ID --> ID(), such as: props duals count item index
          if (exprR[0] == 32) {
            var sId = exprR[1][0][1];  // exprR[1][0] is ID token
            bDepend.push([dualFlag,0,sId]);
            
            // props/duals.ID  -->  props/duals() . ID
            var iLn = exprL[2], idExpr = exprL.slice(0);
            exprL[0] = 34; exprL[1] = [idExpr,[14,'(',iLn,17], null];
          }
          else adjustExprAst(exprR,bDepend,true);
        }
        else {
          if (adjustExprAst(exprL,bDepend,isRight)) {   // duals()/duals(xx)  or  props()/props(xx)
            if (exprR[0] == 32) {
              var sId = exprR[1][0][1], bLast = bDepend[bDepend.length-1];
              bLast.push(sId);                  // duals(xx).sId   or   props(xx).sId
              return 0;
            }
          }
          adjustExprAst(exprR,bDepend,true);
        }
      }
      else if (opName == '[') {
        if (!isRight && (dualFlag=isCallableId(exprL))) {    // ID[sAttr]
          if (exprR[0] == 33) {
            var sStr = exprR[1][0][1];  // exprR[1][0] is string token
            bDepend.push([dualFlag,0,sStr.slice(1,-1)]);
            
            // props/duals[sAttr]  -->  props/duals() [ sAttr
            var iLn = exprL[2], idExpr = exprL.slice(0);
            exprL[0] = 34; exprL[1] = [idExpr,[14,'(',iLn,17], null];
          }
          else if (dualFlag == 4 && exprR[0] == 31) { // item[N]  --> item()[N]
            bDepend.push([dualFlag,0]);
            
            var iLn = exprL[2], idExpr = exprL.slice(0);
            exprL[0] = 34;
            exprL[1] = [idExpr, [14, '(', iLn, 17], null];
          }
          else adjustExprAst(exprR,bDepend);    // isRight=false
        }
        else {
          if (adjustExprAst(exprL,bDepend,isRight)) { // duals()/duals(xx)  or  props()/props(xx)
            if (exprR[0] == 33) {
              var sStr = exprR[1][0][1], bLast = bDepend[bDepend.length-1];
              bLast.push(sStr.slice(1,-1));     // props/duals(xx)[sStr]
              return 0;
            }
          }
          adjustExprAst(exprR,bDepend);         // isRight=false
        }
      }
      else if (opName == '(') {
        dualFlag = isCallableId(exprL);
        if (dualFlag) {       // ID ( expr_list // no check isRight, op-level of '(' is lower than . [ 
          if (exprR === null) // props/duals()
            return bDepend.push([dualFlag,0]);
        
          var tpR = exprR[0];
          if (tpR == 51) {    // expr_list_1
            var subExpr = exprR[1][0], subTp = subExpr[0];
            if (subTp == 31) {
              var sNum = subExpr[1][0][1];  // subExpr[1][0] is number token
              return bDepend.push([dualFlag,parseFloat(sNum)]);
            }
            else if (subTp == 33) {
              var sStr = subExpr[1][0][1];  // subExpr[1][0] is string token
              return bDepend.push([dualFlag,sStr.slice(1,-1)]);
            }
          }
          
          adjustExprAst(exprR,bDepend);     // isRight=false
        }
        else {
          adjustExprAst(exprL,bDepend);     // isRight=false, op-level is lower than . [
          if (exprR !== null)
            adjustExprAst(exprR,bDepend);   // isRight=false
        }
      }
      else if (opName == 'in') {
        if (exprL[0] != 32)  // 32 is expr_2: ID  // no change, avoid change item --> item()
          adjustExprAst(exprL,bDepend);  // isRight=false, op-level is lower than . [
        adjustExprAst(exprR,bDepend);    // isRight=false
      }
      else { // opName such as: + - * / &&
        adjustExprAst(exprL,bDepend);    // isRight=false, op-level is lower than . [
        adjustExprAst(exprR,bDepend);    // isRight=false
      }
    }
    else if (tp == 35) {  // expr? expr: expr
      adjustExprAst(b[0],bDepend);
      adjustExprAst(b[2],bDepend);
      adjustExprAst(b[4],bDepend);
    }
    else if (tp == 37) {  // ( expr_list )
      adjustExprAst(b[1],bDepend);
    }
    else if (tp == 39) {  // [ expr_list ]
      adjustExprAst(b[1],bDepend);
    }
    else if (tp == 41) {  // { expr_items }
      adjustExprAst(b[1],bDepend);
    }
    // else ignore
  }
  // else ignore
  
  return 0;
  
  function isCallableId(expr) {
    if (expr[0] == 32) {
      var sId = expr[1][0][1], iPos = reservedCallable_.indexOf(sId);
      if (iPos >= 0)
        return iPos + 1; // props:1, state:2, duals:3, item:4, count:5,index:6
    }
    return 0;
  }
}

function getKeyChildExprAst_(comp,sExpr,attrName) { // attrName: 'key' or 'children'
  // step 1: setup AST
  var bAst = setupExprAst(sExpr,comp,attrName);
  if (bAst) {
    if (bAst[0] == 61) bAst = bAst[1][2];  // expr_items_1 : expr : expr  // ignore 'all:' or 'strict:' head
    adjustExprAst(bAst,[]);
    
    var bInfo = [], ownerObj = findComponent_(comp,0,bInfo,1), ownerSpace = bInfo[1];
    if (!ownerObj || !ownerSpace) return null;
    
    if (bInfo[2]) ownerSpace = ownerSpace.forSpace;
    return ( function(comp,idx) {
      var space = ownerSpace.exprSpace, oldIndex = space.index;
      space.index = function(N) {
        if (N === undefined || N === 0)
          return idx;
        else return oldIndex(N,1);
      };
      
      space.$info = [comp,attrName,ex.time()];
      try {
        return evalInSpace(bAst,space);
      }
      finally {
        // delete space.$info;   // keep for asynchrony task
        space.index = oldIndex;  // restore to old function
      }
    });
  }
  
  return null;
}

var oneTickFlowId_ = 0;

function renewFuncOfExpr_(comp,sKey,sExpr,isExprSetter) {
  // step 1: setup AST
  var headId = 'any';
  var bAst = setupExprAst(sExpr,comp,sKey);
  
  // step 2: scan AST and adjust
  if (bAst) {
    if (bAst[0] == 61) {    // expr_items_1 : expr : expr
      headId = bAst[1][0];
      bAst = bAst[1][2];
      
      if (headId[0] == 32)  // expr_2 : ID
        headId = headId[1][0][1];
      if (headId !== 'all' && headId !== 'strict')
        headId = 'any';
    }
    
    var ctrlFlag = ctrlExprCmd_.indexOf(sKey);
    if (ctrlFlag >= 0 && headId != 'any') { // can not use 'all:expr' or 'strict:expr' in $for $if $elif $else
      console.log("error: invalid using '" + headId + ":' at " + comp.widget.getPath() + ':' + sKey);
      headId = 'any';
    }
    
    var bDepend = [];
    adjustExprAst(bAst,bDepend);
    
    if (sKey == 'trigger') {
      var sFireType = comp.props.fireType || 'auto';
      if (sFireType === 'onsite') {   // gui.syncTrigger > 1
        bDepend = [];                 // temporary eval $trigger, no listen
        comp.$gui.syncTrigger = 3;    // 2 for temporary no recall fireTrigger_()
      }
      else if (sFireType === 'none')
        comp.$gui.syncTrigger = 0;
      else comp.$gui.syncTrigger = 1; // 'auto', no reverse eval $trigger, auto fire action
    }
    
    // step 3: setup dDepend = {sPath:[comp,attr1,attr2,...]}  bDepend2 = [-2,-1,...]
    var dDepend = {}, bDepend2 = [];
    bDepend.forEach( function(item) {
      var sAttr, iType = item[0], pathFlag = item[1];
      if (iType >= 4 && typeof pathFlag == 'number') { // item() count() index() // under $for
        if (pathFlag <= 0 && bDepend2.indexOf(pathFlag) < 0) // 0, -1, -2, ...
          bDepend2.push(pathFlag);
        return;
      }
      
      if (iType != 3 || (sAttr=item[2]) === undefined)
        return;  // not duals, or not duals.xx / duals[xx]
      
      if (typeof pathFlag == 'number') {
        if (!(pathFlag <= 0)) {  // NaN <= 0 is false
          console.log('error: invalid using duals(' + pathFlag + ') at ' + comp.widget.getPath() + ':' + sKey);
          return;
        }
      }  // else, pathFlag must be string
      
      var b = dDepend[pathFlag];
      if (!b) b = dDepend[pathFlag] = [];
      if (b.length == 0) {
        var bInfo = [], targ = findComponent_(comp,pathFlag,bInfo,0);
        if (!targ)
          console.log('error: can not find duals(' + pathFlag + ') at ' + comp.widget.getPath() + ':' + sKey);
        else b.push(targ,sAttr);
      }
      else {
        if (b.indexOf(sAttr,1) < 0)  // no duplicate
          b.push(sAttr);
      }
    });
    bDepend2.sort( function(a,b) { return a-b } );
    
    // step 4: add source duals listen
    var keyArrive = {};
    Object.keys(dDepend).forEach( function(sHistoryKey) { // sHistoryKey is: 0,-1...
      var b = dDepend[sHistoryKey], obj = b && b[0];
      if (!obj) return;  // obj can be undefined since findComponent_() maybe failed
      
      var b2 = b.slice(1);
      if (headId != 'any') {
        b2.forEach( function(item) {
          keyArrive[sHistoryKey + ':' + item] = false;  // false means this dual not fired yet 
        });
      }
      
      obj.listen(b2, function(value,oldValue,currKey) { // value, oldValue not used
        if (!comp.isHooked) {
          obj.unlisten('*',comp);
          return;
        }
        
        if (headId == 'any') {
          var newAttrs = comp.state.exprAttrs.slice(0);
          if (newAttrs.indexOf(sKey) < 0)       // ensure no duplicated
            newAttrs.push(sKey);
          if (ctrlExprCmd_.indexOf(sKey) > 0) {    // $if $elif $else
            if (oneTickFlowId_ == 0) {
              oneTickFlowId_ = ++flowExprIndex_;    // use same ID in same tick
              setTimeout( function() {
                oneTickFlowId_ = 0;
              },0);
            }
            comp.$gui.flowExprId = oneTickFlowId_; // for only run one time
          }
          comp.setState({exprAttrs:newAttrs});
        }
        else {
          var sKey2 = sHistoryKey + ':' + currKey;
          if (keyArrive.hasOwnProperty(sKey2)) {
            if (headId == 'strict' && keyArrive[sKey2]) // only log error, not throw
              console.log('error: conflict in strict mode, duals(' + sHistoryKey + ').' + currKey + ' is fired more than one time.');
            keyArrive[sKey2] = true;
            
            var arriveAll = true, bList = Object.keys(keyArrive);
            for (var i=bList.length-1; i >= 0; i--) {
              if (!keyArrive[bList[i]]) {
                arriveAll = false;
                break;
              }
            }
            
            if (arriveAll) {
              for (var i=bList.length-1; i >= 0; i--) { // reset flag
                keyArrive[bList[i]] = false;
              }
              
              var newAttrs = comp.state.exprAttrs.slice(0);
              if (newAttrs.indexOf(sKey) < 0) // ensure no duplicated  // sKey must not: for if elif else
                newAttrs.push(sKey);
              comp.setState({exprAttrs:newAttrs});
            }
          }
        }
      });
    });
    
    // step 5: add duals['for'] listen
    if (bDepend2.length) {
      if (headId == 'any')
        listenParentFor(comp,sKey,bDepend2[0],bDepend2);
      // else, ignore listen item/index/count
    }
    
    // step 6: return update-expr function
    var bInfo = [], ownerObj = findComponent_(comp,0,bInfo,0);
    var itemIndex = bInfo[0], callspace = bInfo[1];
    if (!ownerObj || !callspace) {
      console.log('warning: locate current callspace failed.');
      return [null,headId];
    }
    if (bInfo[2]) callspace = callspace.forSpace;
    
    var isHtmlTxt = false;
    var forExpr = null, filterExpr = null, orderList = null;
    if (sKey == 'html')
      isHtmlTxt = true;
    else {
      if (ctrlFlag == 0) {  // $for
        var bForArg = [], bAst_ = bAst, forTp = bAst_[0], bSub = bAst_[1];
        if (forTp == 51 && bSub[0][0] == 37) {  // (expr,expr, ...) // expr_7 : ( expr_list )
          bAst_ = bSub[0][1][1];
          forTp = bAst_[0];
          bSub = bAst_[1];
        }
        
        if (forTp == 51)         // expr_list_1 : expr
          forExpr = bSub[0];
        else if (forTp == 52) {  // expr_list_2 : expr_list , expr
          while (forTp == 52) {
            bForArg.unshift(bSub[2]);
            bAst_ = bSub[0]; forTp = bAst_[0]; bSub = bAst_[1];
          }
          if (forTp == 51)
            forExpr = bSub[0];
          // else, forExpr = null;
        }
        else forExpr = bAst_;  // should be: item in expr
        
        if (forExpr && forExpr[0] == 34 && (bSub=forExpr[1])[1][1] == 'in') // item in expr
          forExpr = bSub[2];
        else forExpr = null;
        if (!forExpr)
          console.log('error: invalid expression ($for) at ' + comp.widget.getPath());
        else {
          while (bForArg.length) {
            var argAst = bForArg.pop(), argTp = argAst[0];
            if (argTp == 31) {
              if (!orderList) orderList = [];
              orderList.unshift(parseFloat(argAst[1][0][1]));
            }
            else if (argTp == 33) {
              if (!orderList) orderList = [];
              orderList.unshift(argAst[1][0][1].slice(1,-1));
            }
            else {
              if (bForArg.length) {
                console.log('warning: invalid filter expression ($for) at ' + comp.widget.getPath());
                filterExpr = null;
                break;
              }
              filterExpr = argAst;
            }
          }
        }
      }
    }
    
    return [ function(comp,flowDirFlag) {
      var space = callspace.exprSpace, oldIndex = space.index;
      space.index = function(N) {
        if (N === undefined || N === 0)
          return itemIndex;
        else return oldIndex(N,1);
      };
      
      space.$info = [comp,sKey,ex.time()];
      try {
        if (ctrlFlag == 0) {       // $for
          comp.$gui.flowExprId0 = comp.$gui.flowExprId = flowExprIndex_; // no use yet
          if (forExpr) {
            var bForData = evalInSpace(forExpr,space);
            if (Array.isArray(bForData)) {
              if (filterExpr) {
                var bb = [], itemLen = bForData.length;
                if (itemLen) {  // has length
                  space.$count = itemLen;
                  for (var ii=0; ii < itemLen; ii++) {
                    var oneItem  = space.$item  = bForData[ii];
                    space.$index = ii;
                    try {
                      if (evalInSpace(filterExpr,space))
                        bb.push(oneItem);
                    }
                    catch(e) {  // ignore this item 
                      console.log('error: run filter failed ($index=' + ii + ' in ' + comp.widget.getPath() + ')');
                      console.log(e);
                    }
                  }
                  delete space.$index;
                  delete space.$item;
                  delete space.$count;
                }
                bForData = bb;
              }
              if (orderList)
                bForData = ex.order(bForData,orderList);
              comp.state[sKey] = bForData;
            }
            else {
              console.log("error: result of '$for' (" + comp.widget.getPath() + ") should be array");
              comp.state[sKey] = [];
            }
          }
          else comp.state[sKey] = [];
        }
        else if (ctrlFlag >= 1) {   // $if $elif $else
          var exprId = comp.$gui.flowExprId;
          flowDirFlag = flowDirFlag || 0;  // 0:init, 1:no prev, 2:no next
          if (ctrlFlag == 2) {      // $elif
            var currTrue = false, needUpdate = false;
            if (exprId !== comp.$gui.flowExprId0)
              needUpdate = true;
            else if (flowDirFlag) { // from updateAnyPostElse() or anyPrevIfTrue()
              if (flowExprIndex_ > comp.$gui.flowExprId0)
                needUpdate = true;
            }
            comp.$gui.flowExprId0 = comp.$gui.flowExprId = flowExprIndex_;  // avoid recursion
            
            if (needUpdate) {
              var newValue, oldValue = comp.state['elif'];
              if (flowDirFlag != 1 && anyPrevIfTrue(comp,exprId)) { // previous $if or $elif must have same 'for.index'
                currTrue = true;
                newValue = comp.state['elif'] = false;
              }
              else {
                newValue = comp.state['elif'] = evalInSpace(bAst,space);
                currTrue = !!newValue;
              }
              if (newValue && oldValue !== newValue && comp.props['hasStatic.']) {
                setTimeout( function() {
                  renewStaticChild(comp,true);
                },0);
              }
            }
            else {  // no need update
              if (comp.state['elif'] || (flowDirFlag != 1 && anyPrevIfTrue(comp,exprId)))
                currTrue = true;
            }
            if (flowDirFlag != 2)
              updateAnyPostElse(comp,currTrue,exprId);
          }
          else if (ctrlFlag == 1) { // if
            var needUpdate = false;
            if (exprId !== comp.$gui.flowExprId0)
              needUpdate = true;
            else if (flowDirFlag) { // in updateAnyPostElse() or anyPrevIfTrue()
              if (flowExprIndex_ > comp.$gui.flowExprId0)
                needUpdate = true;
            }
            comp.$gui.flowExprId0 = comp.$gui.flowExprId = flowExprIndex_; // avoid recursion
            
            if (needUpdate) {
              var oldValue = comp.state['if'];
              var newValue = comp.state['if'] = evalInSpace(bAst,space);
              if (newValue && oldValue !== newValue && comp.props['hasStatic.']) {
                setTimeout( function() {
                  renewStaticChild(comp,true);
                },0);
              }
            }
            // else , ignore
            if (flowDirFlag != 2)
              updateAnyPostElse(comp,!!comp.state['if'],exprId);
          }
          // else, unknown error, ignore
        }
        else {
          if (isExprSetter) {
            var oldSync = comp.$gui.syncTrigger;
            if (oldSync) {       // sKey must be 'trigger'
              var oldTrigger = comp.state.trigger;
              if (oldSync <= 2)  // 'auto' or ('onsite' and called from fireTrigger_())
                comp.duals[sKey] = evalInSpace(bAst,space);
              
              var noFire = false;
              if (oldSync !== 1) {
                if (oldSync === 2) {  // called from fireTrigger_()
                  noFire = true;
                  comp.$gui.syncTrigger = 3;
                }
                else comp.$gui.syncTrigger = identicalId_;  // means no need re-eval $trigger
              } // else, oldSync == 1, should fire
              
              if (!noFire)
                fireTrigger_(oldTrigger,comp); // not force trigger, only when state.trigger changed
            }
            else comp.duals[sKey] = evalInSpace(bAst,space);
          }
          else comp.state[sKey] = evalInSpace(bAst,space);
          if (isHtmlTxt) comp.duals['html.'] = comp.state[sKey];
        }
      }
      finally {
        // delete space.$info;   // keep for asynchrony task
        space.index = oldIndex;  // restore to old function
      }
    }, headId];
  }
  return [null,headId];
  
  function anyPrevIfTrue(comp,exprId) {
    var owner = comp.widget;
    owner = owner && owner.parent;
    if (!owner) return false;
    
    var ownerObj = owner.component;
    if (!ownerObj) return false;
    var idx = ownerObj.$gui.compIdx[comp.$gui.keyid];
    if (typeof idx != 'number') return false;
    
    var ret = false, comps = ownerObj.$gui.comps, bTodo = [], hasEval = false;
    idx -= 1;
    while (idx >= 0) {
      var obj = comps[idx--], sKey_ = getElementKey_(obj);
      obj = obj && sKey_ && owner[sKey_];
      obj = obj && obj.component;
      if (obj && obj.$gui.compState) {   // if compState == 0, not ready yet
        var sFlag = obj.$gui.flowFlag;
        if (sFlag == 'if' || sFlag == 'elif') {
          var oldExprId = obj.$gui.flowExprId0;
          if (!hasEval && (obj.$gui.flowExprId !== oldExprId || exprId > oldExprId))
            bTodo.unshift([sFlag,obj]);  // wait to update
          else {   // current and all previous if/elif must be updated, since we sync-previous every time
            hasEval = true;
            if (obj.state[sFlag]) ret = true;  // condition fulfilled: any True
          }
          if (sFlag == 'if') break; // avoid meet previous '$elif'
        }
        else break;
      }
    }
    
    if (bTodo.length) {
      bTodo.forEach( function(item) {
        var sFlag = item[0], obj = item[1], fn = obj.$gui.exprAttrs[sFlag];
        if (ret || !fn) {
          if (obj.state[sFlag]) {    // true --> false
            setTimeout( function() {
              obj.state[sFlag] = true;
              var dState = {}; dState[sFlag] = false;
              obj.setState(dState);
            },0);  // fire render in next tick
          }
          obj.state[sFlag] = false;
          obj.$gui.flowExprId0 = obj.$gui.flowExprId = flowExprIndex_; // set as newest
        }
        else {  // fn must exists
          try {
            var oldValue = obj.state[sFlag];
            fn(obj,1);  // auto set newest flowExprId
            var newValue = obj.state[sFlag];
            if (newValue) ret = true;
            
            if (!oldValue != !newValue) {
              setTimeout( function() {
                obj.state[sFlag] = oldValue;
                var dState = {}; dState[sFlag] = newValue;
                obj.setState(dState, function() {
                  if (newValue && obj.props['hasStatic.']) {
                    renewStaticChild(obj,true);
                  }
                });
              },0);  // fire render in next tick
            }
          }
          catch(e) { console.log(e); }
        }
      });
    }
    return ret;
  }
  
  function updateAnyPostElse(comp,currTrue,exprId) {
    var owner = comp.widget;
    owner = owner && owner.parent;
    if (!owner) return;
    
    var ownerObj = owner.component;
    if (!ownerObj) return;
    var idx = ownerObj.$gui.compIdx[comp.$gui.keyid], comps = ownerObj.$gui.comps;
    if (typeof idx != 'number') return;
    
    var bTodo = [], iLen = comps.length;
    for (var i=idx+1; i < iLen; i+=1) {
      var item = comps[i], sKey_ = item && getElementKey_(item);
      var obj = sKey_ && owner[sKey_];
      obj = obj && obj.component;
      if (obj && obj.$gui.compState) {  // if compState == 0, not ready yet
        var sFlag = obj.$gui.flowFlag;
        if (sFlag == 'elif' || sFlag == 'else') {
          var oldExprId = obj.$gui.flowExprId0;
          if (obj.$gui.flowExprId !== oldExprId || exprId > oldExprId)
            bTodo.push([sFlag,obj]);
          else break; // no need update, not scan next to avoid recursion
          if (sFlag == 'else') break;
        }
        else break;
      }
    }
    
    bTodo.forEach( function(item) {
      var sFlag = item[0], obj = item[1];  // sFlag only can be: elif else
      var fn = sFlag == 'elif'? obj.$gui.exprAttrs[sFlag]: null;
      
      if (currTrue || (sFlag == 'elif' && !fn)) {  // take as false if meet invalid fn for elif
        obj.$gui.flowExprId0 = obj.$gui.flowExprId = flowExprIndex_; // set as newest
        if (obj.state[sFlag]) { // true --> false
          obj.state[sFlag] = false;
          setTimeout( function() {
            obj.state[sFlag] = true;
            var dState = {}; dState[sFlag] = false;
            obj.setState(dState);
          },0);  // fire render in next tick
        } // else, ignore
      }
      else {  // need update this node
        if (sFlag == 'elif') {   // fn must exists
          try {
            var oldValue = obj.state[sFlag];
            fn(obj,2);  // auto set newest flowExprId
            var newValue = obj.state[sFlag];
            if (newValue) currTrue = true;
            
            if (!oldValue != !newValue) {
              setTimeout( function() {
                obj.state['elif'] = !newValue;
                obj.setState({'elif':newValue}, function() {
                  if (newValue && obj.props['hasStatic.']) {
                    renewStaticChild(obj,true);
                  }
                });
              },0);  // fire render in next tick
            }
          }
          catch(e) { console.log(e); }
        }
        else { // is $else
          // currTrue = true;  // no need assign since it is last one
          obj.$gui.flowExprId0 = obj.$gui.flowExprId = flowExprIndex_;
          if (!obj.state['else']) {  // false --> true
            obj.state['else'] = true;
            setTimeout( function() {
              obj.state['else'] = false;
              obj.setState({'else':true}, function() {
                if (obj.props['hasStatic.']) {
                  renewStaticChild(obj,true);
                }
              });
            },0); // fire render in next tick
          } // else, ignore
        }
      }
    });
  }
  
  function listenParentFor(comp,sKey,iTo,bDepend) {
    var iCurr = bDepend[bDepend.length-1];
    var bInfo = [], targ = findComponent_(comp,iCurr,bInfo,0);
    if (!targ) {
      console.log('error: can not listen (' + iCurr + ':for) for ' + comp.widget.getPath() + ':' + sKey);
      return;
    }
    
    var wdgt = targ.widget, callspace = bInfo[1], hasTwoSpace = bInfo[2];
    var obj, listenNum = 0;
    while (wdgt && callspace) {
      if (bDepend.indexOf(iCurr) >= 0 && (obj=wdgt.component) && (obj.props['$for'] || obj.props['$$for'])) {
        obj.listen('for', function(value,oldValue) { // value, oldValue not used
          if (!comp.isHooked) {
            obj.unlisten('*',comp);
            return;
          }
          
          var newAttrs = comp.state.exprAttrs.slice(0);
          if (newAttrs.indexOf(sKey) < 0)        // ensure no duplicated
            newAttrs.push(sKey);
          if (ctrlExprCmd_.indexOf(sKey) > 0) {  // $if $elif $else
            if (oneTickFlowId_ == 0) {
              oneTickFlowId_ = ++flowExprIndex_; // use same ID in same tick
              setTimeout( function() {
                oneTickFlowId_ = 0;
              },0);
            }
            comp.$gui.flowExprId = oneTickFlowId_; // the flag for only run one time
          }
          comp.setState({exprAttrs:newAttrs});
        });
        listenNum += 1;
      }
      
      if (hasTwoSpace) {
        hasTwoSpace = false; // reuse current wdgt and callspace
        iCurr -= 1;
      }  
      else {
        wdgt = wdgt.parent;
        while (wdgt) {
          callspace = wdgt.$callspace;
          if (!callspace)
            wdgt = wdgt.parent;
          else {
            hasTwoSpace = !!callspace.forSpace;
            iCurr -= 1;
            break;
          }
        }
      }
      if (iCurr < iTo) break;
    }
    
    if (listenNum < bDepend.length)
      console.log('error: not all source ($for) is watched for ' + comp.widget.getPath() + ':' + sKey);
  }
}

function triggerConnTo_(bConn,value,oldValue,sKey) {
  for (var i=0,item; item = bConn[i]; i++) {
    try {
      var targ = item[0], keyOrFn = item[1];
      if (item[2]) { // isDual
        if (targ) targ.duals[keyOrFn] = value;
      }
      else {
        if (targ) {
          if (targ[keyOrFn])
            targ[keyOrFn](value,oldValue,sKey);
        }
        else {
          if (typeof keyOrFn == 'function')
            keyOrFn(value,oldValue,sKey);
        }
      }
    }
    catch(e) { console.log(e); }
  }
}

function dualFuncOfGetSet_(comp,attr,superSet,setFn,baseDual) {
  var gui = comp.$gui, isId__ = attr == 'id__';
  if (baseDual) {
    if (isId__) {
      baseDual = undefined;
      console.log('error: can not apply base.setter to duals.id__');
    }
    else if (superSet)
      baseDual.setter = superSet;
    else {
      baseDual.setter = function(value,oldValue) {
        comp.state[attr] = value;
      };
    }
  }
  return [getterFunc.bind(comp),setterFunc.bind(comp)];
  
  function getterFunc() {
    return this.state[attr];
  }
  
  function setterFunc(value) {
    if (gui.inSync) {
      var oldValue, isTop;
      if (arguments.length >= 2) {
        oldValue = arguments[1];
        isTop = false;
      }
      else {  // is topmost level
        oldValue = this.state[attr];
        if (oldValue === value) return;   // if same to old, just ignore
        isTop = true;
      }
      
      var triggerLsn = false;
      if (isId__ && value <= 2) {  // must not use baseDual (base.setter)
        if (isTop)
          this.state.id__ = gui.id__ = value; // if value > 2, setter will assign gui.id__
        if (setFn) setFn(value,oldValue);     // not call superSet
        triggerLsn = !superSet && value != 0;
      }
      else {
        if (superSet) {
          if (!baseDual) {
            if (isTop) this.state[attr] = value;
            superSet(value,oldValue);
          }
        }
        else {
          if (isTop && !baseDual)
            this.state[attr] = value;
          triggerLsn = true;
        }
        if (setFn)
          setFn(value,oldValue);
      }
      
      if (triggerLsn) {  // only trigger listen in inner-most setter-func // avoid trigger twice
        var bConn = gui.connectTo[attr];
        if (bConn && gui.compState >= 2) {  // not trigger when first render
          setTimeout( function() {
            triggerConnTo_(bConn,comp.state[attr],oldValue,attr);
          },0);
        }
      }
    }
    else {
      if (!this.state) {
        gui.initDuals.push([attr,value]);  // maybe undefine later, but used only when this.duals.attr exists
      }
      else if (isId__ && value == 0) {     // must not use base.setter
        var oldValue = this.state.id__;
        if (oldValue == 0) return;         // if same to old, just ignore
        
        this.state.id__ = gui.id__ = value;
        if (setFn) setFn(value,oldValue);  // no delay // not call superSet
      }
      else {
        var duals2 = this.state.duals.slice(0); // not remove exist attr // sometime not means 'replace' (but 'update') such as 'style'
        duals2.push([attr,value]);         // update duals.attr in order
        setTimeout( function() {
          comp.setState({duals:duals2});
        },0); // maybe current in render(), set it in next tick
      }
    }
  }
}

function syncProps_(comp) {
  var ret = false, firstRender = false;
  var exprDict, gui = comp.$gui, duals = comp.duals;
  
  gui.inSync = true;
  
  try {
    if (gui.compState == 0) {
      firstRender = true;
      gui.compState = 1;    // first render
    }
    else gui.compState = 2; // 2 means second or later render
    
    // setup gui.duals and regist tagAttrs to duals
    var sCtrlFlow = gui.flowFlag;
    var duals0 = gui.duals, duals2 = comp.state.duals;
    if (firstRender) {
      ret = true;
      if (gui.hasIdSetter)
        duals.id__ = 1;
      else { // simulate duals.id__ assign, but no trigger setter
        comp.state.id__ = 1;
        gui.id__ = 1;
      }
      
      var dHasDual = {}, bWaitPass = [];
      Object.keys(duals).forEach( function(sKey) {
        var item = comp.props[sKey];
        if (item !== undefined) { // use props.xxx
          duals0[sKey] = item;    // record prop.xxx
          bWaitPass.push([sKey,item]);
        }
        dHasDual[sKey] = true;
      });
      
      // check child of template when in __design__
      var exprAttrs0 = gui.exprAttrs, isExprList = Array.isArray(exprAttrs0);
      if (isExprList || sCtrlFlow) {
        if (W.__design__ && underTemplate_(comp.widget)) {
          gui.forExpr = 0;      // ignore $for
          sCtrlFlow = gui.flowFlag = '';
          exprAttrs0.splice(0); // ignore all $attr
          comp.state.exprAttrs = [];
        }
      }
      
      // scan expr attr list
      var bExpr0 = [], bExpr = [];
      var exprAttrs2 = comp.state.exprAttrs;
      exprDict = gui.exprAttrs = {}; // exprDict = {attr:updateFunc(comp)}
      if (isExprList) {
        exprAttrs0.forEach( function(sKey,idx) {
          var sExpr = comp.props['$'+sKey], isDual = false;
          if (!sExpr && sKey == 'for' && gui.forExpr === 2)
            sExpr = comp.props['$$for'];
          
          if (!sExpr) {
            if (sKey != 'for')  // $for='' is OK
              console.log('warning: invalid dual attribute ($' + sKey + ').');
            return;
          }
          
          if (sKey.indexOf('dual-') == 0) {
            var iPos = exprAttrs2.indexOf(sKey);
            if (iPos >= 0) exprAttrs2.splice(iPos,1);
            
            var dualKey = sKey.slice(5).replace(_hyphenPattern, function(_,chr) {
              return chr.toUpperCase();
            });
            if (!dualKey) return;
            
            isDual = true;
            sKey = dualKey;
          }
          var bothPropExpr = (comp.props[sKey] !== undefined);
          if (bothPropExpr) {
            if (!dHasDual[sKey]) {
              console.log('warning: dual attribute ($' + sKey + ') is confliction.');
              return;
            }
            // else, both dual-setter and :expr defined  // has record to bWaitPass
          }
          if (isDual) exprAttrs2.push(sKey); // dual-aa-bb --> aaBb
          
          if (sKey != 'data') {        // not ($data or $dual-data)
            var iFlag_ = supportedAttr_[sKey];
            if (iFlag_ && iFlag_ != 5 && !bothPropExpr)
              gui.tagAttrs.push(sKey);
          }
          
          bExpr0.push(sKey);
          bExpr.push([sKey,sExpr]);
        });
      }
      
      // assign dual-init value
      var i,item, initDuals0 = gui.initDuals0;
      gui.initDuals0 = [];
      for (i=0; item=initDuals0[i]; i++) {
        comp.state[item[0]] = item[1];  // assign dual-init value
      }
      
      // define dual-attr
      var exprDualSetter = {};
      var dualAttrList = Object.keys(gui.dualAttrs);
      if (bExpr0.length || dualAttrList.length || gui.tagAttrs.length || gui.dataset.length) {
        var iRmvData_ = -1;
        var b = [bExpr0,dualAttrList,gui.tagAttrs,gui.dataset];
        for (var i=0,bAttr; bAttr=b[i]; i++) {
          bAttr.forEach( function(sKey) {
            if (i == 0) { 
              // comp.state[sKey] = undefined;  // '$expr' default is undefined
              // if (dHasDual[sKey]) return;    // only $expr can override-define
              dHasDual[sKey] = true;
              // already record duals0[sKey] when duals.$attr and props.attr both used
            }
            else if (i == 1) {      // dual-xxx
              var redefined = false;
              if (comp.props[sKey] !== undefined)
                redefined = true;
              else if (dHasDual[sKey] && duals0[sKey] !== undefined)
                redefined = true;
              if (redefined) {
                console.log('warning: dual attribute (' + sKey + ') is confliction.');
                return;
              }
              // else, can redefine by: defineDual('attr') and props['dual-attr']
              
              dHasDual[sKey] = true;
              if (sKey != 'data') {  // not 'dual-data'
                var iFlag_ = supportedAttr_[sKey];
                if (iFlag_ && iFlag_ != 5) gui.tagAttrs.push(sKey);
              }
              
              var value_ = duals0[sKey] = comp.props[gui.dualAttrs[sKey]];
              if (duals.hasOwnProperty(sKey)) {
                bWaitPass.push([sKey, value_]);
                return; // setter must defined
              }
              else comp.state[sKey] = value_;
            }
            else {      // tagAttr, dataset
              if (dHasDual[sKey]) {
                if (i == 2 && sKey == 'data') // from gui.tagAttrs, and has duals.data
                  iRmvData_ = gui.tagAttrs.indexOf(sKey);
                return; // if define duals for tagAttr/dataset, you should handover its props init
              }
              
              dHasDual[sKey] = true;
              var value_ = duals0[sKey] = comp.props[sKey];
              if (duals.hasOwnProperty(sKey)) {
                bWaitPass.push([sKey,value_]);
                return; // setter must defined
              }
              else comp.state[sKey] = value_; // same as default dual-setter
            }
            
            var oldDesc = Object.getOwnPropertyDescriptor(duals,sKey);
            if (!oldDesc) {
              var bFn = dualFuncOfGetSet_(comp,sKey);  // no super setter and no custom setter
              Object.defineProperty(duals,sKey, { enumerable:true, configurable:true,
                get:bFn[0], set:bFn[1],
              });
            }
            else { // dual-setter has defined, just reuse oldDesc
              if (i == 0) exprDualSetter[sKey] = true; // result of $expr assign to duals.expr, not state.expr
            }
          });
        }
        if (iRmvData_ >= 0) gui.tagAttrs.splice(iRmvData_,1); // not take props.data as string
      }
      
      var ownerWdgt;
      if (gui.forExpr && (ownerWdgt=comp.widget)) { // if compWdgt.$callspace.forSpace === gui.forExpr means $for in acting
        var exprSpace;
        if (gui.forExpr == 2) {  // is 'rfor'
          ownerWdgt.$callspace = {flowFlag:'ref',forSpace:null};
          ownerWdgt.$callspace['data-rfor.path'] = '';
          exprSpace = ownerWdgt.$callspace.exprSpace = {};
          setupExprSpace(exprSpace,comp);
        }
        
        exprSpace = {};
        var forExpr_ = {flowFlag:'for',exprSpace:exprSpace}; // gui.forExpr (boolean) --> callspace
        var forExprStr = comp.props[gui.forExpr==2?'$$for':'$for'], useForSpace = true;
        if (ownerWdgt.$callspace) {
          if (forExprStr)
            ownerWdgt.$callspace.forSpace = gui.forExpr = forExpr_;
          else {
            delete gui.forExpr;
            useForSpace = false;
          }
        }
        else {
          ownerWdgt.$callspace = forExpr_;
          if (!forExprStr) {
            delete gui.forExpr;
            forExpr_.flowFlag = 'for0';    // flowFlag: ref for for0
          }
          else gui.forExpr = forExpr_;
        }
        if (useForSpace) setupExprSpace(exprSpace,comp,!forExprStr);
        
        // if !gui.forExpr: 'for' must not in bExpr0 and bExpr
        if (gui.forExpr) {
          var comps_ = gui.comps2 = gui.comps; // backup for dynamic setup
          var exprKeys_ = gui.exprKeys = [];
          var exprChild_ = gui.exprChild = [];
          for (var i=comps_.length-1; i >= 0; i -= 1) {
            var child = comps_[i];
            if (child) {
              if (hasClass_(child.props.className,'rewgt-static')) {
                exprKeys_.unshift(null);
                exprChild_.unshift(null);
                continue;
              }
              
              var sKeyExpr = child.props['$key'], fn = null;
              if (sKeyExpr && typeof sKeyExpr == 'string') {
                fn = getKeyChildExprAst_(comp,sKeyExpr,'key');
                if (!fn)
                  console.log("error: invalid '$key' expression: " + sKeyExpr);
              }
              else console.log("error: no '$key' defined for child element in '$for' loop.");
              if (fn) {
                exprKeys_.unshift(fn);
                
                var sChildExpr = child.props['$children'], fn2 = null;
                if (sChildExpr && typeof sChildExpr == 'string') {
                  fn2 = getKeyChildExprAst_(comp,sChildExpr,'children');
                  if (!fn2)
                    console.log("error: invalid '$children' expression: " + sChildExpr);
                }
                exprChild_.unshift(fn2);
                
                continue;  // avoid call comps_.splice(i,1);
              }
            }
            comps_.splice(i,1);
          }
          
          gui.comps = []; gui.compIdx = {}; // no need save compIdx, since it would be adjusted
        }
      }
      
      if (bExpr.length) {
        gui.flowExprId0 = 0;
        gui.flowExprId  = 1;     // means wait to update
        
        bExpr.forEach( function(item) {
          var sKey = item[0];
          var b = renewFuncOfExpr_(comp,sKey,item[1],exprDualSetter[sKey]);  // item[1] is sExpr
          var fn = b[0], headId = b[1];
          if (!fn)
            console.log('warning: compile expression ($' + sKey + ') failed.');
          else {
            if (headId != 'any') {
              var delayExpr = gui.syncExpr;
              if (!delayExpr) delayExpr = gui.syncExpr = [];
              gui.syncExpr.push([sKey,fn]); // regist in didMount, avoid calling in first render
            }
            else exprDict[sKey] = fn;  // add to $gui.exprAttrs, includes: $for $if $elif
            
            if (sKey.indexOf('data-') == 0 || sKey.indexOf('aria-') == 0)
              gui.dataset2.push(sKey); // add data-* aria-* to node.dataset
          }
        });
      }
      
      var passLen = bWaitPass.length;
      gui.initDuals.forEach( function(item2) {
        var sKey = item2[0], iPos = bWaitPass.findIndex( function(a) {return a[0] === sKey} );
        if (iPos >= 0 && iPos < passLen) {
          bWaitPass.splice(iPos,1); // overwrite initial props-assign
          passLen -= 1;
        }
        bWaitPass.push(item2);
      });
      gui.initDuals = [];
      
      while (item = bWaitPass.shift()) {
        duals[item[0]] = item[1];   // assign by setter
      }
    }
    else {  // not first render
      exprDict = gui.exprAttrs;
      
      var duaItem;
      while (duaItem = duals2.shift()) {
        duals[duaItem[0]] = duaItem[1]; // do this.duals.xxx = value before props re-assign
      }
    }
    
    var exprAttrs2 = comp.state.exprAttrs, bConns = [];
    if (exprAttrs2.length) {
      var item, iPos = exprAttrs2.indexOf('data');
      if (iPos >= 0) {
        item = exprAttrs2[iPos];
        exprAttrs2.splice(iPos,1);
        assignOneDual(bConns,item);
        exprAttrs2 = comp.state.exprAttrs; // 'duals.data = xx' maybe change state.exprAttrs
      }
      
      while (item = exprAttrs2.shift()) {
        assignOneDual(bConns,item);
      }
    }
    
    if (sCtrlFlow || gui.forExpr) {
      var ownerWdgt, hasCond = false, ctrlValue = true;
      if (sCtrlFlow) {
        ctrlValue = comp.state[sCtrlFlow];
        if (sCtrlFlow == 'if' || sCtrlFlow == 'elif') { // will auto update nearby $elif $else, except when target not ready yet
          hasCond = true;
          comp.hideThis = !ctrlValue;
        }
        else if (sCtrlFlow == 'else') {
          if (firstRender) {   // ensure comp.state['else'] is correct, maybe not updated by previous $if $elif since this node ready yet
            gui.flowExprId0 = gui.flowExprId = flowExprIndex_; // assign first to avoid recursion
            ctrlValue = comp.state['else'] = !anyPrevIfTrue2(comp);   // check by none-eval
          }
          hasCond = true;
          comp.hideThis = !ctrlValue;
        }
      }
      
      if (gui.forExpr && (ownerWdgt = comp.widget)) {  // has '$for' expression
        // set items to callspace
        ctrlValue = comp.state['for'];
        if (!Array.isArray(ctrlValue) || ctrlValue.length == 0)
          ctrlValue = [];
        gui.forExpr['data-for.path'] = ctrlValue;
        
        // setup gui.comps and gui.compIdx
        var newCompIdx = {}, newComps = [], comps_ = gui.comps2;
        var exprKeys_ = gui.exprKeys, exprChild_ = gui.exprChild;
        var currNode, hasStatic = false, childInline = comp.props['childInline.'];
        ctrlValue.forEach( function(item,idx) {
          for (var i=0,child; child=comps_[i]; i+=1) {
            var fn = exprKeys_[i];
            if (!fn) {
              hasStatic = true;  // rewgt-static
              var ele, keyid = 'static-' + idx, dProp = Object.assign({},child.props);
              dProp['keyid.'] = keyid; dProp.key = keyid; // no 'hookTo.' for static node
              // if div.rewgt-static --> span.rewgt-static
              newCompIdx[keyid] = newComps.push(reactCreate_(childInline?'span':'div',dProp)) - 1;
            }
            else {
              var childInline2 = child.props['childInline.'];
              if (childInline2 !== undefined) { // not pure react element (such as: <div>)
                if (childInline) {
                  if (!childInline2) continue;  // invalid element
                }
                else { // if not childInline, only support rewget-static/rewgt-panel/rewgt-unit
                  if (!hasClass_(child.props.className, ['rewgt-panel', 'rewgt-unit'])) continue;
                }
              }
              if (child.props['isReference.']) continue; // not support RefXXX under $for
              
              var fn2 = exprChild_[i], forChild = null;
              if (fn2) {
                try {
                  forChild = fn2(comp,idx);
                  if (!forChild)
                    forChild = null;
                  else if (!React.isValidElement(forChild) && !Array.isArray(forChild) && typeof forChild != 'string')
                    forChild = null;
                }
                catch(e) { // failed, forChild must be null
                  console.log("error: caculate '$children' (" + (i+1) + ' of ' + comps_.length + ') failed.');
                  console.log(e);
                }
              }
              
              var keyid, succ = false;
              try {
                keyid = fn(comp,idx);
                if (typeof keyid != 'number') keyid = keyid + '';
                succ = true;
              }
              catch(e) {
                console.log("error: caculate '$key' (" + (i+1) + ' of ' + comps_.length + ') failed.');
                console.log(e);
              }
              
              if (succ) {
                var childEle, childProp = {'hookTo.':ownerWdgt,'keyid.':keyid,key:keyid+'','for.index':idx};
                if (forChild) { // forChild can be: Element, bElementList, sTextString
                  if (React.isValidElement(forChild) || typeof forChild == 'string')
                    childEle = reactClone_(child,childProp,forChild);
                  else          // forChild must be Array
                    childEle = reactClone_.apply(null,([child,childProp]).concat(forChild));
                }
                else childEle = reactClone_(child,childProp);
                newCompIdx[keyid] = newComps.push(childEle) - 1;
              }
              // else, just ignore
            }
          }
        });
        
        if (hasStatic) {
          setTimeout( function() {
            renewStaticChild(comp,true);
          },0);  // renew static node after didMount
        }
        
        if (gui.comps.length != 0 || newComps.length != 0)
          gui.removeNum += 1;  // will fire duals.childNumId
        gui.compIdx = newCompIdx; gui.comps = newComps;
      }
    }
    
    if (bConns.length && gui.compState >= 2) {
      setTimeout( function() {
        bConns.forEach( function(item) {
          triggerConnTo_(item[0],item[1],item[2],item[3]); // triggerConnTo_(bConn,value,oldValue,sKey)
        });
      },0);
    }
    
    if (firstRender && W.__debug__ && typeof comp.setup__ == 'function') {
      try {
        comp.setup__();
      }
      catch(e) { console.log(e); }
    }
    
    if (gui.id__ === comp.state.id__) {
      if (gui.id2__ == 0) // not fired by duals.id__ = xx
        duals.id__ = identicalId_ !== comp.state.id__? identicalId_: identicalId();
      // else, in duals.id__ assigning // ignore
    }
    else {
      var iTmp = comp.state.id__;
      comp.state.id__ = iTmp - 1; // iTmp-1 >= 3 because identicalId() >= 4, force make different
      duals.id__ = iTmp;          // setter of duals.id__ must run since state.id__ changed
    }
    gui.id2__ = 0; // id2__ != 0 means in id__ changing
    
    if (gui.isChildExpr && gui.children2 !== comp.props.children) {
      gui.removeNum += gui.comps.length;    // wait to rescan in duals.childNumId
      gui.children2 = comp.props.children;
      gui.comps = children2Arr_(comp.props.children);
    }
    duals.childNumId = gui.comps.length + (gui.removeNum << 16);
  }
  catch(e) {
    console.log(e);
  }
  
  gui.inSync = false;
  return ret; // if return true means comp.state.xxx is changed
  
  function assignOneDual(bConns,item) {
    var fn = exprDict[item];
    if (!fn) return;
    try {
      var bConn = gui.connectTo[item];
      if (bConn) {    // this action is listened
        var oldValue = comp.state[item];
        fn(comp);     // try update with expression
        var newValue = comp.state[item];
        if (newValue !== oldValue) // succ update expression and get a new value
          bConns.push([bConn,newValue,oldValue,item]); // wait to fire listen-function
      }
      else fn(comp);
    }
    catch(e) { console.log(e); }
  }
  
  function underTemplate_(wdgt) {
    var comp = wdgt && wdgt.component;
    if (comp) {
      if (comp.props['isTemplate.'])
        return true;
      else return underTemplate_(wdgt.parent);
    }
    else return false;
  }
}
utils.syncProps = syncProps_;

// utils.popWin
//----------

function getPopFrameOpt_(obj,popOption) {
  var frameEle = null, dFrame = popOption.frame || {}, framePath = dFrame.path;
  if (framePath) {
    frameEle = obj.componentOf(framePath);
    frameEle = frameEle && frameEle.fullClone();
    if (!frameEle) {
      if (!W.__design__)
        delete popOption.frame;  // next time use default frame
      console.log('warning: can not locate popup frame (' + framePath + ').');
    }
  }
  return frameEle || null;
}

utils.popWin = {
  showWindow: function(ele,popOption,callback,optComp) {  // callback is called only when window success showing
    if (W.__design__ && (inFirstLoading_ || inReactReloading_)) {
      if (callback) callback();
      return;
    }
    
    var popWin = topmostWidget_ && topmostWidget_['$pop'];
    var popObj = popWin && popWin.component;
    if (!popObj || !ele) return;  // fatal error
    
    if (!hasClass_(ele.props.className,['rewgt-panel','rewgt-unit'])) {
      utils.instantShow('error: only panel, div, paragraph can use as popup window.');
      return;
    }
    
    var popFrame = popOption.frameElement || null;
    if (!popFrame && optComp)
      popFrame = getPopFrameOpt_(optComp,popOption);
    var oldChecked = undefined;
    if (optComp && optComp.props['isOption.'] && optComp.state.hasOwnProperty('data-checked'))
      oldChecked = optComp.state['data-checked'];
    
    // ele should come from template or compObj.fullClone()
    popObj.setChild(reactCreate_(MaskPanel__,{popOption:popOption, popFrame:popFrame},ele), function() {
      if (W.__design__) {
        if (containNode_ && containNode_.setDesignModal)
          containNode_.setDesignModal(true);
        if (oldChecked !== undefined && optComp) {
          setTimeout( function() {
            optComp.state['data-checked'] = oldChecked; // not leave data-checked=1
          },300);
        }
      }
      if (callback) callback();
    });
  },
  
  listWindow: function() {
    var popWin = topmostWidget_ && topmostWidget_['$pop'];
    var popObj = popWin && popWin.component;
    if (!popObj) return [];
    
    var bRet = [], comps = popObj.$gui.comps;
    comps.forEach( function(item) {
      if (!item) return;
      var sKey = getElementKey_(item);
      if (sKey) {
        var iTmp = parseInt(sKey);
        if ((iTmp+'') === sKey) sKey = iTmp;  // key --> keyid
        bRet.push([sKey,item.props.popOption]);
      }
    });
    return bRet;
  },
  
  closeAll: function(callback) { // force close all poped window
    function doCallback() {
      if (callback) callback();
    }
    
    var popWin = topmostWidget_ && topmostWidget_['$pop'];
    var popObj = popWin && popWin.component;
    if (!popObj) return doCallback();
    
    var bArgs = [], comps = popObj.$gui.comps, idx = comps.length - 1;
    popObj.$gui.comps.forEach( function(ele) {
      if (ele) {
        var sKey = getElementKey_(ele);
        if (sKey)
          bArgs.unshift('-' + sKey);
      }
    });
    
    if (bArgs.length) {
      bArgs.push(doCallback);
      popObj.setChild.apply(popObj,bArgs);
    }
    else return doCallback();
  },
  
  popWindow: function(retData) {
    var popWin = topmostWidget_ && topmostWidget_['$pop'];
    var popObj = popWin && popWin.component;
    if (!popObj) return;
    
    var targObj = null, comps = popObj.$gui.comps, idx = comps.length - 1;
    while (idx >= 0) {
      var item = comps[idx], sKey = item && getElementKey_(item);
      if (sKey) {
        item = popWin[sKey];
        if (item) {
          targObj = item.component;
          if (targObj) break;
        }
      }
      idx -= 1;
    }
    if (!targObj) return;
    
    var optPath = targObj.props.optPath || '';
    var keyid = targObj.$gui.keyid, opt_ = targObj.state.popOption;
    if (arguments.length == 0) { // try use beforeClose() get return data
      var fn = opt_ && opt_.beforeClose;
      if (typeof fn == 'function')
        retData = fn();
    }
    
    var callback = opt_ && opt_.callback;
    popObj.setChild('-'+keyid, function() {
      if (typeof callback == 'function')
        callback(retData);
    });
  },
};

// schema, dump / load react tree
//-------------------------------
function getCompRenewProp_(oneObj) {
  var template = oneObj._;
  if (!template) return null;
  
  var bStated = template._statedProp || [];
  var bSilent = template._silentProp || [];
  var hasHtmlTxt = template._htmlText;
  var props = Object.assign({},oneObj.props);
  
  bStated.forEach( function(item) {
    if (props.hasOwnProperty(item))
      props[item] = oneObj.state[item];
  });
  bSilent.forEach( function(item) {
    delete props[item];
  });
  
  if (hasHtmlTxt) {
    var sHtml = oneObj.state['html.'];
    if (!sHtml || typeof sHtml != 'string')
      delete props['html.'];
    else props['html.'] = sHtml;
  }
  else delete props['html.'];
  
  delete props['data-unit.path'];
  delete props['data-span.path'];
  delete props.children;
  
  return props;
}
creator.getCompRenewProp = getCompRenewProp_;

function deepCloneReactEle_(srcEle,dProp,compWdgt,compObj) { // compObj must not a linker
  // return reactClone_(srcEle,dProp);  // can not directly clone
  
  var gui = compObj.$gui, hasFor = !!gui.forExpr;
  var bComp = hasFor?gui.comps2:gui.comps, bArgs = [];
  var childInline = compObj.props['childInline.'];
  
  bComp.forEach( function(child) {
    if (!child) return;
    if (hasFor || child.props['isReference.']) {  // add unlinked-linker
      bArgs.push(child);
      return;
    }
    
    if (hasClass_(child.props.className,'rewgt-static')) {
      var props = Object.assign({},child.props);  // no subObj.props
      delete props['keyid.']; delete props.key;
      delete props.onMouseDown;
      delete props.onDoubleClick;
      
      // try clone static node
      var idx, sName = props.name;
      if (typeof (idx=parseInt(sName)) == 'number' && idx >= 0x100000) {  // local --> global
        var bList = compObj.$gui.statics;
        bList = bList && bList[sName];
        
        if (Array.isArray(bList)) {
          var bNew = bList.map( function(item) { return item.cloneNode(true); } );
          idx = W.$staticNodes.push(bNew) - 1;  // take gui.removeNum == 0
          props.name = idx + '';
        }
      }
      // else, reuse W.$staticNodes[idx]; // no change
      
      bArgs.push(reactCreate_(childInline?'span':'div',props));
      return;
    }
    
    var sKey = getElementKey_(child);
    var subWdgt = sKey && compWdgt[sKey], subObj = subWdgt && subWdgt.component;
    if (!subObj) return;  // invalid component
    
    if (subObj.props['isTemplate.'] && !W.__design__) {
      var tempObj = subObj.$gui.template;
      if (tempObj instanceof templateNode)
        return reactClone_(child,{template:tempObj},null);
      else return; // invalid template
    }
    
    var props = getCompRenewProp_(subObj);
    if (props)
      bArgs.push(deepCloneReactEle_(child,props,subWdgt,subObj));  // subObj must not linker
    // else, ignore: linked linker, invalid subObj._
  });
  
  if (bArgs.length == 0)
    return reactClone_(srcEle,dProp,null);
  else {
    bArgs.unshift(dProp);
    bArgs.unshift(srcEle);
    return reactClone_.apply(null,bArgs);
  }
}
creator.deepCloneReactEle = deepCloneReactEle_;

function quickCheckEqual_(a,b) {
  var iLen;
  if (Array.isArray(a)) {
    if (Array.isArray(b) && (iLen=a.length) == b.length) {
      for (var i=0; i < iLen; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    else return false;
  }
  else if (a && typeof a == 'object') {
    if (b && typeof b == 'object') {
      var bListA = Object.keys(a);
      var bListB = Object.keys(b);
      if ((iLen=bListA.length) != bListB.length) return false;
      for (var i=0; i < iLen; i++) {
        var item = bListA[i];
        if (a[item] !== b[item]) return false;
      }
      return true;
    }
    else return false;
  }
  else return a === b;
}

function dumpReactTree_(bRet,wdgt,sPath) { // for topmost, bRet[0] is result
  if (!wdgt) {
    wdgt = topmostWidget_;
    if (!wdgt) return;
    sPath = '';
  }
  
  var compObj = wdgt.component, isTopmost = wdgt === topmostWidget_;
  sPath += '.' + (compObj? compObj.$gui.keyid: 'undefined');
  if (!compObj) {
    console.log('warning: widget (' + sPath + ') is null.');
    return;
  }
  
  // step 1: find className, props
  var dProp = {}, iFlag = 0; // 0:panel, 1:unit(div), 2:paragraph, 3:span
  var objState = compObj.state, objGui = compObj.$gui;
  var sClsName, sLink = objState['data-unit.path'];
  if (sLink !== undefined) {
    sClsName = 'RefDiv';
    iFlag = 2;
  }
  else {
    sLink = objState['data-span.path'];
    if (sLink !== undefined) {
      sClsName = 'RefSpan';
      iFlag = 3;
    }
  }
  
  if (sLink !== undefined) {  // is linker
    var oldProp = sLink? compObj.props['link.props']: null;
    if (oldProp) { // has linked
      Object.assign(dProp,oldProp);
      
      if (!compObj._._htmlText)
        delete dProp['html.'];
      
      var sKey = dProp['keyid.'];
      delete dProp['keyid.'];
      delete dProp.key;
      if (typeof sKey == 'string') {
        if (sKey[0] == '$') {
          sKey = sKey.slice(1);
          if (sKey !== (parseInt(sKey)+''))
            dProp.key = sKey;
          // else, is number, dProp.key removed
        }
        else dProp.key = sKey; // save 'key', not 'keyid.'
      }
      // else, not string, dProp.key removed
      
      var shadowTemp = getWidgetTempInfo(compObj._);
      var bStated = shadowTemp[1], bSilent = shadowTemp[2];
      bStated.forEach( function(item) {
        if (dProp.hasOwnProperty(item))  // only fetch back items that in 'link.props'
          dProp[item] = objState[item];
      });
      bSilent.forEach( function(item) {
        delete dProp[item];
      });
      
      Object.keys(dProp).forEach( function(item) {
        if (dProp[item] === undefined)
          delete dProp[item];  // remove all 'undefined' value
      });
      
      if (dProp.style && Object.keys(dProp.style).length == 0)
        delete dProp.style;
      
      dProp['$'] = sLink;
      bRet.push([sClsName,dProp,iFlag]);
    }
    // else, system error, unknown format
  }
  else if (compObj.props['isReference.'])
    ;   // ignore unlinked RefDiv/RefSpan
  else {
    var keyid = objGui.keyid;
    var sKey = (typeof keyid == 'string')? keyid: '';  // if keyid is number, sKey = ''
    var shadowTemp = getWidgetTempInfo(compObj._);
    var bStated = shadowTemp[1], bSilent = shadowTemp[2], dDefault = shadowTemp[3];
    var hasHtmlTxt = shadowTemp[4], bDefault = Object.keys(dDefault);
    sClsName = shadowTemp[0];
    
    if (compObj.props['childInline.']) {
      if (hasClass_(compObj.props.className,'rewgt-unit'))
        iFlag = 2;
      else iFlag = 3;
    }
    else {
      if (hasClass_(compObj.props.className,'rewgt-unit'))
        iFlag = 1;
      // else iFlag = 0;
    }
    
    Object.assign(dProp,compObj.props);
    bStated.forEach( function(item) {  // NOT take data-* aria-* as stated props
      // if (dProp.hasOwnProperty(item)) // maybe last time prop.xx is default
      dProp[item] = objState[item];
    });
    bSilent.forEach( function(item) {
      delete dProp[item];
    });
    bDefault.forEach( function(sAttr) {
      var value = dDefault[sAttr];
      if (value === undefined) {       // 'undefined' match any of none-number
        if (typeof dProp[sAttr] != 'number')
          delete dProp[sAttr];
      }
      else if (quickCheckEqual_(value,dProp[sAttr]))
        delete dProp[sAttr];
    });
    
    delete dProp.children;
    delete dProp['hasStatic.'];        // can restore by analyse
    
    Object.keys(dProp).forEach( function(item) {  // includes 'isPre.'
      var value = dProp[item];
      if (value === undefined)
        delete dProp[item];            // remove all 'undefined' value
      else if (typeof value == 'function') {
        delete dProp[item];
        if (!isUnderLinker(compObj.widget))
          console.log('warning: can not dump function property (' + item + ')');
      }
    });
    delete dProp.key;
    if (sKey) dProp.key = sKey;
    if (isTopmost) {
      delete dProp.left;
      delete dProp.top;
    }
    if (dProp.style && Object.keys(dProp.style).length == 0)
      delete dProp.style;
    
    // step 2: scan children
    var bSubRet = [];
    if (!compObj.props['noSaveChild.'] && sLink === undefined) {
      var hasFor = !!objGui.forExpr, compNode = null;
      var bComp = hasFor?objGui.comps2:objGui.comps;
      bComp.forEach( function(child) {
        if (!child) return;
        if (hasFor) {
          scanOneLevelEle(bSubRet,child,iFlag);
          return;
        }
        
        var sKey = getElementKey_(child);
        if (!sKey) return;
        
        if (isTopmost && sKey[0] == '$') {
          if (sKey == '$pop') return; // ignore popup window widget
          if (sKey[1] == '$' && child.props['isTemplate.']) return; // ignore .body.$$template
        }
        
        var child_ = wdgt[sKey];
        if (child_)
          dumpReactTree_(bSubRet,child_,sPath);
        else {
          if (hasClass_(child.props.className,'rewgt-static')) {
            if (!compNode)
              compNode = findDomNode_(compObj);
            var sName = child.props.name, bHtml = [];
            if (compNode && sName) {
              var node = compNode.querySelector('.rewgt-static[name="' + sName + '"]');
              if (node) {
                for (var i=0,subItem; subItem = node.children[i]; i+=1) {
                  bHtml.push(subItem.outerHTML);
                }
              }
            }
            if (bHtml.length)
              bSubRet.push(['',{'html':bHtml},iFlag]); // iFlag is owner's flag // sTempName is '', means it is static text
          }
          // else, unknown format, ignore
        }
      });
    }
    
    if (hasHtmlTxt) {
      if (bSubRet.length)
        delete dProp['html.'];
      else {
        var sHtml = compObj.state['html.'];
        if (!sHtml || typeof sHtml != 'string')
          delete dProp['html.'];
        else dProp['html.'] = sHtml;
      }
    }
    else delete dProp['html.'];
    
    var bWgtInfo = [sClsName,dProp,iFlag];
    if (bSubRet.length) {
      bSubRet.unshift(bWgtInfo);
      bRet.push(bSubRet);
    }
    else bRet.push(bWgtInfo);  // no child: typeof item[0] == 'string'
  }
  
  function getWidgetTempInfo(t) {
    return [t._className,t._statedProp || [],t._silentProp || [],t._defaultProp || {}, t._htmlText];
  }
  
  function isUnderLinker(wdgt) {
    if (!wdgt) return false;
    
    var comp = wdgt.component;
    if (comp && (comp.props['data-unit.path'] || comp.props['data-span.path']))
      return true;
    else return isUnderLinker(wdgt.parent);
  }
  
  function scanOneLevelEle(bRet,ele,iFlag) {
    if (hasClass_(ele.props.className,'rewgt-static')) {
      var sName = ele.props.name, idx = parseInt(sName);
      if (typeof idx == 'number' && idx < 0x100000) {  // from global
        var bList = W.$staticNodes[idx];
        if (Array.isArray(bList)) {
          var bHtml = [];
          for (var i2=0,item2; item2 = bList[i2]; i2++) {
            bHtml.push(item2.outerHTML);
          }
          if (bHtml.length)
            bRet.push(['',{'html':bHtml},iFlag]); // iFlag is owner's flag
        }
      }
    }
    else {
      var eleType = ele.type, evSet = eleType && eleType.prototype.$eventset;
      if (evSet) {
        var clsName = evSet[2], dProp = Object.assign({},ele.props);
        var bChild = dProp.children;
        delete dProp.children;
        
        // dProp includes default props, but no 'keyid.' 'hookTo.'
        var subFlag = 0;
        if (dProp['childInline.']) {
          if (hasClass_(dProp.className,'rewgt-unit'))
            subFlag = 2;
          else subFlag = 3;
        }
        else {
          if (hasClass_(dProp.className,'rewgt-unit'))
            subFlag = 1;
          // else subFlag = 0;
        }
        Object.keys(dProp).forEach( function(sKey) {
          if (sKey.slice(-1) == '.')
            delete dProp[sKey];
        });
        
        var bSubRet = [];
        if (bChild) {
          if (!Array.isArray(bChild)) bChild = [bChild];
          bChild.forEach( function(child) {
            if (!child) return;
            scanOneLevelEle(bSubRet,child,subFlag);
          });
        }
        
        var bInfo = [clsName,dProp,subFlag];
        if (bSubRet.length) {
          bSubRet.unshift(bInfo);
          bRet.push(bSubRet);
        }
        else bRet.push(bInfo);
      }
    }
  }
}

var lastDesignTask_ = null;
var lastDesignTaskId_ = 0;

function popDesigner_(comp,sWhich,toolOpt,baseUrl) {
  if (!containNode_ || !sWhich) return false;
  if (!containNode_.showDesignDlg) return false;
  
  var compObj = comp;
  if (typeof comp == 'string') {
    compObj = W.W(comp);
    compObj = compObj && compObj.component;
    if (!compObj || !compObj.props) return false;
  }
  if (!compObj) return false;
  
  if (!toolOpt) {
    var opt = compObj._._getGroupOpt(compObj), bList = opt.tools || [];
    toolOpt = bList.find( function(item) {  // item:{name,title,icon,url,halfScreen,noMove,clickable,get,set,left,top,width,height}
      return item.name === sWhich;
    });
    if (!toolOpt || !toolOpt.get || !toolOpt.set) return false;
    
    toolOpt = Object.assign({},toolOpt);    // avoid modify opt.tools
    if (!baseUrl) baseUrl = opt.baseUrl || '';
  }
  
  // compObj can be HTMLElement or react component
  var inValue = toolOpt.get(compObj); // inValue should be null or json-able data
  if (inValue === null) return false;
  
  lastDesignTaskId_ += 1;
  lastDesignTask_ = [lastDesignTaskId_,compObj,toolOpt]; // compObj maybe changed to node
  containNode_.showDesignDlg(lastDesignTaskId_,toolOpt,inValue,baseUrl);
  return true;
}

function saveDesigner_(beClose,taskId,outValue) {
  if (lastDesignTask_ && lastDesignTask_[0] == taskId) {
    var compObj = lastDesignTask_[1], toolOpt = lastDesignTask_[2];
    if (beClose) lastDesignTask_ = null;
    toolOpt.set(compObj,outValue,beClose);
  }
}

function staticMouseDown(event) {
  event.preventDefault();  // avoid double click selecting
}
creator.staticMouseDown = staticMouseDown;

function staticDbClick(event) {
  if (!containNode_) return;
  var wdgt = this.widget;  // 'this' should be owner component
  var sPath = wdgt && wdgt.getPath();
  if (!sPath) return;
  var tillNode = findDomNode_(this);
  if (!tillNode) return;
  
  var sName = '', staticNode = event.target;
  while (staticNode) {
    if (staticNode === tillNode) break;
    if (staticNode.classList.contains('rewgt-static')) {
      if (!staticNode.getAttribute('data-marked'))  // avoid design editing 
        sName = staticNode.getAttribute('name');    // static-node id
      break;
    }
    staticNode = staticNode.parentNode;
  }
  if (!sName) return;
  
  event.stopPropagation();
  event.preventDefault();
  
  popDesigner_(staticNode,'default', {
    name: 'default',
    title: 'edit content',
    url: creator.appBase() + '/edit_static.html', halfScreen: true,
    // icon: '', noMove: false,
    // left: 0.05, top: 0.05,
    width: 0.96,
    height: 0.9,
    clickable: false,
    
    get: function(node) {
      return [node.innerHTML,sPath,sName];
    },
    
    set: function(node,outValue,beClose) {
      var sHtml = outValue[0] || '', sPath = outValue[1], sName = outValue[2];
      if (!sPath || !sName) return; // ignore
      
      var compObj = W.W(sPath);
      compObj = compObj && compObj.component;
      if (!compObj) return;
      
      var compNode = findDomNode_(compObj), staticNode = null;
      if (compNode) staticNode = compNode.querySelector('.rewgt-static[name="' + sName + '"]');
      if (staticNode === node) {  // static node still available
        staticNode.innerHTML = sHtml;
        
        // save to W.$staticNodes
        var idx = parseInt(sName);
        if (typeof idx == 'number') {
          var gui = compObj.$gui, dStatic = gui.statics, bList = [];
          if (!dStatic) dStatic = gui.statics = {};
          for (var i=0,item; item=staticNode.children[i]; i+=1) {
            bList.push(item);
          }
          
          if (idx >= 0x100000)
            dStatic[sName] = bList;
          else {  // global --> local
            var iLen = gui.comps.length, newName = (0x100000 + gui.removeNum + iLen) + '';
            for (var i=0; i < iLen; i++) {
              var child = gui.comps[i];
              if (child && hasClass_(child.props.className,'rewgt-static') && child.props.name === sName) {
                gui.comps[i] = reactClone_(child,{name:newName}); // for dumpReactTree
                break;
              }
            }
            
            dStatic[newName] = bList;
            staticNode.setAttribute('name',newName);
          }
        }
        
        // notify backup current doc
        if (W.__design__) {
          if (containNode_.notifyBackup)
            containNode_.notifyBackup(''); // wdgtPath = '' means not refresh selected prop-editor
        }
      }
    },
  },'');
}
creator.staticDbClick = staticDbClick;

function loadReactTreeEx_(bRet,bTree,bStatic,dTempSet,sPrefix) {
  var iTagType = 0;  // 0:WTC 1:tag 2:ReactClass 3:ReactElement
  
  function getTemplate(sName,sPrefix) {
    var tp = typeof sName;
    if (tp != 'string') {
      if (React.isValidElement(sName)) {
        iTagType = 3;
        return sName;   // sName is ReactElement
      }
      else if (tp == 'function') {
        iTagType = 2;
        return sName;
      }
      else return null; // error
    }
    
    var temp, shadowCls = sPrefix? W.$main[sPrefix]: null;
    if (!shadowCls) {   // if has shadowCls, not use cached template
      temp = dTempSet[sName];
      if (temp || temp === null) {
        iTagType = 0;
        return temp;
      }
    }
    
    var ch, b = sName.split('.'), sAttr = b.shift();
    if (b.length == 0 && ((ch=sAttr[0]) < 'A' || ch > 'Z')) {
      iTagType = 1;
      return sAttr;     // createClass_(sAttr); // such as: ['div',{}]
    }
    else iTagType = 0;
    
    temp = T[sAttr];
    while (temp && (sAttr = b.shift())) {
      temp = temp[sAttr];
    }
    if (!temp || !temp._extend)
      dTempSet[sName] = temp = null;  // set null, no try next time
    else {
      if (shadowCls)
        temp = createClass_(temp._extend(shadowCls));
      else dTempSet[sName] = temp = createClass_(temp._extend());
    }
    return temp;
  }
  
  function createSysEle(bRet,bChild,iFrom) {
    var iLen = bChild.length;
    for (var i=iFrom; i < iLen; i++) {
      var item = bChild[i];
      if (!item) continue;
      
      var tp = typeof item;
      if (tp == 'string') {
        bRet.push(item);  // react take it as text node
        continue;
      }
      else if (React.isValidElement(item)) {
        bRet.push(item);
        continue;
      }
      else if (tp == 'function') {
        bRet.push(reactCreate_(item));
        continue;
      }
      
      if (Array.isArray(item) && item.length >= 1) {
        var sName,dProp, firstItem = item[0], iChildNum = 0, isNoneProp = false;
        if (Array.isArray(firstItem)) {
          iChildNum = item.length - 1;
          sName = firstItem[0];
          dProp = firstItem[1];
        }
        else {
          // iChildNum = 0;
          sName = firstItem;
          dProp = item[1];
        }
        if (!dProp) {
          isNoneProp = true;
          dProp = {};
        }
        
        var isEle = false, tp2 = typeof sName;
        if (tp2 == 'string') {
          var ch = sName[0];
          if ((ch >= 'A' && ch <= 'Z') || sName.indexOf('.') >= 0) {
            console.log('warning: unknown react class (' + sName + ')');
            continue;
          }
        }
        else if (React.isValidElement(sName))
          isEle = true;
        else if (tp2 != 'function') {
          console.log('warning: unknown react class');
          continue;
        }
        
        // sName can be React Class, or sTag
        if (iChildNum) {
          var bRet_ = [];
          createSysEle(bRet_,item,1);
          if (isEle)
            bRet.push(reactClone_(sName,dProp,bRet_));
          else bRet.push(reactCreate_(sName,dProp,bRet_));
        }
        else {
          if (isEle)
            bRet.push(isNoneProp? sName: reactClone_(sName,dProp));
          else bRet.push(reactCreate_(sName,dProp));
        }
      }
    }
  }
  
  var sName,dProp, firstItem = bTree[0], iChildNum = 0, isNoneProp = false;
  if (Array.isArray(firstItem)) {
    iChildNum = bTree.length - 1;
    sName = firstItem[0];
    dProp = firstItem[1];
  }
  else {
    // iChildNum = 0;
    sName = firstItem;
    dProp = bTree[1];
  }
  if (!dProp) {
    isNoneProp = true;
    dProp = {};
  }
  
  if (!sName) {
    var bHtml = dProp.html || [];
    if (bHtml.length > 0) {
      var node = document.createElement('div');
      node.innerHTML = bHtml.join('');
      
      var bList = [], idx = bStatic.push(bList) - 1;
      for (var i=0,item; item=node.children[i]; i+=1) {
        bList.push(item);
      }
      bRet.push(reactCreate_('div',{ className:'rewgt-static',name:idx+''}));
      return true;  // true means has static text
    }
    return false;
  }
  
  var sPrefix_ = '';
  if (sPrefix && dProp.key)
    sPrefix_ = sPrefix + '.' + dProp.key;
  
  var lnkTemp = (sName === 'RefDiv' || sName === 'RefSpan')? sName: '';
  if (lnkTemp) {
    bRet.push(reactCreate_(getTemplate(lnkTemp,sPrefix_),dProp));
    return false;
  }
  
  var objTemp = getTemplate(sName,sPrefix_);
  if (!objTemp) {
    var nameDesc = typeof sName == 'string'? ' (' + sName + ')': '';
    console.log('warning: can not find template' + nameDesc);
    return false;
  }
  
  if (iTagType > 0) {  // objTemp is sTag, or ReactClass, or ReactElement
    if (iChildNum > 0) {
      var bRet_ = [];
      createSysEle(bRet_,bTree,1);
      if (iTagType == 3)
        bRet.push(reactClone_(objTemp,dProp,bRet));
      else bRet.push(reactCreate_(objTemp,dProp,bRet_));
    }
    else {
      if (iTagType == 3)
        bRet.push(isNoneProp? objTemp: reactClone_(objTemp,dProp));
      else bRet.push(reactCreate_(objTemp,dProp));
    }
  }
  else {
    var bArgs = [objTemp,dProp];
    if (iChildNum > 0) {
      var tp, hasStatic = false;
      for (var i=1,item; item=bTree[i]; i+=1) {
        if (Array.isArray(item)) {
          if (loadReactTreeEx_(bArgs,item,bStatic,dTempSet,sPrefix_))
            hasStatic = true;
        }
        else if (React.isValidElement(item))
          bArgs.push(item);
        else if ((tp=typeof item) == 'string')
          bArgs.push(reactCreate_(Span__,{'html.':item}));
        else if (tp == 'function')
          bArgs.push(reactCreate_(item));
        // else, ignore
      }
      if (hasStatic) bArgs[1] = Object.assign({},dProp,{'hasStatic.':true});
    }
    bRet.push(reactCreate_.apply(null,bArgs));
  }
  
  return false;  // false means no static text
}

utils.loadElement = function() {
  var bRet = [], argLen = arguments.length;
  
  if (argLen == 1) {
    loadReactTreeEx_(bRet,arguments[0],W.$staticNodes,W.$cachedClass);
    if (bRet.length == 1)
      return bRet[0];
    else return null;
  }
  else if (argLen == 0)
    return null;
  else {
    for (var i=0; i < argLen; i++) {
      loadReactTreeEx_(bRet,arguments[i],W.$staticNodes,W.$cachedClass);
      if (bRet.length <= i) bRet.push(null);
    }
    return bRet;
  }
};

utils.loadElementEx = function(sPrefix) {
  var bRet = [], argLen = arguments.length;
  
  sPrefix = sPrefix || '';  // such as '.body.$$rewgt'
  if (argLen == 2) {
    loadReactTreeEx_(bRet,arguments[1],W.$staticNodes,W.$cachedClass,sPrefix);
    if (bRet.length == 1)
      return bRet[0];
    else return null;
  }
  else if (argLen <= 1)
    return null;
  else {
    for (var i=1; i < argLen; i++) {
      loadReactTreeEx_(bRet,arguments[i],W.$staticNodes,W.$cachedClass,sPrefix);
      if (bRet.length < i) bRet.push(null);
    }
    return bRet;
  }
};

utils.setVendorLib = function(sName,callback) {
  var body = topmostWidget_ && topmostWidget_.component;
  if (!body || !sName || !callback) return; // fatal error
  
  var ret = null;
  function doCallback(registIt) {
    if (registIt) {
      var wdgt = ret && ret.widget;
      if (sName !== 'body' && wdgt)
        W[sName] = wdgt;
    }
    if (callback) callback(ret);
  }
  
  var sName2 = '$$' + sName;
  ret = body.componentOf(sName2);
  if (ret) {
    doCallback(true);
    return;
  }
  
  body.setChild(utils.loadElement(['TempPanel',{key:sName2}]), function() {
    ret = body.componentOf(sName2);  // ret must exists
    doCallback(true);
  });
};

function propagateResizing_(comp,inPending) {
  var currWdgt = comp.widget;
  if (!currWdgt) return;
  
  var gui = comp.$gui, wd = gui.cssWidth, hi = gui.cssHeight, pending = !!inPending;
  if (typeof wd != 'number' && typeof hi != 'number') return; // both width and height is auto, ignore
  
  var newId = 0;
  gui.comps.forEach(function(child) {
    if (!child) return;
    
    var sKey = getElementKey_(child);
    var childObj = sKey && currWdgt[sKey];
    childObj = childObj && childObj.component;
    if (childObj) {
      if (childObj.willResizing && !childObj.willResizing(wd,hi,pending)) return;
      if (!newId) newId = identicalId();
      childObj.setState({ parentWidth:wd, parentHeight:hi, id__:newId });
    }
  });
}
utils.propagateResizing = propagateResizing_;

function loadReactTree_(container,bTree,callback) {
  if (!W.__design__) {   // only for __design__
    if (callback) callback();
    return;
  }
  
  var bRet = [], bStatic = [], dTempSet = {};
  loadReactTreeEx_(bRet,bTree,bStatic,dTempSet);
  
  function doCallback() {
    setTimeout( function() {
      inReactReloading_ = false;  // when in loading, popup window is disabled
    },300);
    if (callback) callback();
  }
  
  if (bRet.length == 1) {
    inReactReloading_ = true;
    
    var bodyEle = bRet[0];
    ReactDOM.unmountComponentAtNode(container);
    container.style.visibility = 'hidden';
    container.innerHTML = '';
    
    setTimeout( function() {
      utils.widgetNum(0);     // reset widget counter
      topmostWidget_   = null;
      justFirstRender_ = false;
      inFirstLoading_  = true;
      pendingRefers_   = [];
      W.$cachedClass   = dTempSet;
      W.$staticNodes   = bStatic;
      
      ReactDOM.render(bodyEle,container, function() {
        container.style.visibility = 'visible';
        
        var onLoad = W.$main.$$onLoad_;
        if (typeof onLoad == 'function')
          onLoad(doCallback);
      });
    },0);
  }
  else {
    if (callback) callback();
  }
}

var RE_UPCASE_ALL_ = /([A-Z])/g;

function streamReactTree_(bTree,iLevel,iOwnerFlag) {
  iLevel = iLevel || 0;
  function headSpace() {
    return (new Array(iLevel + 1)).join('  ');
  }
  
  var sName,dProp,iFlag, firstItem = bTree[0], iChildNum = 0;
  if (Array.isArray(firstItem)) {
    iChildNum = bTree.length - 1;
    sName = firstItem[0];
    dProp = firstItem[1];
    iFlag = firstItem[2];
  }
  else {
    sName = firstItem;
    dProp = bTree[1];
    iFlag = bTree[2];
  }
  if (typeof iFlag != 'number') iFlag = 1;
  
  var sHeadSpace = headSpace(), sRet = sHeadSpace;
  if (!sName) {
    var bHtml = dProp.html || [];
    var sTag = iOwnerFlag <= 1? "<div class='rewgt-static'>": "<span class='rewgt-static'>";
    var sTail = iOwnerFlag <= 1? '</div>': '</span>'; // iFlag is parent node's flag, 1 means 'childInline.'==false && rewgt-unit
    
    if (bHtml.length == 0)
      sRet = '';
    else if (bHtml.length == 1) {
      sRet += sTag + bHtml[0] + sTail + '\n';
    }
    else {
      sRet += sTag + '\n';
      bHtml.forEach( function(sItem) {
        sRet += sHeadSpace + '  ' + sItem + '\n';
      });
      sRet += sHeadSpace + sTail + '\n';
    }
    return sRet;
  }
  
  var isLink = false, isPre = false;
  if (sName == 'RefDiv') {
    isLink = true; isPre = dProp['isPre.']; iChildNum = 0;  // iFlag == 2
    sRet += (isPre?'<pre $=':'<div $=') + JSON.stringify(dProp['$'] || '');
  }
  else if (sName == 'RefSpan') {  // iFlag == 3
    isLink = true; iChildNum = 0;
    sRet += '<span $=' + JSON.stringify(dProp['$'] || '');
  }
  else {
    if (iFlag == 3)
      sRet += '<span $=' + sName;
    else {
      isPre = dProp['isPre.'];
      if (isPre) iChildNum = 0;   // force to no children
      sRet += (isPre?'<pre $=':'<div $=') + sName;
    }
  }
  
  var sKey_ = dProp.key, sHtmlTxt = dProp['html.'];
  if (sKey_) sRet += " key='" + sKey_ + "'";
  
  Object.keys(dProp).forEach( function(sKey) {
    if (sKey == 'key' || sKey == 'html.' || sKey == '$' || sKey == 'isPre.') return;
    
    var value = dProp[sKey];
    if (value === undefined) return;
    if (sKey == 'style') sKey = 'sty__';
    
    sRet += ' ' + sKey.replace(RE_UPCASE_ALL_,'-$1').toLowerCase() + '=';
    if (typeof value == 'string' && (sKey[0] == '$' || !value || value[0] != '{' || value.slice(-1) != '}'))
      sRet += "'" + adjustTagAttr(value) + "'";
    else sRet += "'{" + adjustTagAttr(JSON.stringify(value)) + "}'";
  });
  
  var subRet = '';
  if (iChildNum) {  // isPre must be false
    for (var i=1,item; item=bTree[i]; i+=1) {
      subRet += streamReactTree_(item,iLevel+1,iFlag);
    }
    
    if (iFlag == 3) {
      if (subRet.indexOf(sHeadSpace + '  ') == 0)
        sRet += ('>' + subRet.slice(sHeadSpace.length+2));
      else sRet += ('>' + subRet);
    }
    else sRet += ('>\n' + subRet);
  }
  else {
    sRet += '>';
    if (sHtmlTxt) {
      if (isPre)
        sRet += sHtmlTxt;
      else sRet += sHtmlTxt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
  }
  
  if (isPre)
    sRet += '</pre>\n';
  else {
    if (iFlag == 3) {
      if (subRet && subRet.slice(-1) == '\n') // has children
        sRet += (sHeadSpace + '</span>\n');
      else sRet += '</span>\n';
    }
    else {
      if (sHtmlTxt || sRet.slice(-1) != '\n')
        sRet += '</div>\n';
      else sRet += (sHeadSpace + '</div>\n'); // no 'html.' and end with '\n', let it look better
    }
  }
  return sRet;
  
  function adjustTagAttr(s) {
    return s.replace(/&/g,"&amp;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); // "'
  }
}

// API for reference by path
//--------------------------
function deepFirstFindNav_(widget,groundId) {
  var compObj = widget.component;
  if (!compObj) return null;
  
  for (var sKey in compObj.$gui.compIdx) {
    var child = widget[sKey];
    var childObj = child && child.component;
    if (!childObj) continue;
    
    if (childObj.props['isNavigator.']) {
      var d = childObj.$gui.navItems;
      var ele = d && d[groundId];
      if (ele && ele.props['isPlayground.']) return child;
    }
    else {
      if (!childObj.props['childInline.']) {
        child = deepFirstFindNav_(child,groundId)
        if (child) return child;
      }
    }
  }
  
  return null;
}

function childElements_(childEle,ownerWdgt) { // get recent children, not same to comp.props.children
  if (!ownerWdgt) return [];
  
  var sKey = getElementKey_(childEle);
  var child = sKey && ownerWdgt[sKey];
  if (child) {
    var bRet = [];
    child = child.component;
    if (!child) return bRet;
    
    child.$gui.comps.forEach( function(item) {
      if (item) bRet.push(item);
    });
    return bRet;
  }
  else return children2Arr_(childEle.props.children);
};

utils.gotoHash = function(sHash,callback,wdgt) { // overwrite previous dummy function
  var bRetSeg = [''];
  function doCallback(meetErr) {
    var sRet = '';
    if (!meetErr)
      sRet = bRetSeg.join('/');    // sRet = '/seg/...'
    if (callback) callback(sRet);
  }
  
  var widget = wdgt || topmostWidget_;
  if (sHash) {
    if (sHash[0] == '#')
      sHash = sHash.slice(1).trim();
    else sHash = sHash.trim();
  }
  if (!sHash || !widget) return doCallback(true);
  
  var ch = sHash[0];
  if (ch == '!') {
    var node = null;
    try {
      var sAnchor = sHash.slice(1);
      if (sAnchor && sAnchor.indexOf('"') < 0) {
        node = document.querySelector('a[name="' + sAnchor + '"]');
        if (node) {
          bRetSeg.push(sHash);        // success
          node.scrollIntoView(true);  // try jump to <a name="xx">
        }
      }
    }
    catch(e) {}
    return doCallback(!node);
  }
  else if (ch != '/') {
    var pageCtrl = utils.pageCtrl;
    if (pageCtrl && pageCtrl.gotoPage)
      pageCtrl.gotoPage(sHash,callback);  // callback('') means no jump
    else {
      if (callback) callback('');
    }
    return;
  }
  
  var bSeg = sHash.slice(1).split('/');
  findAndSetOneSeg(widget,bSeg.shift());
  
  function findAndSetOneSeg(widget,item) {
    if (!widget || !item) return doCallback(true);
    
    if (item[0] == '!' && bSeg.length == 0) {  // #/.../!hash, jump to <a name="xx">
      var node = null, sAnchor = item.slice(1);
      if (sAnchor && sAnchor.indexOf('"') < 0) {
        try {
          node = document.querySelector('a[name="' + sAnchor + '"]');
          if (node) {
            bRetSeg.push(item);    // success
            node.scrollIntoView(true);
          }
        }
        catch(e) { }
      }
      return doCallback(!node);
    }
    
    var comp, navWidget = deepFirstFindNav_(widget,item);
    if (!navWidget || !(comp=navWidget.component)) {
      utils.instantShow('warning: can not find navigator widget (' + bRetSeg.join('/') + '/' + item + ').');
      return doCallback(true);
    }
    
    comp.fireChecked(item, function() {
      if (comp.state.checkedId !== item)
        return doCallback(true);
      
      bRetSeg.push(item);
      if (bSeg.length == 0)
        return doCallback(false);  // success finish
      
      findAndSetOneSeg(navWidget[item],bSeg.shift());  // continue search next segment
    });
  }
};

function pathLevelInfo_(sPath_) {
  var sPath = sPath_, iPos = sPath.indexOf('./'), ch = sPath[0], iLevel = 0, isSibling = false;
  if (iPos == 0) {
    iLevel = 1;
    sPath = sPath.slice(2);
  }
  else if (iPos == 1 && ch == '.') {
    iLevel = 2;
    sPath = sPath.slice(3);
    while ((iPos = sPath.indexOf('../')) == 0) {
      iLevel += 1;
      sPath = sPath.slice(3);
    }
  }
  else if (ch == '.') {
    iLevel = -1;         // absolute
    sPath = sPath.slice(1);
  }
  else if (ch == '/') {
    if (sPath[1] == '/' && sPath.length >= 2) {
      sPath = sPath.slice(2);
      iLevel = -1;
      isSibling = true;  // sPath != ''
    }
    else {
      iLevel = -1;       // absolute
      sPath = sPath.slice(1);
    }
  }
  else isSibling = true; // iLevel = 0, sPath != ''
  
  if (sPath.indexOf('/') >= 0) {
    utils.instantShow('error: invalid reference path (' + sPath_ + ').');
    return null;
  }
  else return [sPath,iLevel,isSibling];
}
creator.pathLevelInfo = pathLevelInfo_;

function getCompByPath_(entry,sPath_) { // entry is component object
  var b = pathLevelInfo_(sPath_);
  if (!b) return null;
  
  var sPath = b[0], iLevel = b[1], isSibling = b[2];
  if (isSibling) {
    var targ = entry.widget, owner = targ;
    if (iLevel < 0) owner = targ && targ.parent;  // start with '//', maybe sPath=''
    if (owner)
      return doCallback(sPath?owner.W(sPath):owner);
  }
  else if (iLevel == -1) { // not isSibling means is absolute
    if (sPath)
      return doCallback(W.W(sPath));
  }
  else { // iLevel >= 1
    var targ = entry.widget;
    while (targ && iLevel > 0) {
      var comp = targ && targ.component;
      if (comp && comp.props['isNavigator.']) {
        iLevel -= 1;
        if (iLevel == 0) break;
      }
      
      var targ_ = targ.parent;
      if (!targ_) {  // meet topmost
        iLevel -= 1;
        targ = W;
        break;
      }
      else targ = targ_; 
    }
    
    if (targ && iLevel == 0) // targ maybe W (W.component is undefined)
      return doCallback(sPath?targ.W(sPath):targ);
  }
  
  return doCallback(null);
  
  function doCallback(targ) {
    targ = targ && targ.component;
    if (!targ) {
      console.log('warning: can not find widget (' + sPath_ + ').');
      return null;
    }
    else return targ;
  }
}

function templateNode(ele) { // new templateNode(element)
  this.comps = {};   // sPath:[iType,childNode,ownerSeg]; // iType: 1:normal 2:ref 3:nav 4:template
  this.element = ele;
  this.pathSeg = ''; // ele['hookTo.'].comps[pathSeg] === this when ele['hookTo.'] is templateNode
}

function loadReference_(entry, keyName, callback) { // entry is linker owner component, keyName must be string, callback must passed
  var isRefSpan = false, bSourProp = [], refLnkPath = '';
  var child, compIdx = entry.$gui.compIdx[keyName];
  if (entry.widget && typeof compIdx == 'number' && keyName[0] == '$' && (child = entry.$gui.comps[compIdx]) && child.props['isReference.']) {
    var compProp = child.props;
    if (compProp['isReference.'] == 2) isRefSpan = true;
    
    refLnkPath = compProp['$'];
    if (typeof refLnkPath != 'string' || (refLnkPath = refLnkPath.trim()).length == 0) {
      if (refLnkPath !== '')  // if '$' is empty, no need warning
        console.log('warning: load reference (' + keyName + ') failed: invalid path');
      callback(); // invalid entry or keyName, ignore, continue next
    }
    else {
      if (!refLnkPath)
        doCallback(null,refLnkPath);
      else loadCompByRef(entry,refLnkPath,'');  // entry is parent component of linker
    }
  }
  else {
    console.log('warning: load reference (' + keyName + ') failed.');
    callback(); // invalid entry or keyName, ignore, continue next
  }
  
  function loadCompByRef(entry,sPath_,sOwnerSeg) {  // entry can be: widget or templateNode
    var b = pathLevelInfo_(sPath_);
    if (!b) return doCallback(null,sPath_);
    var sPath = b[0], iLevel = b[1], isSibling = b[2];
    
    var isTemplate = entry instanceof templateNode;
    if (isSibling) {
      if (isTemplate)
        return doCallback(null,sPath_);  // not support
      // else, entry is owner component of linker
      
      var targ;
      if (iLevel < 0 && (targ=entry.widget)) { // only get from linker parent, not from linker self
        getComponent(targ,sPath,sPath_,false);
        return;
      }
      // else, failed // iLevel >= 0 or invalid entry
    }
    else if (iLevel == -1) {  // by absolute
      getComponent(null,sPath,sPath_,false);
      return;
    }
    else {
      var targ = entry;
      
      if (isTemplate) {
        targ = entry.element;
        var owner = targ.props['hookTo.'], change2Comp = false;
        if (!owner) { // when redefine in JSX, 'hookTo.' maybe not passed
          owner = targ.widget;
          owner = owner && owner.parent;
        }
        
        while (targ && iLevel > 0 && owner) {  // owner must be templateNode
          if (owner instanceof templateNode) {
            if (!sOwnerSeg) {
              targ = owner.element; // continue search from owner
              sOwnerSeg = owner.pathSeg;
              owner = targ.props['hookTo.'];
              if (!owner) {  // when redefine in JSX, 'hookTo.' maybe not passed
                owner = targ.widget;
                owner = owner && owner.parent;
              }
            }
            else {
              var b = owner.comps[sOwnerSeg];
              if (!b) return doCallback(null,sPath_);
              var iFlag = b[0];
              
              if (iFlag == 4) {         // 4 is template, b[1] must be templateNode
                sOwnerSeg = b[2];
                if (!sOwnerSeg) {
                  targ = owner.element; // continue search from owner
                  sOwnerSeg = owner.pathSeg;
                  owner = targ.props['hookTo.'];
                  if (!owner) {  // when redefine in JSX, 'hookTo.' maybe not passed
                    owner = targ.widget;
                    owner = owner && owner.parent;
                  }
                }
                // else iLevel -= 1;    // no level, just point to previous, continue next owner's sOwnerSeg
              }
              else if (iFlag == 3) {    // 3 is nav-element
                iLevel -= 1;
                if (iLevel == 0) {      // '../../' in templateNode
                  getComponent(owner,sPath,sPath_,true,sOwnerSeg); // b == owner's sOwnerSeg
                  return;
                }
                else sOwnerSeg = b[2];  // sOwnerSeg should be ''
              }
              else return doCallback(null,sPath_);
            }
          }
          
          else if (Array.isArray(owner)) {
            if (sOwnerSeg) return doCallback(null,sPath_);
            
            targ = owner.component;
            change2Comp = true;
            break;
          }
          else return doCallback(null,sPath_);
        }  // end of while
        
        if (!targ || !owner || !change2Comp) return doCallback(null,sPath_);
      }
      
      targ = targ.widget;
      while (targ && iLevel > 0) {
        var comp = targ && targ.component;
        if (comp && comp.props['isNavigator.']) {
          iLevel -= 1;
          if (iLevel == 0) break;
        }
        
        var targ_ = targ.parent;
        if (!targ_) {  // meet topmost
          iLevel -= 1;
          targ = W;
          break;
        }
        else targ = targ_; 
      }
      if (targ && iLevel == 0) {  // targ maybe W (W.component is undefined)
        getComponent(targ,sPath,sPath_,false);
        return;
      }
    }
    
    doCallback(null,sPath_);
  }
  
  function doCallback(targ,sPath_) {
    // step 1, check target obj
    if (!targ) {
      utils.instantShow('error: can not find reference (' + sPath_ + ').');
      callback();    // callback must passed 
      return;
    } // check component type matched or not
    
    if (isRefSpan) { // RefSpan
      if (!targ.props['childInline.'])
        utils.instantShow('warning: reference target (' + sPath_ + ') should be inline widget.');
    } 
    else { // RefDiv
      if (!hasClass_(targ.props.className, ['rewgt-panel', 'rewgt-unit']))
        utils.instantShow('warning: reference target (' + sPath_ + ') should be: panel, div, paragraph.');
    }
    
    // step 2, find 'key' position and '$key' element
    var gui = entry.$gui, keyid2 = keyName.slice(1), fromEle = null; // keyName must start with '$'
    var compIdx = gui.compIdx[keyName];
    if (typeof compIdx == 'number') {
      fromEle = gui.comps[compIdx];      // element of $key, should exists
      var iPos = gui.compIdx[keyid2];
      if (typeof iPos != 'number') {
        if (fromEle) {
          gui.compIdx[keyid2] = compIdx; // compIdx[key] = place_of_$key
          delete gui.compIdx[keyName];   // remove compIdx[$key]
          gui.removeNum += 1;
        }
      }
      else {  // exist 'key' and '$key' both
        compIdx = iPos;     // adjust target 'keyid' position
        gui.removeNum += 1; // replace exist component
      }
    }
    if (!fromEle) {
      utils.instantShow('error: invalid linker (' + keyName + ').');
      callback();
      return;
    }
    bSourProp.unshift(fromEle.props);
    
    // step 3, setup dProp
    var dProp = {}, dStyle = {}, styleNum = 0;
    if (targ.props.style) {  // targ should not a linker
      Object.assign(dStyle,targ.props.style);
      styleNum += 1;
    }
    var sourProp = bSourProp.pop();
    while (sourProp) {
      var dCurr = getRefProp_(sourProp);
      if (dCurr.style) {
        Object.assign(dStyle,dCurr.style);
        styleNum += 1;
      }
      Object.assign(dProp,dCurr);
      sourProp = bSourProp.pop();
    }
    if (styleNum) dProp.style = dStyle;
    dProp['hookTo.'] = entry.widget;
    if (isRefSpan)
      dProp['data-span.path'] = refLnkPath;
    else dProp['data-unit.path'] = refLnkPath;
    var dSubStyles = fromEle.props.styles;
    if (dSubStyles) dProp.styles = dSubStyles; // only assign recent Refxx's styles
    if (W.__design__) {
      var dTmp = {};
      dProp['link.props'] = Object.assign(dTmp,getRefProp_(fromEle.props));
      if (dSubStyles) dTmp.styles = dSubStyles;
    }
    var iTmp = parseInt(keyid2);
    var keyid3 = (iTmp + '' === keyid2)? iTmp: keyid2;
    dProp.key = keyid2;
    dProp['keyid.'] = keyid3;
    
    // step 4, replace ref node
    gui.comps[compIdx] = reactClone_(targ, dProp);  // replace link widget
    entry.setState({id__:identicalId()}, function() {
      var subComp = entry.widget[keyid3];
      subComp = subComp && subComp.component;
      if (subComp) renewStaticChild(subComp); // reactClone_() not clone static node
      callback();
    }); // can not use reRender() since entry.isHooked can be false
  }
  
  function getComponent(widget,sPath,sPath_,isTemplate,sPrefix) {
    var bSeg;
    if (!widget) {  // if !widget, isTemplate must false
      if (!sPath || isTemplate) return doCallback(null,sPath_);
      
      bSeg = sPath.split('.');
      if (bSeg.length <= 1) return doCallback(null,sPath_); // sPath can not be 'body', at least 'body.xx'
      widget = W[bSeg.shift()];
      if (!widget) return doCallback(null,sPath_);
    }
    else {
      if (!sPath) {
        if (isTemplate) // widget is templateNode
          return doCallback(widget.element,sPath_);
        // else, widget is widget
        
        var ownerObj = widget.parent, thisObj = widget.component;
        ownerObj = ownerObj && ownerObj.component;
        if (ownerObj && thisObj) { // for component (not template) should use full clone
          var idx = ownerObj.$gui.compIdx[thisObj.$gui.keyid];
          if (typeof idx == 'number')
            return doCallback(thisObj.fullClone(),sPath_);
        }
        return doCallback(null,sPath_);
      }
      
      bSeg = sPath.split('.');
    }
    
    // widget && sPath, then we find it level by level
    while (widget && bSeg.length) {
      var item = bSeg.shift();
      if (!item) return doCallback(null,sPath_);
      
      var wgtObj = null, tempNode = null, tempPath = '';
      if (isTemplate) {    // widget is templateNode, W.__design__ must be false
        if (W.__design__) return doCallback(null,sPath_);
        tempNode = widget;
        if (sPrefix) {
          tempPath = sPrefix;
          bSeg.unshift(item);
        }
        else tempPath = item;
      }
      else {
        wgtObj = widget.component;
        if (!wgtObj) {
          if (widget === W) {
            widget = W[item];
            if (widget) wgtObj = widget.component;
            item = bSeg.shift();
          }
          if (!wgtObj || !item)
            return doCallback(null,sPath_);
        }
        
        // only not in design, scan from $gui.template
        if ((!W.__design__ || wgtObj.isLibGui) && wgtObj.props['isTemplate.']) {  // shift to template (tempNode)
          tempNode = wgtObj.$gui.template;
          if (!tempNode) return doCallback(null,sPath_);
          tempPath = item;
          wgtObj = null;  // must not process as widget
        }
      }
      
      if (tempNode) {
        var b = tempNode.comps[tempPath];
        while (b) { // if isKeyidTemp, must be [4,tempNode,sOwnerSeg]
          var iType = b[0], next = b[1];
          if (iType == 2) {  // ref, no sub level  // [2,element,sOwnerSeg]
            if (bSeg.length != 0) break;  // not found, failed
            
            var compProp2 = next.props;
            var isRefSpan2 = (compProp2['isReference.'] == 2), sPath2_ = compProp2['$'];
            if (compProp2['hookTo.'] === tempNode && typeof sPath2_ == 'string') {
              sPath2_ = sPath2_.trim();
              if (!sPath2_) return doCallback(null,sPath2_);
              if (isRefSpan != isRefSpan2)
                utils.instantShow('warning: reference type (' + sPath_ + ') mismatch.');
              
              if (sPath2_[0] == '/' && sPath2_[1] == '/') { // try get sibling element
                if (sPath2_.indexOf('/',2) >= 0)
                  return doCallback(null,sPath2_);
                
                bSeg = tempPath.split('.');
                bSeg.pop();
                tempPath = bSeg.join('.');    // parent_path = parentPath(this_ref_node), maybe ''
                
                bSeg = sPath2_.slice(2).split('.');
                if (tempPath) tempPath += '.';
                tempPath += bSeg.shift();
                b = tempNode.comps[tempPath]; // tempNode not changed  // if !b, will failed
                bSourProp.push(compProp2);
                continue;
              }
              
              bSourProp.push(compProp2);
              loadCompByRef(tempNode,sPath2_,b[2]); // owner must be templateNode or template-component
              return;   // try load by RefDiv or RefSpan
            }
            else break; // failed
          }
          else {
            if (iType == 4) {   // template: [4,tempNode,sOwnerSeg]
              tempNode = next;
              next = tempNode.element;
            }
            if (bSeg.length == 0)
              return doCallback(next,sPath_); // next maybe template element
            
            if (iType == 4)     // template
              tempPath = bSeg.shift();
            else {  // 1:normal 3:nav     // [iType,element,sOwnerSeg]
              tempPath += '.' + bSeg.shift();
            }
            b = tempNode.comps[tempPath]; // continue next loop
          }
        }
        
        return doCallback(null,sPath_);   // must exit loop
      }
      
      else {  // not template
        // assert(widget && wgtObj && !isTemplate);
        
        if (bSeg.length == 0) { // is last one
          var idx = wgtObj.$gui.compIdx[item];
          if (typeof idx == 'number') {
            var childObj = widget[item];
            childObj = childObj && childObj.component;
            if (childObj)
              return doCallback(childObj.fullClone(),sPath_);
            else return doCallback(null,sPath_);
          }
          else {
            idx = wgtObj.$gui.compIdx['$' + item];
            if (typeof idx == 'number') {
              var next = wgtObj.$gui.comps[idx];
              if (next && next.props['isReference.']) {  // ref node under widget
                var compProp2 = next.props, isRefSpan2 = compProp2['isReference.'] == 2;
                var sPath2_ = compProp2['$'];
                if (typeof sPath2_ == 'string') {
                  sPath2_ = sPath2_.trim();
                  if (!sPath2_) return doCallback(null,sPath2_);
                  if (isRefSpan != isRefSpan2)
                    utils.instantShow('warning: reference type (' + sPath_ + ') mismatch.');
                  
                  bSourProp.push(compProp2);
                  loadCompByRef(wgtObj,sPath2_,'');
                  return;  // try load by RefDiv or RefSpan
                }
              }
            }
            return doCallback(null,sPath_);
          }
        }
        else {
          widget = widget[item]; // not last segment, must not ref node
        }
      }
    }
    
    doCallback(null,sPath_);
  }
}

function pageCtrl_(bPage) {
  var pageIndex = this.pageIndex = 0;
  var keys = this.keys = [];  // array of string
  var namedPage = this.namedPage = {};
  
  bPage.forEach( function(item,idx) {
    keys.push(item[0] + '');
    
    var page = item[1];
    var sShow = idx == pageIndex? 'block': 'none';
    if (page.state.style.display !== sShow)
      page.duals.style = {display:sShow};
    
    var sName = page.props.name;
    if (sName && typeof sName == 'string') namedPage[sName] = idx;
  });
  
  var wd = window.innerWidth, wd2 = Math.max(Math.floor(wd/20),20);
  var leftPanel = document.createElement('div');
  leftPanel.setAttribute('style','position:absolute; left:0px; top:0px; width:' + wd2 + 'px; height:100%; background-color:#000; opacity:0; z-index:3000;');
  document.body.appendChild(leftPanel);
  var rightPanel = document.createElement('div');
  rightPanel.setAttribute('style','position:absolute; right:0px; top:0px; width:' + wd2 + 'px; height:100%; background-color:#000; opacity:0; z-index:3000;');
  document.body.appendChild(rightPanel);
  
  this.leftPanel  = leftPanel;
  this.rightPanel = rightPanel;
  
  var self = this;
  leftPanel.onclick = function(event) {
    self.prevPage();
  };
  rightPanel.onclick = function(event) {
    self.nextPage();
  };
  leftPanel.onmouseover  = mouseover;
  leftPanel.onmouseout   = mouseout;
  rightPanel.onmouseover = mouseover;
  rightPanel.onmouseout  = mouseout;
  
  function mouseover(event) {
    event.target.style.opacity = '0.1';
  }
  function mouseout(event) {
    event.target.style.opacity = '0';
  }
}

pageCtrl_.prototype = {
  gotoPage_: function(keys,pgIndex) {
    var sFirstSeg = '', jumpedWdgt = null;
    keys.forEach( function(sKey,idx) {
      var wdgt = topmostWidget_ && topmostWidget_[sKey];
      var comp = wdgt && wdgt.component;
      if (comp) {
        var sCss = 'none';
        if (idx == pgIndex) {
          sCss = 'block';
          sFirstSeg = sKey;
          jumpedWdgt = wdgt;
        }
        if (comp.state.style.display != sCss)
          comp.duals.style = {display:sCss};
      }
    });
    if (jumpedWdgt) this.pageIndex = pgIndex;  // modify when it real shift
    return [sFirstSeg,jumpedWdgt];
  },
  
  gotoPage: function(pgIndex,callback) {
    if (!this.keys.length) {
      if (callback) callback('');
      return;
    }
    
    var sFirstSeg = '', sLeftSeg = '', jumpedWdgt = null;
    function doCallback() {
      if (sFirstSeg && sLeftSeg && jumpedWdgt) {
        utils.gotoHash(sLeftSeg, function(sRet) {
          if (callback) callback(sRet?sFirstSeg+sRet:'');
        },jumpedWdgt);
      }
      else {
        if (callback) callback(sFirstSeg+sLeftSeg);
      }
    }
    
    var tp = typeof pgIndex;
    if (tp == 'string' && pgIndex) {
      if (pgIndex[0] == '#') pgIndex = pgIndex.slice(1);
      var iPos = pgIndex.indexOf('/');
      if (iPos > 0) {
        sLeftSeg = pgIndex.slice(iPos);
        pgIndex = pgIndex.slice(0,iPos);
      }
      
      var iTmp = parseInt(pgIndex);
      if ((iTmp + '') == pgIndex) {
        pgIndex = iTmp;
        tp = 'number';
      }
    }
    
    if (tp == 'string' && pgIndex) {
      var idx = this.namedPage[pgIndex];
      if (typeof idx == 'number')
        pgIndex = idx;
      else {
        sLeftSeg = '';
        return doCallback();  // invalid
      }
    }
    else if (tp != 'number') {
      sLeftSeg = '';
      return doCallback();    // invalid
    }
    // pgIndex is number by now
    
    var iLen = this.keys.length;
    if (!iLen) return doCallback(); // invalid
    if (pgIndex >= iLen)
      pgIndex = iLen - 1;
    if (pgIndex < 0)
      pgIndex = 0;
    
    var b = this.gotoPage_(this.keys,pgIndex);
    sFirstSeg = b[0]; jumpedWdgt = b[1];
    if (!jumpedWdgt) sLeftSeg = ''; // failed, sFirstSeg must be ''
    doCallback();
  },
  
  prevPage: function() {
    return this.gotoPage(this.pageIndex - 1);
  },
  
  nextPage: function() {
    return this.gotoPage(this.pageIndex + 1);
  },
  
  renewPages: function(bNew) { // bNew=[[sKey,comp],...]
    var bKey = [], dName = {};
    bNew.forEach( function(item) {
      var sKey = item[0]
      if ((parseInt(sKey)+'') !== sKey)
        dName[sKey] = bKey.length;
      bKey.push(sKey);
    });
    
    var sCurr = this.keys[this.pageIndex], noShift = true;
    if (typeof sCurr == 'string') {
      var iPos = bKey.indexOf(sCurr);
      if (iPos >= 0) {
        this.pageIndex = iPos;
        noShift = true;
      }
    }
    this.keys = bKey;
    this.namedPage = dName;
    
    if (!noShift) {
      if (bKey.length)
        this.gotoPage(0);
      else this.pageIndex = 0; // no jump
    }
  },
  
  setDisplay: function(cfg) {
    if (cfg.hasOwnProperty('leftCtrlWidth'))
      this.leftPanel.style.width = getPxWidth(cfg.leftCtrlWidth) + 'px';
    if (cfg.hasOwnProperty('rightCtrlWidth'))
      this.rightPanel.style.width = getPxWidth(cfg.rightCtrlWidth) + 'px';
    
    function getPxWidth(i) {
      var i = Math.max(i || 0,0);
      if (i < 0.9999)
        i = i * window.innerWidth;
      else if (i < 1)
        i = window.innerWidth;
      return i;
    }
  },
  
  destory: function() {
    if (this.leftPanel) {
      this.leftPanel.parentNode.removeChild(this.leftPanel);
      this.leftPanel = null;
    }
    if (this.rightPanel) {
      this.rightPanel.parentNode.removeChild(this.rightPanel);
      this.rightPanel = null;
    }
  },
};

creator.pageCtrl_ = pageCtrl_;

function listScenePage_() {
  var bPage = [], topObj = topmostWidget_ && topmostWidget_.component;
  if (topObj) {
    (topObj.$gui.comps || []).forEach( function(child) {
      if (!child) return;
      var sKey = getElementKey_(child), childObj = sKey && topmostWidget_[sKey];
      childObj = childObj && childObj.component;
      if (childObj && childObj.props['isScenePage.']) {
        if (W.__design__ || !childObj.props.noShow) // if !W.__design__ && noShow, no including
          bPage.push([sKey,childObj]);
      }
    });
  }
  return bPage;
}

W.$main.$$onLoad_ = function(designCallback) {
  function processRef(callback) {
    var item = pendingRefers_.shift();
    if (item) {
      var obj = item[0], keyid = item[1];
      loadReference_(obj, keyid, function() {
        processRef(callback);
      });
    }
    else callback();
  }
  
  function processOneInit() {
    var fn = onLoading.shift();
    if (fn)
      fn(processOneInit);
    else {
      processRef( function() {
        justFirstRender_ = false;
        inFirstLoading_ = false;      // has load pending RefDiv/RefSpan
        
        // set default PageController // all pendingRefers_ has set by now
        if (!W.__design__ && containNode_ && !utils.pageCtrl) {
          var bPage = listScenePage_();
          if (bPage.length)  // has ScenePage, need setup PageController
            utils.pageCtrl = new pageCtrl_(bPage);
        }
        
        // fire W.$main.$onload
        setTimeout( function() {  // process post-loading in next event-loop
          if (W.__design__) {
            W.$main.$onLoad = [];
            W.$main.inRunning = true;
            if (designCallback) designCallback();
          }
          else {
            var fn, onReady = W.$main.$onReady;
            if (Array.isArray(onReady)) {
              while (fn = onReady.shift()) {
                fn();
              }
            }
            else if (typeof onReady == 'function')
              onReady();
            
            var onLoad = W.$main.$onLoad;
            if (Array.isArray(onLoad)) {
              while (fn = onLoad.shift()) {
                fn();
              }
            }
            W.$main.inRunning = true;
            
            var sHash = window.location.hash;
            if (sHash) {
              setTimeout( function() {
                utils.gotoHash(sHash);  // no callback, let main.$onLoad run first
              },300);
            }
          }
        },0);
      });
    }
  }
  
  justFirstRender_ = true;
  var onLoading = W.$main.$$onLoading = (W.$main.$$onLoad || []).slice(0);
  processOneInit();
};

var supportedEvent_ = { onCopy: true, onCut: true, onPaste: true,
  onCompositionEnd: true, onCompositionStart: true, onCompositionUpdate: true,
  onKeyDown: true, onKeyPress: true, onKeyUp: true,
  onFocus: true, onBlur: true,
  onChange: true, onInput: true, onSubmit: true,
  
  onClick: true, onContextMenu: true, onDoubleClick: true,
  onDrag: true, onDragEnd: true, onDragEnter: true, onDragExit: true,
  onDragLeave: true, onDragOver: true, onDragStart: true, onDrop: true,
  onMouseDown: true, onMouseEnter: true, onMouseLeave: true, onMouseMove: true,
  onMouseOut: true, onMouseOver: true, onMouseUp: true,
  
  onSelect: true,
  onTouchCancel: true, onTouchEnd: true, onTouchMove: true, onTouchStart: true,
  onScroll: true,
  onWheel: true,
  
  onAbort: true, onCanPlay: true, onCanPlayThrough: true,
  onDurationChange: true, onEmptied: true, onEncrypted: true, onEnded: true,
  onError: true, onLoadedData: true, onLoadedMetadata: true, onLoadStart: true,
  onPause: true, onPlay: true, onPlaying: true, onProgress: true, onRateChange: true,
  onSeeked: true, onSeeking: true, onStalled: true, onSuspend: true,
  onTimeUpdate: true, onVolumeChange: true, onWaiting: true,
  
  onLoad: true, onError: true
};

// 1 for standard attributes, 2 for RDFa, 3 for addition non-standard, 4 for react extending
var supportedAttr_ = { // 5 reserved for special precessing
  accept: 1, acceptCharset: 1, accessKey: 1, action: 1, allowFullScreen: 1,
  allowTransparency: 1, alt: 1, async: 1, autoComplete: 1, autoFocus: 1,
  autoPlay: 1, capture: 1, cellPadding: 1, cellSpacing: 1, challenge: 1,
  charSet: 1, checked: 1, cite: 1, classID: 1, colSpan: 1, cols: 1, content: 1, // no className
  contentEditable: 1, contextMenu: 1, controls: 1, coords: 1, crossOrigin: 1,
  data: 1, dateTime: 1, 'default': 1, defer: 1, dir: 1, disabled: 1,
  download: 1, draggable: 1, encType: 1, form: 1, formAction: 1, formEncType: 1,
  formMethod: 1, formNoValidate: 1, formTarget: 1, frameBorder: 1, headers: 1,
  hidden: 1, high: 1, href: 1, hrefLang: 1, htmlFor: 1, httpEquiv: 1, icon: 1,  // no height
  id: 1, inputMode: 1, integrity: 1, 'is': 1, keyParams: 1, keyType: 1, kind: 1,
  label: 1, lang: 1, list: 1, loop: 1, low: 1, manifest: 1, marginHeight: 1,
  marginWidth: 1, max: 1, maxLength: 1, media: 1, mediaGroup: 1, method: 1,
  min: 1, minLength: 1, multiple: 1, muted: 1, name: 1, noValidate: 1,
  nonce: 1, open: 1, optimum: 1, pattern: 1, placeholder: 1, poster: 1,
  preload: 1, profile: 1, radioGroup: 1, readOnly: 1, rel: 1, required: 1,
  reversed: 1, role: 1, rowSpan: 1, rows: 1, sandbox: 1, scope: 1, scoped: 1,
  scrolling: 1, seamless: 1, selected: 1, shape: 1, size: 1, sizes: 1, span: 1,
  spellCheck: 1, src: 1, srcDoc: 1, srcLang: 1, srcSet: 1, start: 1, step: 1, summary: 1, // no style
  tabIndex: 1, target: 1, title: 1, type: 1, useMap: 1, value: 1, wmode: 1, wrap: 1,  // no width
  
  about: 2, datatype: 2, inlist: 2, prefix: 2, property: 2, resource: 2, 'typeof': 2, vocab: 2,
  
  autoCapitalize: 3, autoCorrect: 3, color: 3, itemProp: 3, itemScope: 3, itemType: 3,
  itemRef: 3, itemID: 3, security: 3, unselectable: 3, results: 3, autoSave: 3,
  
  dangerouslySetInnerHTML: 4,
  
  className: 5, style: 5, width: 5, height: 5,
};

function getSparedPixel_(obj, wdgt, isRow, iTotal) { // iTotal is cssWidth or cssHeight
  if (typeof iTotal != 'number') return null;
  
  var bColumn,cellSpace, iRet = iTotal, gui = obj.$gui;
  if (obj.state) {
    bColumn = obj.state.sizes;
    cellSpace = parseFloat(obj.state.cellSpacing) || 0;
  }
  else {
    bColumn = obj.props.sizes;
    cellSpace = parseFloat(obj.props.cellSpacing) || 0;
  }
  
  // next process sizes-column
  if (Array.isArray(bColumn)) {
    var iLen = bColumn.length;
    for (var i = 0; i < iLen; i++) {
      var wd = bColumn[i];
      if (typeof wd == 'number') {
        if (wd >= 0) {
          if (wd >= 1)
            iRet -= wd;
          else if (wd >= 0.9999)
            iRet -= iTotal;
          else iRet -= wd * iTotal;
        } // else, ignore negative percent
      }
      else return null; // if not number take as auto
    }
    
    iRet -= cellSpace * (iLen + 1);
    if (iRet < 0)
      return null;      // auto
    else return iRet;
  }
  
  // next process one line array
  var b = gui.comps, iLen = b.length;
  for (var i = 0; i < iLen; i++) {
    var child = b[i];
    if (!child || child.props['isReference.']) continue;
    
    var sKey = getElementKey_(child);
    var wd, childObj = sKey && wdgt[sKey];
    childObj = childObj && childObj.component;
    if (childObj && childObj.state) // has mounted
      wd = isRow ? childObj.state.width: childObj.state.height;
    else wd = isRow ? child.props.width: child.props.height;
    
    if (typeof wd == 'number') {
      if (wd >= 0) {
        if (wd >= 1) iRet -= wd;
        else if (wd >= 0.9999) iRet -= iTotal;
        else iRet -= wd * iTotal;
      } // else, ignore negative percent
    }
    else return null; // not number, it should be undefined (100%) or 'auto'
  }
  
  iRet -= cellSpace * (1 + iLen);
  if (iRet <= 0)
    return null; // if no enough space, take as 'auto'
  else return iRet;
}

// define APIs for containNode_, for GUI design
//--------------------------------------------
function setupContainerApi_(containNode_) {
  containNode_.popDesigner  = popDesigner_;
  containNode_.saveDesigner = saveDesigner_;
  containNode_.dumpTree = dumpReactTree_;
  containNode_.loadTree = loadReactTree_;
  containNode_.streamTree = streamReactTree_;
  containNode_.listScenePage = listScenePage_;
  
  containNode_.keyOfNode = function(node) {
    return keyOfNode_(node);
  };
  containNode_.splitterMouseDn = function() {
    return splitterMouseDn_;
  };
}

function renewStaticChild(compObj,isForce) {
  var node = findDomNode_(compObj);
  if (!node) return;
  
  var bScan = [], nodes = node.querySelectorAll('.rewgt-static');
  for (var i=0,item; item = nodes[i]; i++) {
    var tmp = item.parentNode, canRenew = false;
    while (tmp) {
      if (tmp === document) break;
      if (tmp === node) {
        canRenew = true;
        break;
      }
      if (tmp.classList.contains('rewgt-static')) // only focus one rewgt-static level
        break;
      tmp = tmp.parentNode;
    }
    if (canRenew) {
      var sName = item.getAttribute('name') || undefined, idx = sName && parseInt(sName);
      if (!isNaN(idx)) {
        if (item.children.length > 0) {
          if (isForce && idx >= 0x100000)  // only local static can force reset
            item.innerHTML = '';
          else continue;  // already added, ignore
        }
        bScan.push([idx,sName,item]);
      }
    }
  }
  
  for (var i=0,item; item = bScan[i]; i++) {
    var bList, idx = item[0], sName = item[1], node2 = item[2];
    var fromLocal = idx >= 0x100000;
    
    if (fromLocal) {  // from local
      var d = compObj.$gui.statics;
      bList = d && d[sName];
    }
    else bList = W.$staticNodes[idx];
    
    if (Array.isArray(bList)) {
      for (var i2 = 0, item2; item2 = bList[i2]; i2++) {
        // if from global, add by clone and keep $staticNodes for dumping element under $for
        node2.appendChild(fromLocal?item2:item2.cloneNode(true));
      }
    }
  }
}

function renewWidgetSpared_(comp,isForce,callback) {
  function doCallback() {
    if (callback) callback();
  }
  
  var currWgt = comp.widget;
  if (!currWgt) return doCallback();  // ignore if unmount
  
  var changed = false, gui = comp.$gui, cssWd = gui.cssWidth, cssHi = gui.cssHeight;
  var useSparedX = gui.useSparedX;
  if (useSparedX) {
    var iWd = getSparedPixel_(comp,currWgt,true,cssWd);  // cssWd maybe null
    if (gui.sparedX !== iWd) {
      gui.sparedX = iWd;
      if (typeof iWd == 'number')
        changed = true;
    }
    else if (isForce) changed = true;
  }
  else if (gui.useSparedY) {
    var iHi = getSparedPixel_(comp,currWgt,false,cssHi); // cssHi maybe null
    if (gui.sparedY !== iHi) {
      gui.sparedY = iHi;
      if (typeof iHi == 'number')
        changed = true;
    }
    else if (isForce) changed = true;
  }
  if (!changed) return doCallback();
  if (typeof cssWd != 'number' && typeof cssHi != 'number') return doCallback(); // width, height both auto, ignore 
  
  var bResize = [];
  gui.comps.forEach( function(item) {
    if (!item) return; // item can be undefined
    var attr = getElementKey_(item);
    if (attr) {
      var child = currWgt[attr];
      child = child && child.component;
      if (child) {
        var iSize = useSparedX ? child.state.width: child.state.height;
        if (typeof iSize == 'number' && iSize < 0) bResize.push(child);
      }
    }
  });
  
  if (bResize.length) {
    setTimeout( function() {  // refresh children in next tick
      var inPending = utils.dragInfo.inDragging;
      bResize.forEach( function(child) {
        if (child.willResizing && !child.willResizing(cssWd,cssHi,inPending)) return; // cssWd or cssHi maybe not a number
        child.setState({parentWidth:cssWd, parentHeight:cssHi, id__:identicalId()});
      });
    },0);
  }
  doCallback(); // run callback in current tick
}
creator.renewWidgetSpared = renewWidgetSpared_;

function triggerExprFn_(value,oldValue) { // will auto bind this
  var isOK = false;
  if (value) {
    var tp = typeof value;
    if (tp == 'string') {
      value = [value];
      isOK = true;
    }
    else if (tp == 'object') {
      if (Array.isArray(value)) {
        var modifier;
        if (typeof value[0] == 'string' && (typeof (modifier=value[1]) == 'object')) {
          if (typeof modifier.$trigger != 'string') // value is [sPath,modifier]
            value = [value];
          // else, value is action array, not copy by value.slice(0)
        }
        // else, value is action array
        isOK = true;
      }
      else if (typeof value.$trigger == 'string') {
        value = [value];      // newOpt for pop window
        isOK = true;
      }
    }
  }
  if (!isOK)
    throw new Error('invalid trigger data (key=' + this.$gui.keyid + ')');
  
  this.state.trigger = value; // default not fire action
}

var _hyphenPattern = /-(.)/g;

class TWidget_ {
  constructor(name,desc) {
    this._className = name;
    this._classDesc = desc || '';
    
    this._statedProp = ['width','height','left','top'];
    this._silentProp = ['className','hookTo.','keyid.','childInline.'];
    this._defaultProp = {width:0.9999, height:0.9999, left:0, top:0};
    this._htmlText = false; // not use 'html.'
    this._docUrl = 'doc';   // locate to: doc/{this._className}.html
  }
  
  _desc() {
    if (this._classDesc)
      return '<' + this._className + ':' + this._classDesc + '>';
    else return '<' + this._className + '>';
  }
  
//_getClasses() {
//  var bRet = [];
//  var cls = this.constructor;
//  while (cls) {
//    bRet.push(cls.name);
//    cls = Object.getPrototypeOf(cls);
//    if (cls === Object.__proto__) break;
//  }
//  return bRet;
//}
  
  _extend(defs) {
    if (typeof defs == 'string') {
      if (W.__design__) // define nothing when in design and called by template._extend(sPath)
        return null;
      defs = W.$main[defs];
      if (!defs) console.log("warning: _extend('" + defs + "') load nothing!");
    } // first, get shadow definition
    
    var savedMethod = this._methods;
    if (!savedMethod) {
      var sKey, dEvent = {}, dSysEvent = {};
      savedMethod = this._methods = { $eventset:[dEvent,dSysEvent] };
      
      var dItem = {}; // not use Object.getOwnPropertyNames(this), babel take methods not-enumerable
      var proto = Object.getPrototypeOf(this);
      while (proto) {
        var owner = Object.getPrototypeOf(proto);
        if (!owner) break; // ignore topmost level's prototype
        Object.getOwnPropertyNames(proto).forEach(function(item) {
          if (item[0] != '_') dItem[item] = true;
        });
        proto = owner;
      }
      
      for (sKey in dItem) {
        if (sKey != 'constructor') {
          var item = this[sKey];
          if (typeof item == 'function') {
            var ch = sKey[0];
            if (ch == '$') {
              var sysEvent = false;
              var evName = sKey[1] == '$' ? (sysEvent = true, sKey.slice(2)) : sKey.slice(1);
              if (supportedEvent_[evName]) {
                if (sysEvent) dSysEvent[evName] = true;
                else dEvent[evName] = true;
              }
            }
            savedMethod[sKey] = item;
          }
        }
      }
      
      savedMethod.getShadowTemplate = (function(template) {
        return function() {
          return template;
        };
      })(this);
    }
    
    var ret = Object.assign({},savedMethod), bTmp = ret.$eventset;
    var dEvent = Object.assign({},bTmp[0]), dSysEvent = Object.assign({},bTmp[1]);
    ret.$eventset = [dEvent,dSysEvent,this._className];
    
    // then, extend customized definition
    if (!defs) defs = {};
    var b = Object.keys(defs);
    for (var i = 0,sKey; sKey = b[i]; i++) { // not heavy since defs.xxx not so many
      var newOne = defs[sKey];
      if (sKey[0] == '$' && typeof newOne == 'function') {
        var sysEvent = false;
        var evName = sKey[1] == '$'? (sysEvent = true, sKey.slice(2)): sKey.slice(1);
        if (supportedEvent_[evName]) {
          if (sysEvent) dSysEvent[evName] = true;
          else dEvent[evName] = true;
        }
      }
      var oldOne = ret[sKey];
      if (typeof oldOne == 'function' && sKey[0] != '_') {
        ret['_' + sKey] = (function(fn) { // change to: _xxx(obj, ...)
          return function(obj) {
            for (var _len = arguments.length, args = Array(_len > 1? _len - 1: 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return fn.apply(obj, args);
          };
        })(oldOne);
      }
      ret[sKey] = newOne;
    }
    
    return ret;
  }
  
  _createClass(defs) {
    if (!defs) { // try reuse cached react class
      var temp = getTemplate_(this._className);
      if (!temp) console.log('fatal error: invalid WTC (' + this._className + ')');
      return temp;
    }
    else return createClass_(this._extend(defs));
  }
  
  _getGroupOpt(self) {
    return { type: 'mono', // mono, extend
      editable: 'all',     // all, some, none
      baseUrl: creator.appBase(),
      tools: [],
    };
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var sPerPixel = '[any]: null for auto, 0~1 for percent, 0.9999 for 100%, N pixels';
    var sPerPixel2 = '[number]: N pixels';
    var sPerPixel3 = '[any]: N pixels, [top_bottom,right_left], [top,right,bottom,left]';
    
    var owner, dRet = { key: [-1,'string'],  // -1 means at top
      left:   [iLevel+1,'any',null,sPerPixel],
      top:    [iLevel+2,'any',null,sPerPixel],
      width:  [iLevel+3,'any',null,sPerPixel],
      height: [iLevel+4,'any',null,sPerPixel],
      minWidth:  [iLevel+5,'number',null,sPerPixel2],
      maxWidth:  [iLevel+6,'number',null,sPerPixel2],
      minHeight: [iLevel+7,'number',null,sPerPixel2],
      maxHeight: [iLevel+8,'number',null,sPerPixel2],
      borderWidth: [iLevel+9,'any',null,sPerPixel3],
      padding:   [iLevel+10,'any',null,sPerPixel3],
      margin:    [iLevel+11,'any',null,sPerPixel3],
    };
    
    if (self && (owner = self.parentOf()) && owner.props['isTableRow.'])
      dRet.tdStyle = [iLevel+12,'object',null,'[object]: style for parent (td)'];
    return dRet;
  }
  
  getDefaultProps() { // warning: this._ not ready yet
    return {
      width: 0.9999,     // means 100%
      height: 0.9999,
      // left: 0, top: 0,
      // minWidth: 0,  maxWidth: 0,  // means not use
      // minHeight: 0, maxHeight: 0,
      // borderWidth: [0,0,0,0],     // top,right,bottom,left
      // padding: [0,0,0,0],
      // margin: [0,0,0,0],
      'childInline.': false
    };
  }
  
  defineDual(attr,setFn,initVal,base) {
    var duals = this.duals, gui = this.$gui;
    if (gui && gui.compState >= 2) {
      console.log('error: can not define duals.' + attr + ' after first render');
      return this;
    }
    if (!duals || !gui) return this;  // fatal error
    
    if (initVal !== undefined)
      gui.initDuals0.push([attr,initVal]);
    
    var bFn, oldDesc = Object.getOwnPropertyDescriptor(duals,attr), warnBase = false;
    if (!oldDesc) {
      if (setFn)
        bFn = dualFuncOfGetSet_(this,attr,null,setFn.bind(this),base);
      else {
        if (base) warnBase = true;
        bFn = dualFuncOfGetSet_(this,attr,null);
      }
      Object.defineProperty(duals,attr, { enumerable:true, configurable:true,
        get:bFn[0], set:bFn[1],
      });
    }
    else {   // oldDesc.set must defined
      if (setFn) { // need embed setFn to oldDesc, but no duplicate trigger listen
        bFn = dualFuncOfGetSet_(this,attr,oldDesc.set,setFn.bind(this),base);
        Object.defineProperty(duals,attr, { enumerable:true, configurable:true,
          get:oldDesc.get, set:bFn[1],
        });
      }
      else { // just reuse oldDesc
        if (base) warnBase = true;
      }
    }
    
    if (warnBase)
      console.log('warning: base.setter should use with setter.');
    return this;   // can write as: this.defineDual(attr1).defineDual(attr2)
  }
  
  undefineDual(attr) {
    var gui = this.$gui, duals = this.duals;
    if (gui && gui.compState >= 2) {
      console.log('error: undefineDual(' + attr + ') only can be called before first render');
      return this;
    }
    if (!duals || !gui) return this;  // fatal error
    
    var b = [gui.initDuals,gui.initDuals0];
    for (var i=0,initDuals; initDuals = b[i]; i++) {
      var idx = initDuals.length - 1;
      while (idx >= 0) {
        if (initDuals[idx][0] === attr)
          initDuals.splice(idx,1);
        idx -= 1;
      }
    }
    delete duals[attr];
    
    return this; // can write as: this.undefineDual(attr1).undefineDual(attr2)
  }
  
  setEvent(evSet) {
    var gui = this.$gui, eventset = gui && gui.eventset;
    if (!gui || !eventset) {
      console.log('error: invalid state for setEvent().');
      return;
    }
    if (gui.compState > 1) {
      console.log('error: can not call setEvent() after first render.');
      return;
    }
    
    var b = Object.keys(evSet);
    for (var i=0,sKey; sKey=b[i]; i++) {
      if (sKey[0] != '$') continue;
      var sKey2 = sKey.slice(1), fn = evSet[sKey];
      if (typeof fn == 'function') {
        if (!eventset[sKey2])
          eventset[sKey2] = fn.bind(this);
        this[sKey] = fn;
      }
    }
  }
  
  getInitialState() {
    // step 1: define template as 'this._'
    var template = this.getShadowTemplate();
    Object.defineProperty(this,'_',{enumerable:false,configurable:false,writable:false,value:template});
    this.isHooked = false;    // like this.isMounted(), but can be used in render()
    this.hideThis = false;
    
    // step 2: define duals, tagAttrs, data-* / aria-*
    this.duals = {};
    var isTopmost = utils.widgetNum() == 0;
    var gui = { inSync:false, removeNum:0, className:this.props.className || '', compState:0,
      duals:{}, initDuals:[], initDuals0:[], // save duals.attr for prop-watching
      connectTo:{}, connectBy:{},
      id__:0, id2__:0,        // id2__ != 0 means 'duals.id__ = xx' in assigning
      sparedX:null, sparedY:null,
    };
    
    var eventset  = gui.eventset = {};  // regist event callback
    var tagAttrs  = gui.tagAttrs = [];  // list tag-attribute
    var dualAttrs = gui.dualAttrs = {}; // {attrName:'dual-attr-name'}
    var dataset   = gui.dataset = [];   // list data-* aria-*
    var exprAttrs = gui.exprAttrs = []; // list $attr, will adjust to { attr:updateExpr(comp) } before first render
    var pathAttr = '', pathValue = '', flowFlag = '';
    gui.forExpr = false; gui.hasIdSetter = false;
    
    var currEvSet = {}, evSet_=this.$eventset || [{},{}], evSet=evSet_[0], sysEvSet=evSet_[1];
    delete this.$eventset; // $eventset is passed in _extend()
    
    var dualIdSetter = null;
    var b = Object.keys(this.props);
    for (var i = 0, item; item = b[i]; i++) {
      if (item.indexOf('data-') == 0) {
        if (item == 'data-unit.path' || item == 'data-span.path') {
          pathAttr = item;
          pathValue = this.props[item];
        }
        dataset.push(item);
      }
      else if (item.indexOf('dual-') == 0) {
        var dualKey = item.slice(5).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });
        if (dualKey) dualAttrs[dualKey] = item;
      }
      else if (item.indexOf('aria-') == 0)
        dataset.push(item);
      else if (item[0] == '$' && item.length > 1) {
        var itemValue = this.props[item], tp = typeof itemValue;
        if (tp == 'string') {
          if (item == '$id__') {
            itemValue = idSetter[itemValue];
            tp = typeof itemValue;  // wait process if tp == 'function'
          }
          else {
            var isRFor = false;
            item = item.slice(1);
            if (item == '$for') {  // $$for
              item = 'for';
              isRFor = true;
            }
            if (ctrlExprCmd_.indexOf(item) >= 0) {  // item: for if elif else
              if (item == 'for') {
                if (gui.forExpr)
                  console.log('warning: reduplicate property ($for)');
                else {
                  gui.forExpr = isRFor? 2: 1;  // flowFlag is ''
                  exprAttrs.push(item); // only add one $for
                }
                if (isTopmost) console.log("error: can not use '$for' in topmost widget");
              }
              else {
                if (flowFlag)  // report erro and ignore current
                  console.log('error: property ($' + item + ') conflict with previous ($' + flowFlag + ')');
                else {
                  flowFlag = item;
                  if (item != 'else')
                    exprAttrs.push(item);
                }
              }
            }
            else {
              if (item == 'children') {
                if (this.props.hasOwnProperty('for.index')) { // $children only used under forExpr
                  gui.isChildExpr = true;
                  gui.children2 = this.props.children;
                }
              }
              else if (item != 'key') // use $key, $children as normal prop, updated in parent for-loop
                exprAttrs.push(item);
            }
            continue;
          }
        }
        
        if (tp == 'function') {
          if (item[1] == '$') { // not support $$onEvent
            console.log('warning: invalid using props.' + item);
            continue;
          }
          
          item = item.slice(1);
          if (item == 'id__') { // pass setter by props.$id__
            dualIdSetter = itemValue;  // will bind this in defineDual('id__')
            gui.hasIdSetter = true;
          }
          else if (!sysEvSet[item])
            currEvSet[item] = itemValue.bind(this);
          // else, ignore
        }
        // else ignore  // $XX only can be string or function, ignore others
      }
      else {
        var iFlag = supportedAttr_[item];
        if (iFlag && iFlag != 5) // 5: className/style/width/height
          tagAttrs.push(item);
      }
    }
    gui.flowFlag = flowFlag;
    gui.dataset2 = dataset.slice(0);
    
    // step 3: setup gui.eventset
    for (var sEvName in evSet) {
      eventset[sEvName] = this['$' + sEvName];
    }
    for (var sEvName in currEvSet) {
      eventset[sEvName] = currEvSet[sEvName];
    }
    for (var sEvName in sysEvSet) {
      eventset[sEvName] = this['$$' + sEvName];
    }
    
    // step 4: prepare dState
    if (isTopmost) // topmost can not be panel, NOT render children as flex
      gui.className = removeClass_(gui.className, ['rewgt-panel', 'row-reverse', 'reverse-row', 'col-reverse', 'reverse-col']);
    Object.defineProperty(this,'$gui',{enumerable:false,configurable:false,writable:false,value:gui});
    var dState = { id__:0, childNumId:0, duals:[], exprAttrs:exprAttrs.slice(0) }; // state.duals = [[attr,newValue], ...]
    if (W.__design__) {
      var d = template._getGroupOpt(this); // has hooked, this.widget should be OK
      dState['data-group.opt'] = d.type + '/' + d.editable; // no props['data-group.opt'], also not in $gui.dataset
    }
    
    // step 5: hook parent widget
    var keyid = this.props['keyid.'];
    if (isTopmost && !keyid) keyid = 'body';
    if (keyid) {
      var keyTp = typeof keyid;
      if (keyTp != 'string' && keyTp != 'number') keyid = undefined; // change to use automatic number keyid
    }
    
    var owner = this.props['hookTo.'];
    if (isTopmost && !owner) owner = W;
    if (typeof owner == 'string')
      owner = W.W(owner); // can be W.W('')
    if (Array.isArray(owner) && owner.W) { // exists owner widget
      if (keyid !== undefined)
        owner.$set(keyid,owner.W(this));
      else keyid = owner.push(owner.W(this)) - 1;
      gui.keyid = keyid;
    }
    
    // step 6: setup frame property, such as: left, top, width, height
    Object.assign(dState, { left:0, top:0, width:null, height:null,
      minWidth:0, maxWidth:0, minHeight:0, maxHeight:0,
      borderWidth:[0,0,0,0], padding:[0,0,0,0], margin:[0,0,0,0],
      klass:'', style:{},
    });
    
    var isPanelWdgt = gui.isPanel = hasClass_(gui.className,'rewgt-panel'); // gui.isPanel is fixed
    var checkRow = false, checkCol = false;        // fixed, no changing
    var childInline = this.props['childInline.'];  // fixed
    if (!childInline && !isTopmost && isPanelWdgt) {
      if (hasClass_(gui.className + ' ' + this.props.klass, ['col-reverse', 'reverse-col']))
        checkCol = true;
      else checkRow = true;
    }
    gui.useSparedX  = false; gui.useSparedY = false; gui.respared = false;
    gui.sparedTotal = 0;     // 0 means not use
    gui.compIdx = {}; gui.comps = children2Arr_(this.props.children);
    
    Object.defineProperty(this.duals,'keyid', { enumerable:true, configurable:true,
      get: (function() {
        return this.$gui.keyid;
      }).bind(this),
      set: function(value,oldValue) { // no need bind this
        throw new Error('property (keyid) is readonly');
      },
    });
    
    this.defineDual('klass', function(value,oldValue) {
      this.state.klass = value || '';
    });
    this.defineDual('style', function(value,oldValue) {
      this.state.style = Object.assign({},oldValue,value);
    });
    this.defineDual('left', function(value,oldValue) {
      this.state.left = isNaN(value)? null: value; // isNaN(null) is false
    });
    this.defineDual('top', function(value,oldValue) {
      this.state.top = isNaN(value)? null: value;
    });
    this.defineDual('width', function(value,oldValue) {
      var newValue, isNum = false;
      if (isNaN(value))
        newValue = null;
      else {
        newValue = value
        if (value !== null) isNum = true;
      }
      this.state.width = newValue;
      
      if (isNum) {
        var owner = this.parentOf();
        if (owner && owner.$gui.useSparedX)
          renewWidgetSpared_(owner,false);
      }
    });
    this.defineDual('height', function(value,oldValue) {
      var newValue, isNum = false;
      if (isNaN(value))
        newValue = null;
      else {
        newValue = value
        if (value !== null) isNum = true;
      }
      this.state.height = newValue;
      
      if (isNum) {
        var owner = this.parentOf();
        if (owner && owner.$gui.useSparedY)
          renewWidgetSpared_(owner,false);
      }
    });
    this.defineDual('minWidth', function(value,oldValue) {
      var i = value || 0;  // can not be null
      if (i > 0 && this.state.maxWidth > 0 && this.state.maxWidth < i) {
        console.log('warning: invalid widget minWidth or maxWidth');
        return;
      }
      this.state.minWidth = i;
    });
    this.defineDual('maxWidth', function(value,oldValue) {
      var i = value || 0;
      if (i > 0 && this.state.minWidth > 0 && this.state.minWidth > i) {
        console.log('warning: invalid widget minWidth or maxWidth');
        return;
      }
      this.state.maxWidth = i;
    });
    this.defineDual('minHeight', function(value,oldValue) {
      var i = value || 0;
      if (i > 0 && this.state.maxHeight > 0 && this.state.maxHeight < i) {
        console.log('warning: invalid widget minHeight or maxHeight');
        return;
      }
      this.state.minHeight = i;
    });
    this.defineDual('maxHeight', function(value,oldValue) {
      var i = value || 0;
      if (i > 0 && this.state.minHeight > 0 && this.state.minHeight > i) {
        console.log('warning: invalid widget minHeight or maxHeight');
        return;
      }
      this.state.maxHeight = i;
    });
    this.defineDual('borderWidth', function(value,oldValue) {
      var oldV = oldValue || [0,0,0,0];
      var newV = this.state.borderWidth = parseWidth(value);
      
      var changed = false;
      if (this.$gui.useSparedX) {
        if (oldV[1] !== newV[1] || oldV[3] !== newV[3])
          changed = true;
      }
      else if (this.$gui.useSparedY) {
        if (oldV[0] !== newV[0] || oldV[2] !== newV[2])
          changed = true;
      }
      if (changed) renewWidgetSpared_(this,false);
    });
    this.defineDual('padding', function(value,oldValue) {
      var oldV = oldValue || [0,0,0,0];
      var newV = this.state.padding = parseWidth(value);
      
      var changed = false;
      if (this.$gui.useSparedX) {
        if (oldV[1] !== newV[1] || oldV[3] !== newV[3])
          changed = true;
      }
      else if (this.$gui.useSparedY) {
        if (oldV[0] !== newV[0] || oldV[2] !== newV[2])
          changed = true;
      }
      if (changed) renewWidgetSpared_(this,false);
    });
    this.defineDual('margin', function(value,oldValue) {
      this.state.margin = parseWidth(value);
    });
    this.defineDual('id__', function(value,oldValue) { // should not use props.id__
      this.state.id__ = value;      // is first render when oldValue == 0
      gui.id__ = gui.id2__ = value;
    });  // default this.state.id__ is 0
    if (dualIdSetter) this.defineDual('id__',dualIdSetter);
    
    this.defineDual('trigger',triggerExprFn_); // default value is undefined
    this.defineDual('cellSpacing'); // will override in GridPanel
    this.defineDual('sizes');       // will override in GridPanel
    
    if (owner) {
      var ownerObj = owner && owner.component;
      if (ownerObj) {
        if (ownerObj.props['isTableRow.']) {
          if (this.props.tdStyle) {
            this.defineDual('tdStyle', function(value,oldValue) {
              this.state.tdStyle = Object.assign({},oldValue,value);
              setTimeout( function() {
                ownerObj.reRender();
              },0);
            },this.props.tdStyle);
          }
          if (this.props.colSpan) {
            this.defineDual('colSpan', function(value,oldValue) {
              this.state.colSpan = value;
              setTimeout( function() {
                ownerObj.reRender();
              },0);
            },this.props.colSpan);
          }
          if (this.props.rowSpan) {
            this.defineDual('rowSpan', function(value,oldValue) {
              this.state.rowSpan = value;
              setTimeout( function() {
                ownerObj.reRender();
              },0);
            },this.props.rowSpan);
          }
        }
        
        if (ownerObj.props['isScenePage.'])
          gui.inScene = true;  // not used yet, for extending
      }
    }
    
    // step 7: setup parentWidth, parentHeight, init topmost also
    gui.cssWidth = null; gui.cssHeight = null; // null means auto, will set in prepareState()
    var ownerWd = null, ownerHi = null;
    
    var hookThis = this.widget;
    if (owner && hookThis) {
      if (pathAttr) {
        hookThis.$callspace = {flowFlag:'ref',forSpace:null};
        hookThis.$callspace[pathAttr] = pathValue;
        var exprSpace = hookThis.$callspace.exprSpace = {};
        setupExprSpace(exprSpace,this);
      }
      
      if (isTopmost) { // if is first widget, take as topmost panel
        topmostWidget_ = creator.topmostWidget_ = hookThis;
        containNode_ = creator.containNode_ = document.getElementById('react-container');
        if (!containNode_) console.log("fatal error: can not find 'react-container' node.");
      }
      if (isTopmost && containNode_) {
        if (W.__design__) {
          containNode_.style.zIndex = '3000';  // containNode_(3000) -> haloFrame(3010) --> popupWindow(3016)
          // to -1000 let thumbnail preview in showing, hidden for easy editing
          this.duals.style = {zIndex:'-1000',overflow:'hidden'}; // will append to gui.initDuals
        }
        
        var frameInfo = containNode_.frameInfo;
        if (!frameInfo)
          frameInfo = containNode_.frameInfo = {topHi:0,leftWd:0,rightWd:0,bottomHi:0};
        frameInfo.rootName = '.' + keyid;
        
        var refreshFrame = (function() {
          var iWd = Math.max(100,window.innerWidth - frameInfo.leftWd - frameInfo.rightWd);
          var iHi = Math.max(100,window.innerHeight - frameInfo.topHi - frameInfo.bottomHi);
          var oldSize = this.state.innerSize, newSize = [iWd,iHi];
          
          this.setState({
            left: frameInfo.leftWd, top: frameInfo.topHi,
            parentWidth: iWd, parentHeight: iHi, innerSize: newSize,
          });
          
          if (this.duals.hasOwnProperty('innerSize')) { // can not assign duals.innerSize, but can trigger listen
            var bConn = gui.connectTo['innerSize'];
            if (bConn && gui.compState >= 2) { // not trigger when first render
              setTimeout( function() {
                triggerConnTo_(bConn,newSize,oldSize,'innerSize');
              },0);
            }
          }
        }).bind(this);
        
        containNode_.refreshFrame = refreshFrame;
        setupContainerApi_(containNode_);
        
        //-------------------
        var onResizeEnd = function() {
          utils.dragInfo.inDragging = false;
          utils.dragInfo.justResized = true; // if winJustDragged, should force children re-render
          setTimeout(function() {
            utils.dragInfo.justResized = false;
          }, 1200);
          
          refreshFrame();
        };
        
        var resizeTimer = 0;
        gui.onWinResize = function(event) {
          function doResize() {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(onResizeEnd, 500);
          }
          
          utils.dragInfo.inDragging = true;
          doResize();
          refreshFrame();
        }; // only topmost widget has onWinResize
        
        this.duals.style = Object.assign({},this.props.style,{position:'absolute'}); // fix to absolute
        this.duals.left = frameInfo.leftWd;        // props.left will be ignored
        this.duals.top = frameInfo.topHi;
        ownerWd = Math.max(100,window.innerWidth - frameInfo.leftWd - frameInfo.rightWd);
        ownerHi = Math.max(100,window.innerHeight - frameInfo.topHi - frameInfo.bottomHi);
      }
      else {
        var ownerObj_ = owner.component;
        if (ownerObj_) {
          ownerWd = ownerObj_.$gui.cssWidth;
          ownerHi = ownerObj_.$gui.cssHeight;
        } // else, ownerWd = null, ownerHi = null, means 'auto'
      }
    }
    dState.parentWidth = ownerWd;
    dState.parentHeight = ownerHi;
    
    // step 8: setup comps, compIdx
    this.defineDual('childNumId', function(newNumId,oldNumId) { // if no props.children, newNumId will be 0, setter will not called
      // this.state.childNumId = newNumId;  // must be auto assigned
      
      var thisObj = this;
      var hookThis = thisObj.widget;
      if (!hookThis) return;  // fatal error
      
      var bColumn = thisObj.state.sizes, useSizes = Array.isArray(bColumn);
      var compIdx = gui.compIdx, bComp = gui.comps, isScenePage = thisObj.props['isScenePage.'];
      var hasAuto = false, hasNeValue = false, sparedTotal = 0;
      
      bComp.forEach( function(child,iPos) {
        if (typeof child == 'string') {
          if (iPos == 0 && bComp.length == 1 && thisObj.duals.hasOwnProperty('html.')) {
            thisObj.state['html.'] = child;
            bComp[iPos] = undefined;
            return;
          }
          if (!childInline) {
            bComp[iPos] = undefined;
            return;
          }
          child = bComp[iPos] = reactCreate_(Span__,{'html.':child}); // auto change to React Element
        }
        else if (!child) return;
        
        var keyid, sKey = getElementKey_(child), isOld = false;
        if (sKey) {
          var iTmp = parseInt(sKey);
          if ((iTmp+'') === sKey)
            keyid = iTmp;
          else keyid = sKey;
          
          if (typeof compIdx[sKey] == 'number')  // history exists
            isOld = true;
        }
        else {
          keyid = iPos + gui.removeNum;
          sKey = keyid + '';
        }
        
        if (hasClass_(child.props.className, 'rewgt-static')) {
          if (isOld) {
            compIdx[keyid] = iPos; // maybe position changed
            return;
          }
          
          if (!isPanelWdgt) {
            var dProp = Object.assign({},child.props);
            // dProp['keyid.'] = keyid;
            dProp.key = sKey;
            if (W.__design__ && !(thisObj.props['$for'] || thisObj.props['$$for'])) {
              dProp.onMouseDown = staticMouseDown;
              dProp.onDoubleClick = staticDbClick.bind(thisObj);
            }
            compIdx[keyid] = iPos;
            if (childInline) // div.rewgt-static --> span.rewgt-static
              bComp[iPos] = reactCreate_('span',dProp);
            else bComp[iPos] = reactCreate_('div',dProp); // reactClone_(child, dProp);
          }
          else {  // can not add rewgt-static to panel widget
            bComp[iPos] = undefined;
            console.log('warning: can not add rewgt-static to panel (' + hookThis.getPath() + ') directly.');
          }
          return; // adjust nothing on rewgt-static widget
        }
        
        var childInline2 = child.props['childInline.'];
        if (childInline2 !== undefined) { // not pure react element (such as: <div>)
          if (childInline) {  // <noscript> should not use as its child
            if (!childInline2) {
              console.log('error: can not add panel or div (' + sKey + ') to paragraph (' + hookThis.getPath() + ').');
              bComp[iPos] = undefined;  // must not isOld
              return;
            }
          }
          else { // if not childInline, only support rewget-static/rewgt-panel/rewgt-unit
            if (!hasClass_(child.props.className, ['rewgt-panel', 'rewgt-unit'])) {
              console.log('error: only panel, div, paragraph (' + keyid + ') can add to panel or div (' + hookThis.getPath() + ').');
              bComp[iPos] = undefined;  // must not isOld
              return;
            }
          }
        }
        else {   // is pure react element, no checking
          compIdx[keyid] = iPos;
          if (!isOld)
            bComp[iPos] = reactClone_(child,{key:sKey}); // not pass 'keyid.' to avoid react warning
          return;
        }
        
        var isRef = false; 
        if (child.props['isReference.']) {
          isRef = true;
          if (!isOld) {
            if (sKey[0] != '$')
              sKey = keyid = '$' + sKey;
            // else, keyid and key prefixed with '$'
            
            if (inFirstLoading_)
              pendingRefers_.push([thisObj,keyid]);
          }
        }
        
        var wd = child.props.width, hi = child.props.height;
        var wdAuto_ = typeof wd != 'number', hiAuto_ = typeof hi != 'number';
        if (checkRow) {
          if (!wdAuto_) {
            if (wd < 0 && !isRef) {
              hasNeValue = true;
              sparedTotal += -wd;
            }
          }
          else hasAuto = true; // not number, take as 'auto'
        }
        else if (checkCol) {
          if (!hiAuto_) {
            if (hi < 0 && !isRef) {
              hasNeValue = true;
              sparedTotal += -hi;
            }
          }
          else hasAuto = true;
        }
        else {
          var sErrWdHi = ''
          if (!wdAuto_ && wd < 0)
            sErrWdHi = 'width';
          else if (!hiAuto_ && hi < 0)
            sErrWdHi = 'height';
          if (sErrWdHi)
            console.log('error: can not use negative ' + sErrWdHi + ' under widget (' + hookThis.getPath() + ')');
        }
        
        if (isOld && child.props['hookTo.'] !== hookThis)
          isOld = false;
        if (isOld)               // reuse old, no need cloneElement()
          compIdx[keyid] = iPos; // maybe position changed
        else {
          var props = { 'hookTo.':hookThis, key:sKey, 'keyid.':keyid };
          if (!childInline) {    // panel or unit
            props.width = wdAuto_?null:wd;  // also perform check in duals.width, set here to help spared-space caculating
            props.height = hiAuto_?null:hi;
            if (isTopmost && child.props['isScenePage.'] && child.props.noShow && !W.__design__)
              props['isTemplate.'] = true;
          }
          else { // paragraph (div p li h1 blockquote ...) or inline widget, convert width/height to style.width/height
            var isPara = hasClass_(child.props.className,'rewgt-unit');
            if (!wdAuto_ && wd >= 0) { // for inline widget, suggest no using props.width/height, while used also OK, just convert it to style
              var childWd_ = wd >= 1? wd + 'px': (wd >= 0.9999? '100%': (wd*100)+'%');
              props.style = Object.assign({},child.props.style,{width:childWd_});
              if (isPara) props.width = wd; // for paragraph, still use props.width, no use for inline widget
            }
            else {
              if (isPara) props.width = null;
            }
            if (!hiAuto_ && hi >= 0) {
              var childHi_ = hi >= 1? hi + 'px': (hi >= 0.9999? '100%': (hi*100)+'%');
              props.style = Object.assign({},child.props.style,{height:childHi_});
              if (isPara) props.height = hi;
            }
            else {
              if (isPara) props.height = null;
            }
          }
          
          if (isScenePage) {
            var dStyle2 = Object.assign({},child.props.style), sLevel = (parseInt(dStyle2.zIndex) || 0) + '';
            if (sLevel !== '0') dStyle2.zIndex = sLevel;
            props.style = dStyle2;
          }
          else {
            if (W.__debug__ && !isTopmost && gui.isPanel) {
              if ((props.style || {}).display == 'absolute')
                console.log("warning: can not use 'display:absolute' under a panel");
            }
          }
          
          compIdx[keyid] = iPos;
          bComp[iPos] = reactClone_(child,props); // width/height should pass parseFloat() for scaning spared space
        }
      });  // end of bComp.forEach()
      
      if (!useSizes) {
        if (hasNeValue && !hasAuto) {
          if (sparedTotal > 0 || gui.useSparedX != checkRow || gui.useSparedY != checkCol)
            gui.respared = true;
          gui.sparedTotal = sparedTotal;
          gui.useSparedX = checkRow;
          gui.useSparedY = checkCol;
        }
        else {
          gui.sparedTotal = 0;
          gui.useSparedX = false;
          gui.useSparedY = false;
        }
      }
      
      if (isTopmost && oldNumId == 0) {
        compIdx['$pop'] = bComp.length + gui.removeNum;
        bComp.push( reactCreate_(createClass_(T.Panel._extend()),{'hookTo.':hookThis, key:'$pop', 'keyid.':'$pop',
          left:0, top:0, width:0, height:0,
          style:{position:'absolute',zIndex:3016,overflow:'visible'}, 
        }));
      }
    });
    
    return dState;
    
    function parseWidth(b) {
      if (!Array.isArray(b)) {
        if (typeof b == 'number')
          return [b, b, b, b];
        else return [0, 0, 0, 0];
      }
      
      var iLen = b.length;
      if (iLen == 0)
        return [0, 0, 0, 0];
      else if (iLen == 1) {
        var i = parseFloat(b[0]) || 0;
        return [i, i, i, i];
      }
      else if (iLen == 2) {
        var i = parseFloat(b[0]) || 0, i2 = parseFloat(b[1]) || 0;
        return [i, i2, i, i2];
      }
      else if (iLen == 3) {
        var i = parseFloat(b[0]) || 0, i2 = parseFloat(b[1]) || 0, i3 = parseFloat(b[2]) || 0;
        return [i, i2, i3, i2];
      }
      else return [parseFloat(b[0]) || 0, parseFloat(b[1]) || 0, parseFloat(b[2]) || 0, parseFloat(b[3]) || 0];
    }
  }
  
  shouldComponentUpdate(nextProps,nextState) {
    return utils.shouldUpdate(this,nextProps,nextState);
  }
  
  componentWillReceiveProps(nextProps) {
    var gui = this.$gui, duals = this.duals, duals0 = gui.duals;
    var b = Object.keys(duals);
    
    for (var i=0,sKey; sKey=b[i]; i++) { // if use props['$attr'], it must no props['attr']
      var item = nextProps[sKey];  // can not pass props.id__
      if (item === undefined) {    // props[expr] must be 'undefined' for $expr
        var sKey_ = gui.dualAttrs[sKey]; // attr --> dual-attr
        if (sKey_) {
          item = nextProps[sKey_]; // try props['dual-*']
          if (item === undefined)
            continue;
          // else, checking props['dual-*']
        }
        else continue;
      }
      
      if (item !== duals0[sKey])   // props.attr has changed
        duals[sKey] = duals0[sKey] = item;  // record prop.xxx, and assign duals.xxx
    }
  }
  
  componentDidMount() {
    this.isHooked = !!this.widget;
    
    if (this.props['hasStatic.'])
      renewStaticChild(this);
    
    var gui = this.$gui;
    if (gui.syncExpr) { // $expr='all: ...'  or  $expr='strict: ...'
      var item;
      while (item = gui.syncExpr.shift()) { // item is [sKey,fn]
        gui.exprAttrs[item[0]] = item[1];
      }
      delete gui.syncExpr;
    }
    
    var dSubStyles = this.props.styles;
    if (dSubStyles && (this.props['data-span.path'] || this.props['data-unit.path'])) {
      var thisObj = this;
      Object.keys(dSubStyles).forEach( function(sPath) {
        var dStyle = dSubStyles[sPath];
        if (typeof dStyle == 'object' && sPath) {
          var comp = thisObj.componentOf(sPath);
          if (comp) comp.duals.style = dStyle;
        }
      });
    }
    
    if (gui.hasIdSetter)
      this.duals.id__ = 2;  // gui.id__ = 2;
  }
  
  componentWillUnmount() {
    if (W.__debug__ && typeof this.teardown__ == 'function') {
      try {
        this.teardown__();
      }
      catch(e) { console.log(e); }
    }
    
    var gui = this.$gui;
    if (gui.hasIdSetter)
      this.duals.id__ = 0;  // gui.id__ = gui.id2__ = 0;
    
    var bKey = Object.keys(gui.connectBy), bRmv = [];
    for (var i=0,item; item = bKey[i]; i++) {
      var b = gui.connectBy[item], sour = b[0];
      if (sour !== this && bRmv.indexOf(sour) < 0)
        bRmv.push(sour);
    }
    for (var i=0,sour; sour = bRmv[i]; i++) {
      sour.unlisten('*',this);
    }
    gui.connectTo = {};
    gui.connectBy = {};
    gui.compState = 0;
    
    if (Array.isArray(this.widget)) {
      var owner = this.widget.parent;
      if (Array.isArray(owner)) { // owner still available
        var keyid = gui.keyid, ownerObj = owner.component;
        if (ownerObj) {
          var gui2 = ownerObj.$gui;
          if (!gui2.flowFlag && !gui2.forExpr) { // ignore $for $if $elif $else
            var idx = gui2.compIdx[keyid];
            if (typeof idx == 'number') {
              delete gui2.comps[idx];      // set undefined, can not re-mount
              delete gui2.compIdx[keyid];
            }
          }
        }
        owner.$unhook(this.widget,keyid);  // unhook widget suite, keyid maybe undefined
      }
      
      delete this.widget.component;
      delete this.widget;
    }
    
    this.isHooked = false;
  }
  
  reRender(callback,data) { // default data is undefined
    if (this.isHooked) {
      if (this.$gui.inSync) {
        var self = this;
        setTimeout( function() {
          var newId = self.state.id__ === identicalId_? identicalId(): identicalId_;
          var data2 = Object.assign({},data,{id__:newId});
          self.setState(data2,callback);
        },0);
      }
      else {
        var newId = this.state.id__ === identicalId_? identicalId(): identicalId_;
        var data2 = Object.assign({},data,{id__:newId});
        this.setState(data2,callback);
      }
    }
    else {
      if (this.state.id__ != 1)
        console.log('warning: reRender() failed when component unhooked.');
      if (callback) callback();
    }
  }
  
  listen(actions,targ,sMethod) {
    var gui = this.$gui, self = this;
    
    function checkDualAttr(sKey) {
      var oldDesc = Object.getOwnPropertyDescriptor(self.duals,sKey);
      if (oldDesc) return true;
      
      if (self.props['$' + sKey]) {  // '$data' '$data-xx' '$dualAttr' '$expr'
        if (ctrlExprCmd_.indexOf(sKey) > 0)  // $if $elif $else  // can listen '$for'
          console.log("warning: '" + sKey + "' is not listenable.");
        // else, all other :expr is listenable
        return true;
      }
      else if (gui.dataset.indexOf(sKey) >= 0 || gui.tagAttrs.indexOf(sKey) >= 0 || gui.dualAttrs.hasOwnProperty(sKey)) {
        var bFn = dualFuncOfGetSet_(self,sKey); // no super setter and no custom setter
        Object.defineProperty(self.duals,sKey, { enumerable:true, configurable:true,
          get:bFn[0], set:bFn[1],
        });
        return true;
      }
      else return false;
    }
    
    if (typeof targ == 'function') {
      var bAction;
      if (Array.isArray(actions))
        bAction = actions;
      else if (typeof actions == 'string' && actions)
        bAction = [actions];
      else {
        console.log('warning: invalid listen source.');
        return this;
      }
      
      for (var i=0,sName; sName=bAction[i]; i++) {
        if (!checkDualAttr(sName)) {
          console.log('warning: listen source (' + sName + ') inexistent.');
          continue;
        }
      
        var b = gui.connectTo[sName]; // actions is one action name
        if (!b) b = gui.connectTo[sName] = [];
        b.push([null,targ,false]);  // null means self, targ is function (already located)
      }
      return this;
    }
    // else, define function by targ[sMethod]
    
    if (!targ || !targ.$gui) {
      console.log('warning: invalid listen target.');
      return this;
    }
    
    var tp, bAction = [];
    if (Array.isArray(actions)) {
      actions.forEach( function(item) {
        var sName = ('on-'+item).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });
        bAction.push([item,sName]);
      });
    }
    else if ((tp = typeof actions) == 'string') {
      if (!sMethod || typeof sMethod != 'string') {
        sMethod = ('on-'+actions).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });  // data-attr   --> onDataAttr
        bAction.push([actions,sMethod]);
      }
      else bAction.push([actions,sMethod,sMethod]); // can try targ.duals[sMethod]
    }
    else if (action && tp == 'object') {
      Object.keys(actions).forEach( function(item) {
        bAction.push([item,actions[item]]);
      });
    }
    else return this; // fatal error
    
    bAction.forEach( function(item) {
      var sSrcName = item[0], sTarName = item[1], isDual = false;
      if (!sSrcName || !checkDualAttr(sSrcName)) {
        console.log('warning: listen source (' + sSrcName + ') inexistent.');
        return;
      }
      
      if (typeof targ[sTarName] != 'function') {
        var sDualName = item[2];
        if (sDualName && targ.duals.hasOwnProperty(sDualName)) {
          if (sDualName === sSrcName && targ === self) {
            console.log('warning: can not connect dual (' + sSrcName + ') to self.');
            return;
          }
          isDual = true; // comp.listen('action',targ,attr) // connect to targ.duals.attr
          sTarName = sDualName;
        }
        else {
          console.log('warning: invalid listen target (' + sTarName + ').');
          return;
        }
      }
      
      var targConnBy = targ.$gui.connectBy;
      var iPos = -1, b = targConnBy[sTarName];  // connectBy: {sTarName:[[srcComp,sSrcAction,isDual],...]}
      if (b) {
        iPos = b.findIndex(function(a){return a[0] === self && a[1] === sSrcName});
        if (iPos >= 0)
          b[iPos][2] = isDual;     // maybe isDual changed
      }
      else b = targConnBy[sTarName] = [];
      if (iPos < 0) b.push([self,sSrcName,isDual]);
      
      iPos = -1;
      b = gui.connectTo[sSrcName]; // connectTo:{sSrcAction:[[tarComp,sTarMethodOrAction,isDual],...]}
      if (b) {
        iPos = b.findIndex(function(a){return a[0] === targ && a[1] === sTarName});
        if (iPos >= 0)
          b[iPos][2] = isDual;     // maybe isDual changed
      }
      else b = gui.connectTo[sSrcName] = [];
      if (iPos < 0) b.push([targ,sTarName,isDual]);
    });
    
    return this;
  }
  
  unlisten(actions,targ,sMethod) {
    if (typeof targ == 'function') {
      if (typeof actions != 'string' || !actions) {
        console.log('warning: invalid unlisten source.');
        return this;
      }
      
      var gui = this.$gui, b = gui.connectTo[actions];
      if (b) {
        var iPos = b.findIndex(function(a){return a[0] === null && a[1] === targ});
        if (iPos >= 0) {
          b.splice(iPos,1);
          if (b.length == 0)
            delete gui.connectTo[actions];
        }
      }
      return this;
    }
    
    if (!targ || !targ.$gui) {
      console.log('warning: invalid unlisten target.');
      return this;
    }
    
    var tp, bAction = [], gui = this.$gui, self = this;
    if (Array.isArray(actions)) {
      actions.forEach( function(item) {
        var sName = ('on-'+item).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });
        bAction.push([item,sName]);
      });
    }
    else if ((tp = typeof actions) == 'string') {
      if (actions == '*') {    // use this when targ unhooked
        var d = gui.connectTo;
        Object.keys(d).forEach( function(item) {
          var idx, b = d[item];
          if (b && (idx = b.length) > 0) {
            while (--idx >= 0) {
              var b2 = b[idx];
              if (b2[0] === targ) b.splice(idx,1);
            }
            if (b.length == 0) delete d[item];
          }
        });
        return this;
      }
      
      if (!sMethod || typeof sMethod != 'string') {
        sMethod = ('on-'+actions).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });  // data-attr   --> onDataAttr
      }
      else if (sMethod == '*') {
        var idx, d = gui.connectTo, b = d[actions];
        if (b && (idx = b.length) > 0) {
          while (--idx >= 0) {
            var b2 = b[idx];
            if (b2[0] === targ) b.splice(idx,1);
          }
          if (b.length == 0) delete d[actions];
        }
        return this;
      }
      bAction.push([actions,sMethod]);
    }
    else if (action && tp == 'object') {
      Object.keys(actions).forEach( function(item) {
        bAction.push([item,actions[item]]);
      });
    }
    else return this; // fatal error
    
    bAction.forEach( function(item) {
      var sSrcName = item[0], sTarName = item[1];
      var b = gui.connectTo[sSrcName];   // connectTo:{sSrcAction:[[tarComp,sTarMethodOrAction],...]}
      if (b) {
        var iPos = b.findIndex(function(a){return a[0] === targ && a[1] === sTarName});
        if (iPos >= 0) {
          b.splice(iPos,1);
          if (b.length == 0)
            delete gui.connectTo[sSrcName];
        }
      }
    });
    
    return this;
  }
  
  getHtmlNode(component) {
    return findDomNode_(component || this);
  }
  
  parentOf() {
    var wdgt = this.widget, owner = wdgt && wdgt.parent;
    var ownerObj = owner && owner.component;
    return ownerObj || null;
  }
  
  componentOf(sPath) {
    var tp = typeof sPath;
    if (tp == 'number') {
      var bInfo = [], ownerObj = findComponent_(this,sPath,bInfo,0);
      if (!ownerObj || !bInfo[1]) {  // bInfo[1] is callspace
        console.log('warning: locate callspace (' + sPath + ') failed.');
        return null;
      }
      else return ownerObj;
    }
    else if (tp != 'string') return null;
    
    var ch = sPath[0];
    if (ch != '.' && ch != '/') {  // find child directly
      var wdgt = this.widget, targWdgt = wdgt && wdgt.W(sPath);
      return (targWdgt && targWdgt.component) || null;
    }
    else return getCompByPath_(this,sPath);
  }
  
  elementOf(sPath) {
    var ch, headWdgt = null, sTail = '', tp = typeof sPath;
    if (tp == 'number') {
      headWdgt = this.componentOf(sPath);
      headWdgt = headWdgt && headWdgt.widget;  // sTail = '';
    }
    else if (!sPath)
      headWdgt = this.widget;  // sTail = '';
    else if (tp != 'string')
      return null;
    else if ((ch=sPath[0]) != '.' && ch != '/') {
      headWdgt = this.widget;
      sTail = sPath;
    }
    else {
      var iPos = sPath.lastIndexOf('./');
      if (iPos >= 0) {
        var comp = this.componentOf(sPath.slice(0,iPos+2))
        if (!comp) return null;
        headWdgt = comp.widget;
        sTail = sPath.slice(iPos+2);
      }
      else if (ch == '.') {  // absolute path
        headWdgt = W;
        sTail = sPath.slice(1);
        if (!sTail) return null;
      }
      else if (ch == '/' && sPath[1] == '/') {
        var ownerObj = this.parentOf();
        return ownerObj? ownerObj.elementOf(sPath.slice(2)): null;
      }
      else return null;  // unknown format
    }
    
    if (!headWdgt) return null;
    if (!sTail) {
      var comp = headWdgt.component;
      if (comp) {
        var ownerWdgt = headWdgt.parent, ownerObj = ownerWdgt && ownerWdgt.component;
        if (ownerObj) {
          var idx = ownerObj.$gui.compIdx[comp.$gui.keyid];
          if (typeof idx == 'number')
            return ownerObj.$gui.comps[idx];
        }
      }
      return null;
    }
    if (sTail.indexOf('/') >= 0) return null;  // invalid path
    
    var b = sTail.split('.'), iLast = b.length - 1;
    for (var i=0,item; item=b[i]; i++) {
      var child = headWdgt[item];
      if (Array.isArray(child) && child.W) {
        if (i < iLast)
          headWdgt = child;  // continue next loop
        else {
          var ownerObj = headWdgt.component;
          if (ownerObj) {
            var idx = ownerObj.$gui.compIdx[item];
            if (typeof idx == 'number')
              return ownerObj.$gui.comps[idx];
          }
          return null;
        }
      }
      else {
        var comp = headWdgt.component;
        if (comp && comp.props['isTemplate.'])  // try search by TempXX
          return comp.elementOf(b.slice(i).join('.'));
        else return null;
      }
    }
    return null;
  }
  
  prevSibling() {
    var owner = this.widget, keyid = this.$gui.keyid;
    owner = owner && owner.parent;
    var ownerObj = owner && owner.component;
    
    if (ownerObj && (keyid || keyid === 0)) {
      var gui2 = ownerObj.$gui, idx = gui2.compIdx[keyid];
      if (typeof idx == 'number') {
        for (var i = idx - 1; i >= 0; i--) {
          var child = gui2.comps[i];
          if (child) {
            var sKey_ = getElementKey_(child);
            child = sKey_ && owner[sKey_];
            return child? child.component: undefined;
          }
        }
      }
    }
    return undefined;
  }
  
  nextSibling() {
    var owner = this.widget, keyid = this.$gui.keyid;
    owner = owner && owner.parent;
    var ownerObj = owner && owner.component;
    
    if (ownerObj && (keyid || keyid === 0)) {
      var gui2 = ownerObj.$gui, idx = gui2.compIdx[keyid];
      if (typeof idx == 'number') {
        var iLen = gui2.comps.length;
        for (var i = idx + 1; i < iLen; i++) {
          var child = gui2.comps[i];
          if (child) {
            var sKey_ = getElementKey_(child);
            child = sKey_ && owner[sKey_];
            return child? child.component: undefined;
          }
        }
      }
    }
    return undefined;
  }
  
  fullClone(props) {
    var ele = null, keyid = this.$gui.keyid;
    var wdgt = this.widget, ownerObj = wdgt && wdgt.parent;
    ownerObj = ownerObj && ownerObj.component;
    if (ownerObj) {
      var idx = ownerObj.$gui.compIdx[keyid];
      if (typeof idx == 'number') ele = ownerObj.$gui.comps[idx];
    }
    
    var iFlag, dProp = null;
    if (typeof props != 'object') props = {};
    if (ele) {
      if (iFlag = ele.props['isReference.']) {  // for linker
        dProp = getRefProp_(ele.props);
        if (typeof keyid == 'number') {
          delete dProp.key;
          delete dProp['keyid.'];
        }
        return reactCreate_(iFlag == 1?RefDiv__:RefSpan__,Object.assign(dProp,props));
      }
      
      if (this.props['isTemplate.'] && !W.__design__) {
        var tempObj = this.$gui.template;
        if (tempObj instanceof templateNode)
          return reactClone_(ele,{template:tempObj},null);
        else throw new Error('invalid template (' + keyid + ')');
      }
    }
    
    if (!ele || !(dProp = getCompRenewProp_(this)))
      throw new Error('invalid widget (' + keyid + ')'); // not support
    if (typeof keyid == 'number') {
      dProp['keyid.'] = ''; dProp.key = '';
    }
    Object.assign(dProp,props);
    return deepCloneReactEle_(ele,dProp,wdgt,this);
  }
  
  setChild() {
    var callback = undefined, changed = false, argLen = arguments.length;
    if (argLen > 0) {
      callback = arguments[argLen-1];
      if (typeof callback != 'function')
        callback = undefined;
      else argLen -= 1;
    }
    
    var thisWidget = this.widget, isTopmost = thisWidget === topmostWidget_;
    function doCallback() {
      if (changed && isTopmost) {
        var self = thisWidget.component;
        if (self && self.renewPages)
          self.renewPages();
      }
      if (callback) callback(changed);
    }
    
    var gui = this.$gui;
    if (!thisWidget) {
      utils.instantShow('warning: invalid target widget in setChild().');
      return doCallback();
    }
    if (!this.isHooked) {
      utils.instantShow('warning: can not add child to unhooked widget.');
      return doCallback();
    }
    if (this.props['isTemplate.']) {
      if (justFirstRender_) {
        var template = gui.template; // template must exists
        for (var i0 = 0; i0 < argLen; i0++) {
          var arg = arguments[i0], argTp = typeof arg;
          if (argTp == 'function') {
            callback = arg;  // transcate it
            break;
          }
          else if (arg && React.isValidElement(arg))
            setTemplateChild_(template,arg);
          // else, ignore
        }
        if (!W.__design__)
          return doCallback(); // no need reRender()
        // else, continue set child elements
      }
      else if (!W.__design__) {
        utils.instantShow('warning: can not set child of template.');
        return doCallback();
      }
    }
    
    var currWidgetType = 4; // 1:panel, 2:unit, 3:paragraph, 4:inline
    if (gui.isPanel || isTopmost)
      currWidgetType = 1;
    else if (hasClass_(gui.className, 'rewgt-unit')) {
      if (this.props['childInline.']) // TP like
        currWidgetType = 3;
      else currWidgetType = 2;        // TUnit like
    }
    else {
      if (!this.props['childInline.']) {
        utils.instantShow('warning: invalid call setChild()');
        return doCallback();
      }  // else, currWidgetType = 4  // inline component also support setChild()
    }
    
    var iOldRmv = gui.removeNum, iNewRmv = 0;
    var bKeys = [], bComp = gui.comps.slice(0);
    for (var i = bComp.length - 1; i >= 0; i--) {
      var keyid_, child = bComp[i], sKey_ = child && getElementKey_(child);
      if (sKey_) {
        bKeys.unshift(sKey_);
        
        if (hasClass_(child.props.className,'rewgt-static'))
          bComp[i] = reactClone_(child,{key:sKey_});
        else {
          var iTmp = parseInt(sKey_);
          if ((iTmp+'') === sKey_)
            keyid_ = iTmp;
          else keyid_ = sKey_;
          
          if (keyid_ !== child.props['keyid.'])  // ensure using 'keyid.'
            bComp[i] = reactClone_(child,{'keyid.':keyid_,key:sKey_});
        }
      }
      else {
        bComp.splice(i, 1);
        iNewRmv += 1;
        changed = true; // need call setState()
      }
    } // first scan: get callback, remove old, pseudo add/insert
    
    var lastKeyid = undefined, lastOp = '';
    for (var i1 = 0; i1 < argLen; i1++) {
      var arg = arguments[i1];
      var argTp = typeof arg;
      
      if (argTp == 'function') {
        callback = arg; // callback should be last one, if not, transcate it
        break;
      }
      else if (argTp == 'number') {
        arg = arg + '';
        argTp = 'string';
      }
      
      if (argTp == 'string') {
        if (!arg) continue; // ignore ''
        
        lastOp = arg[0];
        if (lastOp == '-' || lastOp == '+') {
          arg = arg.slice(1);
          if (!arg) {
            lastOp = '';
            continue;
          }
        }
        else lastOp = '';
          
        lastKeyid = arg;
        var iTmp = parseInt(arg);
        if (iTmp + '' == arg) lastKeyid = iTmp; // prefer int to string
        if (lastOp == '-') { // remove by keyid
          var iPos = bKeys.indexOf(arg);  // bKeys hold string-key
          if (iPos >= 0) {
            bKeys.splice(iPos, 1);
            bComp.splice(iPos, 1);
            iNewRmv += 1;
            changed = true;
          } // else, not found, ignore
          
          lastOp = '';
          lastKeyid = undefined; // current finished
        }
        else if (lastOp == '+') {
          var iPos = bKeys.indexOf(arg); // -1 means append to end
          if (iPos < 0) lastOp = ''; // change to append or replace
        } // else, lastOp = ''
      }
      else if (arg && React.isValidElement(arg)) {
        if (hasClass_(arg.props.className,'rewgt-static')) {
          console.log('warning: setChild() not support rewgt-static.');
          lastOp = ''; lastKeyid = undefined; // current finished
          continue;
        }
        
        var validChild = true, childInline = arg.props['childInline.'];
        if (childInline === undefined)  // pure react element
          ;
        else if (currWidgetType == 1 || currWidgetType == 2) {  // panel or div
          if (!hasClass_(arg.props.className, ['rewgt-panel','rewgt-unit'])) // not panel/div/p
            validChild = false;
        }
        else {  // p or span
          if (!childInline) // false
            validChild = false;
        }
        
        var insBefore = undefined, tryInsert = true;
        if (lastOp == '+' && lastKeyid !== undefined)
          insBefore = lastKeyid;
        else tryInsert = false;
        
        var argKey, isNewest = false;
        if (lastOp != '+' && lastKeyid !== undefined)
          argKey = lastKeyid;
        else {
          var bTmp = getKeyidProp(arg);
          isNewest = bTmp[0];
          argKey = bTmp[1];
        }
        
        if (!validChild) {
          utils.instantShow('error: display type of child widget (' + argKey + ') mismatch to owner (' + thisWidget.getPath() + ').');
        }
        else {
          if (arg.props['isReference.']) {
            if (typeof argKey == 'string') {
              if (argKey[0] != '$')
                argKey = '$' + argKey;
            }
            else argKey = '$' + argKey; // argKey should be number
            if (inFirstLoading_)
              pendingRefers_.push([this, argKey]);
          }
          
          var iExist = (isNewest || tryInsert)? -1 : bKeys.indexOf(argKey+'');
          if (iExist >= 0) {  // replace
            bComp[iExist] = [argKey, arg];  // bKeys not change
          }
          else {
            var iPos = tryInsert? bKeys.indexOf(insBefore+''): -1;
            if (iPos >= 0) {  // insert
              bComp.splice(iPos, 0, [argKey, arg]);
              bKeys.splice(iPos, 0, argKey+'');
            }
            else { // append
              bComp.push([argKey, arg]);
              bKeys.push(argKey+'');
            }
            
            if (tryInsert && !isNewest) {
              var iOldOne = bKeys.indexOf(argKey+'');
              if (iOldOne >= 0) {
                if (iOldOne == iPos && iPos >= 0)  // same argKey
                  iOldOne = bKeys.indexOf(argKey+'',iPos+1);
              }
              if (iOldOne >= 0) {     // remove old same key
                bComp.splice(iOldOne, 1);
                bKeys.splice(iOldOne, 1);
                iNewRmv += 1;
              }
            }
          }
          changed = true;
        }
        
        lastOp = '';
        lastKeyid = undefined; // current finished
      }
      else if (Array.isArray(arg)) {
        var argLen2 = arg.length, lastOp2 = '', lastKeyid2 = undefined;
        for (var i2 = 0; i2 < argLen2; i2++) {
          var arg2 = arg[i2], argTp2 = typeof arg2;
          if (argTp2 == 'number') {
            arg2 = arg2 + '';
            argTp2 = 'string';
          }
          
          if (argTp2 == 'string') {
            if (!arg2) continue; // ignore ''
            
            lastOp2 = arg2[0];
            if (lastOp2 == '-' || lastOp2 == '+') {
              arg2 = arg2.slice(1);
              if (!arg2) {
                lastOp2 = '';
                continue;
              }
            }
            else lastOp2 = '';
            
            lastKeyid2 = arg2;
            var iTmp2 = parseInt(arg2);
            if (iTmp2 + '' == arg2) lastKeyid2 = iTmp2; // prefer int to string
            
            if (lastOp2 == '-') { // remove by keyid
              var iPos2 = bKeys.indexOf(arg2);
              if (iPos2 >= 0) {
                bKeys.splice(iPos2, 1);
                bComp.splice(iPos2, 1);
                iNewRmv += 1;
                changed = true;
              } // else, not found, ignore
              
              lastOp2 = '';
              lastKeyid2 = undefined; // current finished
            }
            else if (lastOp2 == '+') {
              var iPos2 = bKeys.indexOf(arg2); // -1 means append to end
              if (iPos2 < 0) lastOp2 = ''; // change to append or replace
            } // else, lastOp2 = ''
          }
          else if (arg2 && React.isValidElement(arg2)) {
            if (hasClass_(arg2.props.className,'rewgt-static')) {
              console.log('warning: setChild() not support rewgt-static.');
              lastOp2 = ''; lastKeyid2 = undefined; // current finished
              continue;
            }
            
            var validChild2 = true, childInline2 = arg2.props['childInline.'];
            if (childInline2 === undefined) // pure react element
              ;
            else if (currWidgetType == 1 || currWidgetType == 2) {  // panel or unit
              if (!hasClass_(arg2.props.className, ['rewgt-panel','rewgt-unit'])) // not panel/unit/p
                validChild2 = false;
            }
            else {  // p or span
              if (!childInline2)  // false
                validChild2 = false;
            }
            
            var insBefore2 = undefined, tryInsert2 = true;
            if (lastOp2 == '+' && lastKeyid2 !== undefined)
              insBefore2 = lastKeyid2;
            else if (lastOp == '+' && lastKeyid !== undefined)
              insBefor2 = lastKeyid;
            else tryInsert2 = false;
              
            var argKey2, isNewest2 = false;
            if (lastOp2 != '+' && lastKeyid2 !== undefined)
              argKey2 = lastKeyid2;
            else {
              var bTmp2 = getKeyidProp(arg2);
              isNewest2 = bTmp2[0];
              argKey2 = bTmp2[1];
            }
            
            if (!validChild2) {
              utils.instantShow('error: display type of child widget (' + argKey2 + ') mismatch to owner (' + thisWidget.getPath() + ').');
            }
            else {
              if (arg2.props['isReference.']) {
                if (typeof argKey2 == 'string') {
                  if (argKey2[0] != '$')
                    argKey2 = '$' + argKey2;
                }
                else argKey2 = '$' + argKey2; // argKey2 should be number
                if (inFirstLoading_)
                  pendingRefers_.push([this, argKey2]);
              }
              
              var iExist2 = (isNewest2 || tryInsert2)? -1 : bKeys.indexOf(argKey2+'');
              if (iExist2 >= 0) { // replace
                bComp[iExist2] = [argKey2, arg2]; // bKeys not change
              }
              else {
                var iPos2 = tryInsert2 ? bKeys.indexOf(insBefor2+'') : -1;
                if (iPos2 >= 0) { // insert
                  bComp.splice(iPos2, 0, [argKey2, arg2]);
                  bKeys.splice(iPos2, 0, argKey2+'');
                }
                else { // append
                  bComp.push([argKey2, arg2]);
                  bKeys.push(argKey2+'');
                }
                
                if (tryInsert2 && !isNewest2) {
                  var iOldOne2 = bKeys.indexOf(argKey2+'');
                  if (iOldOne2 >= 0) {
                    if (iOldOne2 == iPos2 && iPos2 >= 0)  // same argKey
                      iOldOne2 = bKeys.indexOf(argKey2+'',iPos2+1);
                  }
                  if (iOldOne2 >= 0) {      // remove old same key
                    bComp.splice(iOldOne2, 1);
                    bKeys.splice(iOldOne2, 1);
                    iNewRmv += 1;
                  }
                }
              }
              
              changed = true;
            } // else, unknown format, ignore
            
            lastOp2 = '';
            lastKeyid2 = undefined; // current finished
          } // else, ignore array and others
        }
      } // else, ignore others
    }
    
    if (changed) { // second scan: clone element and re-index child components
      var checkRow = false, checkCol = false;
      if (!isTopmost && gui.isPanel) {
        if (hasClass_(this.props.className + ' ' + this.props.klass, ['col-reverse', 'reverse-col']))
          checkCol = true;
        else checkRow = true;
      }
      
      var bColumn = null, useCellX = 0, useCellY = 0;
      if (gui.isPanel && Array.isArray(this.props.sizes)) {
        bColumn = this.state.sizes;
        if (Array.isArray(bColumn)) {
          if (checkCol)
            useCellY = bColumn.length;
          else useCellX = bColumn.length;
        }
      }
      
      var iLen = bComp.length, bOldComp = [], compIdx = {};
      for (var i = 0; i < iLen; i++) {
        var currKeyid, item = bComp[i];
        if (Array.isArray(item)) {   // pseudo, newly added
          currKeyid = item[0]; item = item[1];
          var props = { key: currKeyid + '', 'keyid.': currKeyid };
          if (item.props['childInline.'] !== undefined) {
            props['hookTo.'] = thisWidget; // not react element
            
            if (isTopmost && item.props['isScenePage.'] && item.props.noShow && !W.__design__)
              props['isTemplate.'] = true;
            
            if (currWidgetType != 4) { // panel/unit/p, not inline widget
              props.width = item.props.width;
              props.height = item.props.height;
            }
            
            if (useCellX)
              props.width = bColumn[i % useCellX]; // bColumn must be Array
            else if (useCellY)
              props.height = bColumn[i % useCellY];
          }
          bComp[i] = reactClone_(item, props);
        }
        else {
          currKeyid = item.props['keyid.'];
          bOldComp.push([i, currKeyid]);
        }
        compIdx[currKeyid] = i;
      }
      
      // third scan: adjust old component: width/height
      var existComps = {};
      for (var i = 0, item; item = bOldComp[i]; i++) {
        var i2 = item[0], currKeyid = item[1];
        var currObj = thisWidget[currKeyid];
        currObj = currObj && currObj.component;
        
        if (currObj) {
          existComps[currKeyid] = currObj;
          if (useCellX) currObj.state.width = bColumn[i2 % useCellX];
          else if (useCellY) currObj.state.height = bColumn[i2 % useCellY];
        }
      }
      gui.removeNum += iNewRmv;
      gui.comps = bComp;
      gui.compIdx = compIdx; // child components re-indexed
      
      if (gui.inSync) {      // still in syncProps_()
        if (callback || isTopmost) {
          setTimeout( function() {
            doCallback();
          },0);
        }
        // else, nothing to process
      }
      else {
        var newId = this.state.id__ === identicalId_? identicalId(): identicalId_;
        this.setState({id__:newId},doCallback);
      }
    }
    else {
      doCallback();
    }
    
    function getKeyidProp(ele) {
      var keyid, sKey = getElementKey_(ele);
      var iNewest = iOldRmv + iNewRmv + bComp.length, isNum = false;
      if (sKey) {
        var iTmp = parseInt(sKey);
        if ((iTmp + '') === sKey) {
          isNum = true;
          keyid = iTmp;
        } else keyid = sKey;
      }
      else {
        keyid = iNewest;
        isNum = true;
      }

      if (isNum && (keyid < 0 || keyid > iNewest)) {
        utils.instantShow('warning: invalid keyid (' + keyid + ')');
        keyid = iNewest;
      }
      return [isNum && keyid == iNewest, keyid];
    }
  }
  
  prepareState() {  // only for panel/unit/paragraph
    function percentPx(parentWd, WD, canNeg) {
      var wd;
      if (WD >= 1)
        wd = WD;
      else if (typeof parentWd != 'number')
        return null;
      else if (WD >= 0.9999)
        wd = parentWd;
      else if (WD >= 0)
        wd = WD * parentWd;
      else wd = WD;
      
      if (wd < 0) {
        if (canNeg) {
          if (wd > -0.9999)
            return wd * parentWd;
          else if (wd > -1)
            return -parentWd;
          else return wd;
        }
        else return 0;
      }
      else return wd;
    }
    
    function toCssString(WD, perAsZero) {
      if (WD >= 1) return WD + 'px';
      else {
        if (perAsZero) return 0;
        if (WD > 0.9999) return '100%';
        else return WD * 100 + '%';
      }
    }
    
    var parentWd = this.state.parentWidth, parentHi = this.state.parentHeight;
    var parentWdAuto = typeof parentWd != 'number', parentHiAuto = typeof parentHi != 'number';
    var wgtPadding = this.state.padding, wgtBorder = this.state.borderWidth, wgtMargin = this.state.margin;
    var iLeft = null, iTop = null;
    if (typeof this.state.left == 'number') iLeft = percentPx(parentWd, this.state.left,true);
    if (typeof this.state.top == 'number') iTop = percentPx(parentHi, this.state.top,true);
    
    var iPadT, iPadR, iPadB, iPadL, sPadding = '';
    var iBrdT, iBrdR, iBrdB, iBrdL, sBorderWd = '';
    var iMrgT, iMrgR, iMrgB, iMrgL, sMargin = '';
    if (parentWdAuto) {
      iPadT = iPadR = iPadB = iPadL = 0;
      sPadding = toCssString(wgtPadding[0],false) + ' ' + toCssString(wgtPadding[1],false) + ' ' + toCssString(wgtPadding[2],false) + ' ' + toCssString(wgtPadding[3],false);
      iBrdT = iBrdR = iBrdB = iBrdL = 0;
      sBorderWd = toCssString(wgtBorder[0],true) + ' ' + toCssString(wgtBorder[1],true) + ' ' + toCssString(wgtBorder[2],true) + ' ' + toCssString(wgtBorder[3],true);
      iMrgT = iMrgR = iMrgB = iMrgL = 0;
      sMargin = toCssString(wgtMargin[0],false) + ' ' + toCssString(wgtMargin[1],false) + ' ' + toCssString(wgtMargin[2],false) + ' ' + toCssString(wgtMargin[3],false);
    }
    else {
      iPadT = percentPx(parentWd, wgtPadding[0]); // top
      iPadR = percentPx(parentWd, wgtPadding[1]); // right
      iPadB = percentPx(parentWd, wgtPadding[2]); // bottom
      iPadL = percentPx(parentWd, wgtPadding[3]); // left
      sPadding = iPadT + 'px ' + iPadR + 'px ' + iPadB + 'px ' + iPadL + 'px';
      iBrdT = percentPx(parentWd, wgtBorder[0]);
      iBrdR = percentPx(parentWd, wgtBorder[1]);
      iBrdB = percentPx(parentWd, wgtBorder[2]);
      iBrdL = percentPx(parentWd, wgtBorder[3]);
      sBorderWd = iBrdT + 'px ' + iBrdR + 'px ' + iBrdB + 'px ' + iBrdL + 'px';
      iMrgT = percentPx(parentWd, wgtMargin[0],true);
      iMrgR = percentPx(parentWd, wgtMargin[1],true);
      iMrgB = percentPx(parentWd, wgtMargin[2],true);
      iMrgL = percentPx(parentWd, wgtMargin[3],true);
      sMargin = iMrgT + 'px ' + iMrgR + 'px ' + iMrgB + 'px ' + iMrgL + 'px';
    }
    
    var currWdgt = this.widget, gui = this.$gui, ownerObj = null;
    var minWd = this.state.minWidth, maxWd = this.state.maxWidth;
    var minHi = this.state.minHeight, maxHi = this.state.maxHeight;
    var thisWd = this.state.width, thisHi = this.state.height;
    var cssWd = null, wdAuto = (typeof thisWd != 'number')?true:(thisWd>=1?false:parentWdAuto);
    var cssHi = null, hiAuto = (typeof thisHi != 'number')?true:(thisHi>=1?false:parentHiAuto);
    var wdChanged = false, hiChanged = false;
    if (!wdAuto) {
      var wd = null;
      if (thisWd < 0) { // negative percent
        var ownerWdgt = currWdgt && currWdgt.parent;
        ownerObj = ownerWdgt && ownerWdgt.component;
        if (ownerObj) {
          var iSpared = ownerObj.$gui.sparedX;
          if (typeof iSpared == 'number') wd = iSpared * (0 - thisWd);
        }
        else ownerObj = undefined;
      }
      else wd = percentPx(parentWd,thisWd);
      
      if (typeof wd != 'number')
        wdAuto = true;  // cssWd = null;  // wdChanged = false
      else {
        if (minWd && wd < minWd) wd = minWd;
        if (maxWd && wd > maxWd) wd = maxWd;
        // cssWd = wd;
        cssWd = wd - iPadL - iPadR - iBrdL - iBrdR;
        if (cssWd < 0)
          cssWd = null; // wdChanged = false
        else if (gui.cssWidth !== cssWd)
          wdChanged = true;
      }
    }  // else, take turning to auto as no resizing 
    if (!hiAuto) {
      var hi = null;
      if (thisHi < 0) { // negative percent
        if (ownerObj === null) {
          var ownerWdgt = currWdgt && currWdgt.parent;
          ownerObj = ownerWdgt && ownerWdgt.component;
        }
        if (ownerObj) {
          var iSpared = ownerObj.$gui.sparedY;
          if (typeof iSpared == 'number') hi = iSpared * (0 - thisHi);
        }
        else ownerObj = undefined;
      }
      else hi = percentPx(parentHi,thisHi);
      if (typeof hi != 'number')
        hiAuto = true;  // cssHi = null;  // hiChanged = false
      else {
        if (minHi && hi < minHi) hi = minHi;
        if (maxHi && hi > maxHi) hi = maxHi;
        // cssHi = hi;
        cssHi = hi - iPadT - iPadB - iBrdT - iBrdB;
        if (cssHi < 0)
          cssHi = null; // hiChanged = false
        else if (gui.cssHeight !== cssHi)
          hiChanged = true;
      }
    }  // else, take turning to auto as no resizing
    if (minWd) minWd = Math.max(0,minWd - iPadL - iPadR - iBrdL - iBrdR);
    if (maxWd) maxWd = Math.max(0,maxWd - iPadL - iPadR - iBrdL - iBrdR);
    if (minHi) minHi = Math.max(0,minHi - iPadT - iPadB - iBrdT - iBrdB);
    if (maxHi) maxHi = Math.max(0,maxHi - iPadT - iPadB - iBrdT - iBrdB);

    gui.cssWidth = cssWd;   // null for 'auto'
    gui.cssHeight = cssHi;
    
    var spareChanged = gui.respared;
    gui.respared = false;
    
    if (currWdgt && (gui.isPanel || currWdgt === topmostWidget_)) { // only for panel and topmost, others ignore
      if (wdChanged || hiChanged || spareChanged || utils.dragInfo.justResized) {   // spared space only can be caculated when cssWidth/cssHeight ready
        if (gui.useSparedX) { // must !useSparedY
          if (wdChanged || spareChanged) {
            gui.sparedX = getSparedPixel_(this,currWdgt,true,cssWd); // caculate even if unhooked
            spareChanged = true;
          }
        }
        else if (gui.useSparedY) { // must !useSparedX
          if (hiChanged || spareChanged) {
            gui.sparedY = getSparedPixel_(this,currWdgt,false,cssHi); // caculate even if unhooked
            spareChanged = true;
          }
        }
        if (this.isHooked || spareChanged) { // if !this.isHooked, but any child use spared space also can triggle 
          var self = this;
          setTimeout(function() { // perform in next event loop
            if (self.isHooked)
              propagateResizing_(self,utils.dragInfo.inDragging);
          },0); // first render() not hooked, while hook is ready at next tick
        }
      }
    }
    
    var dStyle = Object.assign({}, this.state.style, {
      margin: sMargin, padding: sPadding, borderWidth: sBorderWd
    }); // copy state.style for shallowEqual() always correct
    if (typeof iLeft != 'number') delete dStyle.left; // as 'auto'
    else dStyle.left = iLeft + 'px';
    if (typeof iTop != 'number') delete dStyle.top;
    else dStyle.top = iTop + 'px';
    
    if (wdAuto) delete dStyle.width;      // as 'auto'
    else dStyle.width = (cssWd + iPadL + iPadR + iBrdL + iBrdR) + 'px'; // box-sizing:border-box
    if (hiAuto) delete dStyle.height;
    else dStyle.height = (cssHi + iPadT + iPadB + iBrdT + iBrdB) + 'px';
    
    if (minWd) dStyle.minWidth = minWd + 'px';
    else delete dStyle.minWidth;
    if (maxWd) dStyle.maxWidth = maxWd + 'px';
    else delete dStyle.maxWidth;
    if (minHi) dStyle.minHeight = minHi + 'px';
    else delete dStyle.minHeight;
    if (maxHi) dStyle.maxHeight = maxHi + 'px';
    else delete dStyle.maxHeight;
    this.state.style = dStyle;
    
    var bRet = [];
    gui.comps.forEach( function(item) {
      if (item) bRet.push(item);
    });
    return bRet;  // return copied-array
  }
  
  render() { // TWidget_.render() should not be overrided by inherited class
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    var props = setupRenderProp_(this);
    return reactCreate_('div', props, bChild);
  }
}

T.Widget_ = TWidget_;

function nodesDualFn_(value,oldValue) {
  if (!Array.isArray(value)) return;  // fatal error
  // this.state.nodes = value;        // must be auto assigned
  resetNodes(this,value,oldValue);    // old value must be array
  
  function resetNodes(comp,value,oldValue) {
    // step 1: try load json-x, direct change `value`
    var bNewKey = [], bNewEle = [];
    for (var i=value.length-1; i >= 0; i--) {
      var item = value[i];
      if (!Array.isArray(item)) continue;
      var sKey = item[0], ele = item[1];
      if (!sKey || typeof sKey != 'string' || !ele) {
        value.splice(i,1);  // direct change `value`
        continue;
      }
      
      if (typeof ele == 'string') {
        ele = item[1] = reactCreate_(P__,{key:sKey,'keyid.':sKey,'html.':ele});
        bNewKey.unshift(sKey);
        bNewEle.unshift(ele);
      }
      else if (React.isValidElement(ele)) {
        if (ele.props['keyid.'] !== sKey)
          ele = item[1] = reactClone_(ele,{key:sKey,'keyid.':sKey});
        bNewKey.unshift(sKey);
        bNewEle.unshift(ele);
      }
      else {
        if (Array.isArray(ele) && ele[0]) {  // not static node
          ele = utils.loadElement(ele);
          if (ele) {
            if (ele.props['keyid.'] !== sKey)
              ele = reactClone_(ele,{key:sKey,'keyid.':sKey});
            item[1] = ele;
            bNewKey.unshift(sKey);
            bNewEle.unshift(ele);
            continue;  // success
          }
        }
        value.splice(i,1);
      }
    }
    
    if (W.__design__) return;  // avoid calling setChild() when in __design__
    
    // step 2: scan remove items
    var bArg = [];
    for (var i=oldValue.length-1; i >= 0; i--) { // oldValue must be array
      var item = oldValue[i], sKey = item[0];
      if (bNewKey.indexOf(sKey) < 0)
        bArg.unshift('-' + sKey);
    }
    
    // step 3: apply remove and set
    bArg = bArg.concat(bNewEle);
    if (bArg.length) {
      setTimeout( function() {
        comp.setChild.apply(comp,bArg);
      },0);
    }
  }
}

class TBodyPanel_ extends TWidget_ {
  constructor(name,desc) {
    super(name || 'BodyPanel',desc);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.className = 'rewgt-unit';
    dProp['keyid.'] = 'body';
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    this.defineDual('innerSize', function(value,oldValue) {
      throw new Error('duals.innerSize is readonly');
    },[dState.parentWidth,dState.parentHeight]);
    this.defineDual('nodes',nodesDualFn_,[]);
    
    return dState;
  }
  
  renewPages() {
    if (W.__design__ || !this.isHooked || !utils.pageCtrl) return;
    
    var comps = this.$gui.comps, wdgt = this.widget, bNew = [];
    comps.forEach( function(child) {
      if (!child || !child.props['isScenePage.'] || child.props.noShow) return;
      var sKey = getElementKey_(child), comp = sKey && wdgt[sKey];
      comp = comp && comp.component;
      if (comp) bNew.push([sKey,comp]);  // sKey maybe 'number'
    });
    
    var beRenew = false, oldKeys = utils.pageCtrl.keys; // pageCtrl.keys must defined
    if (oldKeys.length != bNew.length)
      beRenew = true;
    else {
      for (var i=0,item; item=oldKeys[i]; i++) {
        if (item !== bNew[i][0]) {
          beRenew = true;
          break;
        }
      }
    }
    if (beRenew) {
      setTimeout( function() {
        utils.pageCtrl.renewPages(bNew);
      },0);
    }
  }
  
  componentDidMount() {
    super.componentDidMount();
    
    var gui = this.$gui;
    if (gui.onWinResize)
      window.addEventListener('resize',gui.onWinResize,false);
    
    var node = findDomNode_(this);
    if (node) keyOfNode_(node);  // try install getKeyFromNode_
  }
  
  componentWillUnmount() {
    var gui = this.$gui;
    if (gui.onWinResize) {
      window.removeEventListener('resize', gui.onWinResize, false);
      gui.onWinResize = null;
    }
    
    super.componentWillUnmount();
  }
}

T.BodyPanel_ = TBodyPanel_;
T.BodyPanel  = new TBodyPanel_();

class TPanel_ extends TWidget_ {
  constructor(name,desc) {
    super(name || 'Panel',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    
    var sPerPixel = '[any]: null for auto, 0~1 for percent, 0.9999 for 100%, N pixels, -0.xx for spared percent';
    var bWd = dSchema.width, bHi = dSchema.height;
    if (bWd) bWd[3] = sPerPixel;
    if (bHi) bHi[3] = sPerPixel;
    return dSchema;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.className = 'rewgt-panel';
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.widget && this.widget.parent === topmostWidget_) { // direct under W.body
      if ((this.props.left || 0) > 0 || (this.props.top || 0) > 0)
        this.duals.style = Object.assign({},this.props.style,{position:'absolute'});
    }
    this.defineDual('nodes',nodesDualFn_,[]);
    return dState;
  }
  
  isRow() {
    return !hasClass_(this.props.className + ' ' + this.state.klass, ['col-reverse', 'reverse-col']);
  }
  
  isReverse() {
    return hasClass_(this.props.className + ' ' + this.state.klass, ['reverse-row', 'reverse-col']);
  }
}

T.Panel_ = TPanel_;
T.Panel  = new TPanel_();

class TUnit_ extends TWidget_ {
  constructor(name,desc) {
    super(name || 'Unit',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    
    var sPerPixel = '[any]: null for auto, 0~1 for percent, 0.9999 for 100%, N pixels, -0.xx for spared percent';
    var bWd = dSchema.width, bHi = dSchema.height;
    if (bWd) bWd[3] = sPerPixel;
    if (bHi) bHi[3] = sPerPixel;
    return dSchema;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.className = 'rewgt-unit'; // TUnit default not spead resizing event
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.widget && this.widget.parent === topmostWidget_) // direct under W.body
      this.duals.style = Object.assign({},this.props.style,{position:'absolute'});
    return dState;
  }
}

T.Unit_ = TUnit_;
T.Unit  = new TUnit_();

class TSplitDiv_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'SplitDiv',desc);
    this._defaultProp.width = 4;
    this._defaultProp.height = 4;
    // _statedProp, _silentProp, _defaultProp no change
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.width = 4;
    dProp.height = 4;
    return dProp;
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    
    var sPerPixel = '[number]: 0~1 for percent, 0.9999 for 100%, N pixels';
    dSchema.width = [iLevel+1,'number',null,sPerPixel];
    dSchema.height = [iLevel+2,'number',null,sPerPixel];
    return dSchema;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    this.$gui.comps = []; // force not using child element
    var owner = null, wdgt = this.widget;
    if (wdgt) {
      owner = wdgt.parent;
      owner = owner && owner.component;
    }
    
    if (!owner) {
      utils.instantShow('error: no owner widget for SplitDiv');
      return dState;
    }
    if (!hasClass_(owner.props.className, 'rewgt-panel')) { // warning: can not add SplitDiv in topmost panel
      utils.instantShow('error: owner of widget (' + wdgt.getPath() + ') is not rewgt-panel');
      return dState;
    }
    
    var inRow = true;
    if (hasClass_(owner.props.className + ' ' + owner.props.klass, ['col-reverse', 'reverse-col']))
      inRow = false; // else, inRow = true  // fixed, not changing
    Object.assign(this.$gui, { inRow:inRow, reversed:false,
      inDrag:false, dragStartX:0, dragStartY:0,
      resizeOwner:undefined, resizeTarg:undefined, sizingFunc:null
    });
    
    this.defineDual('id__', function(value,oldValue) {
      if (oldValue != 1) return; // ignore none-first-render
      
      var dState = this.state;
      if (inRow) {
        if ((typeof dState.width != 'number') || dState.width < 1) dState.width = 4; // default 4px
        if (dState.width >= 1) {
          dState.minWidth = dState.width; // set minWidth/maxWidth to fix size
          dState.maxWidth = dState.width;
        }
        if (this.props.height >= 1 && this.props.height <= 4)
          dState.height = 0.9999; // 100%
        if (this.props.minHeight === undefined)
          dState.minHeight = 10;  // default 10px
      }
      else {
        if ((typeof dState.height != 'number') || dState.height < 1) dState.height = 4; // default 4px
        if (dState.height >= 1) {
          dState.minHeight = dState.height;
          dState.maxHeight = dState.height;
        }
        if (this.props.width >= 1 && this.props.width <= 4)
          dState.width = 0.9999;  // 100%
        if (this.props.minWidth === undefined)
          dState.minWidth = 10;   // default 10px
      }
      
      var initStyle = {cursor:inRow?'ew-resize':'ns-resize'};
      var hasBackground = false;
      for (var sKey in dState.style) {
        if (sKey.indexOf('background') == 0) {
          hasBackground = true;
          break;
        }
      }
      if (!hasBackground) initStyle.backgroundColor = '#ddd'; // set default background color
      dState.style = Object.assign({},dState.style,initStyle);
    });
    
    return dState;
  }
  
  $$onMouseDown(event) {
    var self = this, gui = this.$gui;
    
    function oneResizeStep(clientX, clientY) {
      var owner = gui.resizeOwner, targ = gui.resizeTarg;
      if (!owner || !targ) return;
      
      var updated = false, iNewX = -1, iNewY = -1;
      if (gui.inRow) {
        iNewX = targ.state.width;
        var detaX = clientX - gui.dragStartX;
        
        if (detaX != 0) { // ele.state.width must >= 1
          var wdMin = targ.state.minWidth, wdMax = targ.state.maxWidth;
          var wd = iNewX < 1 ? iNewX * targ.state.parentWidth: iNewX;
          iNewX = gui.reversed ? wd - detaX: wd + detaX;
          if (wdMin && iNewX < wdMin) iNewX = wdMin;
          if (wdMax && iNewX > wdMax) iNewX = wdMax;
          if (iNewX < 1) iNewX = 1; // avoid change to percent
          
          if (iNewX != wd) {
            var child, deta2 = iNewX - wd;
            if (gui.reversed) deta2 = -deta2;
            if (deta2 != detaX) clientX += deta2 - detaX;
            gui.dragStartX = clientX;
            gui.dragStartY = clientY;
            
            if (gui.sizingFunc)
              gui.sizingFunc(targ, iNewX, iNewY, !gui.inDrag);
            else {
              targ.state.width = iNewX; // maybe change percent to pixel
              renewWidgetSpared_(owner,!gui.inDrag, function() {
                targ.reRender();
              });
            }
            
            updated = true;
          }
        }
      }
      else {
        iNewY = targ.state.height;
        var detaY = clientY - gui.dragStartY;
        
        if (detaY != 0) {
          var hiMin = targ.state.minHeight, hiMax = targ.state.maxHeight;
          var hi = iNewY < 1 ? iNewY * targ.state.parentHeight: iNewY;
          iNewY = gui.reversed ? hi - detaY: hi + detaY;
          if (hiMin && iNewY < hiMin) iNewY = hiMin;
          if (hiMax && iNewY > hiMax) iNewY = hiMax;
          if (iNewY < 1) iNewY = 1; // avoid change to percent
          
          if (iNewY != hi) {
            var child, deta2 = iNewY - hi;
            if (gui.reversed) deta2 = -deta2;
            if (deta2 != detaY) clientY += deta2 - detaY;
            gui.dragStartX = clientX;
            gui.dragStartY = clientY;
            
            if (gui.sizingFunc)
              gui.sizingFunc(targ, iNewX, iNewY, !gui.inDrag);
            else {
              targ.state.height = iNewY; // maybe change percent to pixel
              renewWidgetSpared_(owner,!gui.inDrag, function() {
                targ.reRender();
              });
            }
            
            updated = true;
          }
        }
      }
      
      if (!updated && !gui.inDrag && (iNewX >= 1 || iNewY >= 1)) { // mouseup
        if (gui.sizingFunc)
          gui.sizingFunc(targ, iNewX, iNewY, true); // one of iNewX/iNewY should be -1
        else {
          renewWidgetSpared_(owner,true, function() {
            targ.reRender();
          }); // force update sparedX/sparedY
        }
      }
    }
    
    function whenMouseMove(event) {
      if (!gui.inDrag) {
        var owner = self.widget;
        owner = owner && owner.parent;
        var ownerObj = owner && owner.component;
        if (!ownerObj) return;
        if (!ownerObj.$gui.isPanel) return; // SplitDiv only worked in panel
        if (Array.isArray(ownerObj.props.sizes)) return; // SplitDiv can not used under GridPanel
        
        var moved = false, inRow = gui.inRow;
        if (inRow) {
          if (Math.abs(event.clientX - gui.dragStartX) >= 4) moved = true;
        } else {
          if (Math.abs(event.clientY - gui.dragStartY) >= 4) moved = true;
        }
        
        if (moved) {
          var prevObj = self.prevSibling();
          while (prevObj) {
            var wd = inRow ? prevObj.state.width: prevObj.state.height;
            var wdMin = inRow ? prevObj.state.minWidth: prevObj.state.minHeight;
            var wdMax = inRow ? prevObj.state.maxWidth: prevObj.state.maxHeight;
            if (typeof wd == 'number' && wd > 0 && (wdMin == 0 || wdMax == 0 || wdMin != wdMax)) {
              gui.reversed = hasClass_(ownerObj.props.className + ' ' + ownerObj.state.klass, ['reverse-row', 'reverse-col']);
              gui.resizeOwner = ownerObj;
              gui.resizeTarg = prevObj;
              gui.inDrag = true;
              utils.dragInfo.inDragging = true;
              break;
            }
            prevObj = prevObj.prevSibling();
          }
          
          var owner2_, ownerObj2_;
          if (!gui.inDrag && !self.nextSibling() && (owner2_ = owner.parent) && (ownerObj2_ = owner2_.component)) {
            if (ownerObj.$gui.sparedTotal > 0.989 && ownerObj.$gui.sparedTotal <= 1.01) { // ownerObj2_.$gui.isPanel
              var wd = inRow ? ownerObj.state.width: ownerObj.state.height;
              var wdMin = inRow ? ownerObj.state.minWidth: ownerObj.state.minHeight;
              var wdMax = inRow ? ownerObj.state.maxWidth: ownerObj.state.maxHeight;
              if (typeof wd == 'number' && wd > 0 && wd != 0.9999 && (wdMin == 0 || wdMax == 0 || wdMin != wdMax)) {
                gui.reversed = hasClass_(ownerObj2_.props.className + ' ' + ownerObj2_.state.klass, ['reverse-row', 'reverse-col']);
                gui.resizeOwner = ownerObj2_;
                gui.resizeTarg = ownerObj;
                gui.inDrag = true;
                utils.dragInfo.inDragging = true;
              }
              // else, wd maybe 0.9999 for nested-SplitDiv
              
              // maybe row-SplitDiv and col-SplitDiv is nested, check up level
              if (!gui.inDrag && typeof wd == 'number' && wd > 0 && ownerObj2_.$gui.sparedTotal > 0.989 && ownerObj2_.$gui.sparedTotal <= 1.01) {
                var owner3_ = owner2_.parent, ownerObj3_ = owner3_ && owner3_.component;
                if (ownerObj3_) { // ownerObj3_.$gui.isPanel
                  var wd = inRow ? ownerObj2_.state.width: ownerObj2_.state.height;
                  var wdMin = inRow ? ownerObj2_.state.minWidth: ownerObj2_.state.minHeight;
                  var wdMax = inRow ? ownerObj2_.state.maxWidth: ownerObj2_.state.maxHeight;
                  if (typeof wd == 'number' && wd > 0 && wd != 0.9999 && (wdMin == 0 || wdMax == 0 || wdMin != wdMax)) {
                    gui.reversed = hasClass_(ownerObj3_.props.className + ' ' + ownerObj3_.state.klass, ['reverse-row', 'reverse-col']);
                    gui.resizeOwner = ownerObj3_;
                    gui.resizeTarg = ownerObj2_;
                    gui.inDrag = true;
                    utils.dragInfo.inDragging = true;
                  }
                }
              }
              
              if (gui.inDrag) {
                var fn = gui.resizeOwner.$gui.onCellSizing;
                if (fn) gui.sizingFunc = fn; // under GridPanel
              }
            }
          }
        }
      }
      
      if (gui.inDrag) {
        event.stopPropagation();
        oneResizeStep(event.clientX, event.clientY);
      }
    }
    
    function whenMouseUp(event) {
      utils.dragInfo.inDragging = false;
      gui.inDrag = false;
      setTimeout( function() {
        splitterMouseDn_ = false;
      },300);
      document.removeEventListener('mousemove', whenMouseMove);
      document.removeEventListener('mouseup', whenMouseUp);
      
      event.stopPropagation();
      oneResizeStep(event.clientX, event.clientY);
      
      gui.resizeOwner = null;
      gui.resizeTarg = null;
      gui.sizingFunc = null;
    }
    
    gui.dragStartX = event.clientX;
    gui.dragStartY = event.clientY;
    gui.inDrag = false;
    splitterMouseDn_ = true;
    
    document.addEventListener('mouseup', whenMouseUp, false);
    document.addEventListener('mousemove', whenMouseMove, false);
    
    event.stopPropagation();
    if (this.$onMouseDown) this.$onMouseDown(event);
  }
  
  $onClick(event) {
    event.stopPropagation(); // avoid passing click to parent
  }
}

T.SplitDiv_ = TSplitDiv_;
T.SplitDiv  = new TSplitDiv_();

class TGridPanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'GridPanel',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.sizes = [iLevel+1,'any',null,'[any]: [0.2,0.3,-0.4,-0.6], negative value stand for left space'];
    dSchema.cellSpacing = [iLevel+2,'number',null,'[number]: 0,1,2,...'];
    return dSchema;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.sizes = [0.3, 0.3, -1];
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (!Array.isArray(this.props.sizes)) return dState;
    
    var gui = this.$gui;
    gui.inRow = !hasClass_(gui.className + ' ' + this.props.klass, ['col-reverse', 'reverse-col']);
    
    this.defineDual('cellSpacing', function(value,oldValue) {
      if (gui.comps.length && (gui.useSparedX || gui.useSparedY))
        gui.respared = true; // re-caculate spared space in prepareState()
    });
    
    dState.sizes = null;
    this.defineDual('sizes', function(value,oldValue) {
      if (Array.isArray(value)) {
        value = this.state.sizes = value.slice(0);
        
        var hasAuto = false, hasNeValue = false, sparedTotal = 0;
        var isTopmost = this.widget === topmostWidget_;
        if (isTopmost || !gui.isPanel) {
          value.splice(0);
          hasAuto = true;
          if (isTopmost)
            console.log('error: only none-topmost panel can use props.sizes');
        }
        
        for (var i = value.length - 1; i >= 0; i--) {
          var item = value[i];
          if (typeof item != 'number' || isNaN(item)) {
            value[i] = null;
            hasAuto = true;
          }
          else if (item < 0) {
            hasNeValue = true;
            sparedTotal += -item;
          }
        }
        
        var checkRow = false, checkCol = false;
        if (hasClass_(this.props.className + ' ' + this.state.klass, ['col-reverse', 'reverse-col']))
          checkCol = true;
        else checkRow = true;
        
        var changed = !quickCheckEqual_(value,oldValue);
        if (!hasAuto && hasNeValue && (checkRow || checkCol)) {
          gui.sparedTotal = sparedTotal;
          var oldSparedX = gui.useSparedX, oldSparedY = gui.useSparedY;
          if (checkRow)
            gui.useSparedX = true;
          else gui.useSparedY = true;
          
          if (!changed && (oldSparedX != gui.useSparedX || oldSparedY != gui.useSparedY))
            changed = true;
        }
        else {
          gui.sparedTotal = 0;
          gui.useSparedX = false;
          gui.useSparedY = false;
        }
        
        if (changed) {
          if (gui.comps.length)
            gui.removeNum += 1;  // fire rescan item's width/height adjust
          gui.respared = true; // re-caculate spared space in prepareState()
          this.reRender();
        }
      }
      else {
        this.state.sizes = null;
        gui.sparedTotal = 0;
        gui.useSparedX = false;
        gui.useSparedY = false;
        
        if (Array.isArray(oldValue)) {
          if (gui.comps.length)
            gui.removeNum += 1;  // fire rescan spared configure
          this.reRender();
        }
      }
    });
    
    this.defineDual('childNumId', function(value,oldValue) {
      var bColumn = this.state.sizes, useSizes = Array.isArray(bColumn);
      if (useSizes) {
        var idx = 0, sizeLen = bColumn.length;
        gui.comps.forEach( function(child,iPos) {
          if (!child) return;
          
          if (hasClass_(child.props.className, 'rewgt-static')) {idx++; return;}
          if (child.props['isReference.']) {idx++; return;}
          if (child.props['childInline.'] === undefined) {idx++; return;} // pure react element
          
          var wdHi = bColumn[idx++ % sizeLen];
          if (gui.inRow) {
            if (child.props.width !== wdHi)  // wdHi maybe null
              gui.comps[iPos] = reactClone_(child,{width:wdHi});
          }
          else {
            if (child.props.height !== wdHi)
              gui.comps[iPos] = reactClone_(child,{height:wdHi});
          }
        });
      }
    });
    
    gui.onCellSizing = (function(targ, iX, iY, isEnd) { // if iX/iY is -1 means not changed
      var keyid = targ.$gui.keyid, bColumn = this.state.sizes;
      if (!Array.isArray(bColumn)) return; // ignore
      
      var gui = this.$gui, idx = gui.compIdx[keyid], ele = null, currWdgt = this.widget;
      if (typeof idx == 'number' && idx >= 0) ele = gui.comps[idx];
      
      if (ele && currWdgt) {
        var columnNum = bColumn.length;
        if (gui.inRow) { // response to iX
          if (typeof iX == 'number' && iX >= 0) {
            if (iX < 1) {
              if (typeof gui.cssWidth != 'number')
                iX = null;
              else iX = iX * gui.cssWidth;
            }
            var iFrom = idx % columnNum;
            bColumn[iFrom] = iX;  // iX maybe null that means auto
            
            var bList = [];
            for (var sKey in gui.compIdx) {
              var index = gui.compIdx[sKey];
              if (typeof index == 'number' && index >= 0 && index % columnNum == iFrom) {
                var child = currWdgt[sKey];
                child = child && child.component;
                if (child) {
                  child.state.width = iX;
                  bList.push(child);
                }
              }
            }
            
            renewWidgetSpared_(this,isEnd, function() { // renewWidgetSpared_() only refresh the child which uses sparedX/sparedY
              for (var i = 0, child; child = bList[i]; i++) {
                child.reRender(); // refresh current colunm
              }
            });
          }
          else if (typeof iY == 'number' && iY >= 0) { // only update one of iX / iY
            var iFrom = Math.floor(idx / columnNum), iEnd = iFrom + columnNum;
            for (var sKey in gui.compIdx) {
              var index = gui.compIdx[sKey];
              if (typeof index == 'number' && index >= iFrom && index < iEnd) {
                var child = currWdgt[sKey];
                child = child && child.component;
                
                if (child) {
                  var iOld = child.state.height;
                  if (typeof iOld == 'number' && iOld >= 0) {
                    var iMin = child.state.minHeight, iMax = child.state.maxHeight, iValue = iY;
                    if (typeof iY == 'number' && iY < 1)
                      iValue = (typeof gui.cssHeight != 'number')? null: iY*gui.cssHeight;
                    if (iMin && (typeof iValue != 'number' || iValue < iMin))
                      iValue = iMin;
                    if (iMax && (typeof iValue != 'number' || iValue > iMax))
                      iValue = iMax;
                    if (iOld !== iValue) child.setState({height:iValue});
                  }
                }
              }
            }
          }
        }
        else { // response to iY
          if (typeof iY == 'number' && iY >= 0) {
            if (iY < 1) {
              if (typeof gui.cssHeight != 'number')
                iY = null;
              else iY = iY * gui.cssHeight;
            }
            var iFrom = idx % columnNum;
            bColumn[iFrom] = iY;  // iY maybe null that means auto
            
            var bList = [];
            for (var sKey in gui.compIdx) {
              var index = gui.compIdx[sKey];
              if (typeof index == 'number' && index >= 0 && index % columnNum == iFrom) {
                var child = currWdgt[sKey];
                child = child && child.component;
                if (child) {
                  child.state.height = iY;
                  bList.push(child);
                }
              }
            }
            
            renewWidgetSpared_(this,isEnd, function() { // renewWidgetSpared_() only refresh the child which uses sparedX/sparedY
              for (var i = 0, child; child = bList[i]; i++) {
                child.reRender(); // refresh current colunm
              }
            });
          }
          else if (typeof iX == 'number' && iX >= 0) { // only update one of iX / iY
            var iFrom = Math.floor(idx / columnNum), iEnd = iFrom + columnNum;
            for (var sKey in gui.compIdx) {
              var index = gui.compIdx[sKey];
              if (typeof index == 'number' && index >= iFrom && index < iEnd) {
                var child = currWdgt[sKey];
                child = child && child.component;
                
                if (child) {
                  var iOld = child.state.width;
                  if (typeof iOld == 'number' && iOld >= 0) {
                    var iMin = child.state.minWidth, iMax = child.state.maxWidth, iValue = iX;
                    if (typeof iX == 'number' && iX < 1)
                      iValue = (typeof gui.cssWidth != 'number')? null: iX*gui.cssWidth;
                    if (iMin && (typeof iValue != 'number' || iValue < iMin))
                      iValue = iMin;
                    if (iMax && (typeof iValue != 'number' || iValue > iMax))
                      iValue = iMax;
                    if (iOld !== iValue) child.setState({width:iValue});
                  }
                }
              }
            }
          }
        }
      }
    }).bind(this);
    
    return dState;
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    
    if (W.__design__)
      bChild.push(reactCreate_('div',{key:'$end',title:'end of GridPanel',style:{width:'100%',height:'10px',backgroundColor:'#eee'}}));
    
    var props = setupRenderProp_(this);
    return reactCreate_('div', props, bChild);
  }
}

T.GridPanel_ = TGridPanel_;
T.GridPanel  = new TGridPanel_();

class TTableRow_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'TableRow',desc);
    this._silentProp.push('isTableRow.');  // _statedProp no change
    this._defaultProp.height = undefined;  // undefined stand for not a number, not save all none-number // careful: NaN === NaN is false
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    // dProp['childInline.'] = false;  // default is false
    dProp['isTableRow.'] = true;       // only TableRow is allowed under TablePanel
    // dProp.className = 'rewgt-unit'; // default is 'rewgt-unit'
    dProp.height = null; // auto height, row width is fixed to 100%
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState(); // warning: borderWidth/padding/margin should be 0
    
    if (W.__design__) {
      var self = this;
      this.defineDual('childNumId', function(value,oldValue) {
        var wdgt = self.widget, ownerObj = wdgt && wdgt.parent;
        ownerObj = ownerObj && ownerObj.component;
        if (ownerObj) { // ownerObj is TablePanel
          setTimeout( function() {
            ownerObj.reRender(); // fire refresh (tail row updated)
          },0);
        }
      });
    }
    
    return dState;
  }

  render() { // no need call this.prepareState(), row's padding/border/margin is fixed to 0
    var gui = this.$gui, oldWd = gui.cssWidth, oldHi = gui.cssHeight;
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var cssWd = gui.cssWidth = this.state.parentWidth; // fixed to parent size, child will read it
    var wdAuto = (typeof cssWd != 'number') || cssWd < 0;
    var cssHi = this.state.parentHeight, hi = this.state.height, hiAuto = (typeof hi != 'number') || hi < 0;
    if (!hiAuto) {
      if (hi >= 1)
        cssHi = gui.cssHeight = hi;     // hiAuto = false
      else {
        if (typeof cssHi == 'number') {
          if (hi >= 0.9999) {
            gui.cssHeight = cssHi;      // 100%, same as parent height
            if (typeof cssHi != 'number' || cssHi < 0)
              hiAuto = true;             // change hiAuto
          }
          else cssHi = gui.cssHeight = cssHi * hi;
        }
        else {
          cssHi = gui.cssHeight = null; // hi < 1 && parent_is_auto
          hiAuto = true;
        }
      }
    }
    else cssHi = gui.cssHeight = null;  // hiAuto = true
    
    var wdChanged = oldWd !== cssWd, thisWdgt = this.widget;
    var bComp = this.$gui.comps, bChild = [];  // bChild record all td
    bComp.forEach( function(cell) {
      if (!cell) return;
      var sKey = getElementKey_(cell);
      if (!sKey) return;
      
      // td's key reuse child's keyid, since order of same td may changed
      var wd,hi,colSpan,rowSpan;
      var tdStyle, cellObj = thisWdgt && thisWdgt[sKey];
      cellObj = cellObj && cellObj.component;
      if (cellObj) {
        wd = cellObj.state.width; hi = cellObj.state.height;
        colSpan = cellObj.state.colSpan; rowSpan = cellObj.state.rowSpan;
        tdStyle = cellObj.state.tdStyle;
      }
      else {
        wd = cell.props.width; hi = cell.props.height;
        colSpan = cell.props.colSpan; rowSpan = cell.props.rowSpan;
        tdStyle = cell.props.tdStyle;
      }
      
      var keyid = sKey, iTmp = parseInt(sKey);
      if ((iTmp+'') === sKey) keyid = iTmp;
      var dTdProp = {key:sKey,'keyid.':keyid};
      colSpan = parseInt(colSpan);  // maybe NaN when parseInt(undefined)
      rowSpan = parseInt(rowSpan);
      if (colSpan) dTdProp.colSpan = colSpan+'';
      if (rowSpan) dTdProp.rowSpan = rowSpan+'';
      
      var cellWd = null, cellHi = null, hiChanged = false, tdHiAuto = hiAuto;
      if (typeof wd == 'number' && wd >= 0) {
        cellWd = wd;  // according to TableRow (not td)
        dTdProp.style = {width: wd>=1? wd+'px': (wd >= 0.9999? '100%': (wd*100)+'%')};
      }
      // else, cellWd = null;
      
      if (typeof tdStyle == 'object')
        dTdProp.style = Object.assign(dTdProp.style || {},tdStyle);
      
      if (typeof hi == 'number' && hi >= 0) {
        if (hi >= 1) {
          cellHi = hi;
          tdHiAuto = false;
        }
        else { // hi: [0,1)
          if (hiAuto)
            hiChanged = true;  // cellHi = null; tdHiAuto = true;
          else cellHi = hi;    // hi is percent
        }
      }
      else tdHiAuto = true;    // cellHi = null
      if ((wdChanged && cellWd !== null) || hiChanged)
        cell = reactClone_(cell,{width:cellWd,height:cellHi});
      
      bChild.push(reactCreate_('td',dTdProp,cell));
    });
    
    if (this.isHooked) {
      if ((!wdAuto && oldWd !== cssWd) || (!hiAuto && oldHi !== cssHi) || utils.dragInfo.justResized) {
        var self = this;
        setTimeout( function() {
          propagateResizing_(self,utils.dragInfo.inDragging);
        },0); // in next tick, change table first (maybe columns changed)
      }
    }
    
    var dStyle = Object.assign({},this.state.style);
    if (!hiAuto && cssHi >= 0)  // add style.height, ignore style.width
      dStyle.height = cssHi + 'px'; // cssHi is cssHeight (in 'px')
    else delete dStyle.height;
    
    var props = setupRenderProp_(this,dStyle);
    return reactCreate_('tr',props,bChild);
  }
}

T.TableRow_ = TTableRow_;
T.TableRow  = new TTableRow_();

class TTablePanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'TablePanel',desc);
    this._defaultProp.height = undefined;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.className = 'rewgt-unit rewgt-table';
    dProp.height = null;  // auto height
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    var self = this;
    this.defineDual('childNumId', function(value,oldValue) {
      self.$gui.respared = true;
    });
    
    return dState;
  }
  
  render() {
    var gui = this.$gui, oldWd = gui.cssWidth, oldHi = gui.cssHeight; // save old value to judge changing
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    
    if (this.isHooked) {
      if ((typeof gui.cssWidth == 'number' && oldWd !== gui.cssWidth) || (typeof gui.cssHeight == 'number' && oldHi !== gui.cssHeight) || utils.dragInfo.justResized) {
        var self = this;
        setTimeout( function() { // TablePanel is unit like (not a panel), need customize resizing event
          propagateResizing_(self,utils.dragInfo.inDragging); // every TableRow will fire resizing
        },0);
      }
    }
    
    var thisWdgt = this.widget;
    if (W.__design__ && thisWdgt) {
      var iNeedCol = 2, bLast = [];
      bChild.forEach( function(child) { // child is TableRow
        if (!child) return;
        
        var iPos = 0, iColNum = 0, hasAuto = false;
        var bList = childElements_(child,thisWdgt);
        
        bList.forEach( function(item) {
          var iRowSpan = bLast[iPos] || 0;
          while (iRowSpan >= 2) {   // has previous row's rowspan (already take colspan as single)
            bLast[iPos++] = iRowSpan - 1;
            iColNum += 1;
            iRowSpan = bLast[iPos] || 0;
          }
          
          var iCurrRow = parseInt(item.props.rowSpan || 0), iCurrCol = parseInt(item.props.colSpan || 0);
          if (iCurrCol >= 2) {      // has colspan
            while (iCurrCol >= 2) {
              iCurrCol -= 1;
              var iPrev = Math.max(0,(bLast[iPos] || 0) - 1);
              bLast[iPos++] = Math.max(iPrev,iCurrRow); // every colspan followed cell set bLast[n] = rowSpan
              iColNum += 1;
            }
          }
          
          var wd = item.props.width;
          if (typeof wd != 'number' || wd < 0)
            hasAuto = true;
          bLast[iPos++] = iCurrRow;
          iColNum += 1;
        });
        bLast.splice(iPos);  // remove out range items
        
        if (!hasAuto) iColNum += 1;
        if (iColNum > iNeedCol) iNeedCol = iColNum;
      });
      
      var dEmpty = {style:{margin:'10px'}}, dEmpty2 = {style:{margin:'2px'}}, bTmp = [];
      for (var i=0; i < iNeedCol; i+=1) {
        bTmp.push(reactCreate_('td',{key:i+'',style:{backgroundColor:'#eee'}},reactCreate_('div',i==0?dEmpty:dEmpty2)));
      }
      bChild.push(reactCreate_('tr',{key:'$end',title:'end of TablePanel',style:{height:'10px'}},bTmp));
    }
    
    var tBody = reactCreate_('tbody', null, bChild);
    var props = setupRenderProp_(this);
    return reactCreate_('table', props, tBody);
  }
}

T.TablePanel_ = TTablePanel_;
T.TablePanel  = new TTablePanel_();

// composable block widgets
//-------------------------

class TDiv_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'Div',desc);
    this._silentProp.push('tagName.');  // _statedProp no change
    this._defaultProp.height = undefined;
    this._defaultProp.minHeight = 20;
    this._htmlText = true;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    // props.className = 'rewgt-unit'; // default is 'rewgt-unit'
    props.width = 0.9999;
    props.height = null;
    props.minHeight = 20;
    // props['childInline.'] = false;  // default is false
    props['tagName.'] = 'div';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    dState['html.'] = null;
    this.defineDual('html.', function(value,oldValue) {
      this.state['html.'] = value || null;
    });
    
    return dState;
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    var props = setupRenderProp_(this);
    return reactCreate_(this.props['tagName.'], props, bChild.length?bChild:this.state['html.']);
  }
}

T.Div_ = TDiv_;
T.Div  = new TDiv_();

class THiddenDiv_ extends TDiv_ {
  constructor(name,desc) {
    super(name || 'HiddenDiv',desc);
    this._defaultProp.width = undefined;
    delete this._defaultProp.minHeight;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props.width = null;
    delete props.minHeight;
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    this.hideThis = true;
    return dState;
  }
}

T.HiddenDiv_ = THiddenDiv_;
T.HiddenDiv  = new THiddenDiv_();

function simpleExtends(TBase,sName) {
  class T extends TBase {
    constructor(name,desc) {
      super(name || sName,desc);
    }
    
    getDefaultProps() {
      var props = super.getDefaultProps();
      props['tagName.'] = sName.toLowerCase();
      return props;
    }
  }
  
  return T;
}

T.Article_ = simpleExtends(TDiv_,'Article');
T.Article  = new T.Article_();
T.Section_ = simpleExtends(TDiv_,'Section');
T.Section  = new T.Section_();
T.Header_  = simpleExtends(TDiv_,'Header');
T.Header   = new T.Header_();
T.Footer_  = simpleExtends(TDiv_,'Footer');
T.Footer   = new T.Footer_();
T.Aside_   = simpleExtends(TDiv_,'Aside');
T.Aside    = new T.Aside_();
T.Nav_     = simpleExtends(TDiv_,'Nav');
T.Nav      = new T.Nav_();
T.Main_    = simpleExtends(TDiv_,'Main');
T.Main     = new T.Main_();

var TPara_margin_ = [6, 0, 6, 0];

class TP_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'P',desc);
    this._silentProp.push('tagName.');  // _statedProp no change
    this._defaultProp.width = undefined;
    this._defaultProp.height = undefined;
    this._defaultProp.margin = TPara_margin_.slice(0);
    this._htmlText = true;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    // props.className = 'rewgt-unit';  // default is 'rewgt-unit'
    props.width = null;
    props.height = null;
    props.margin = TPara_margin_.slice(0);
    props['childInline.'] = true;
    props['tagName.'] = 'p';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    dState['html.'] = null;
    this.defineDual('html.', function(value,oldValue) {
      this.state['html.'] = value || null;
    });
    
    return dState;
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    var props = setupRenderProp_(this);
    return reactCreate_(this.props['tagName.'], props, bChild.length?bChild:this.state['html.']);
  }
}

T.P_ = TP_;
T.P  = new TP_();
var P__ = createClass_(T.P._extend());

class TNoscript_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Noscript',desc);
    delete this._defaultProp.margin;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'noscript';
    // props.width = null; props.height = null;  // fix to auto width and height
    delete props.margin;  // default not pass props.margin
    return props;
  }
  
  render() {
    syncProps_(this);  // should call syncProps since duals.attr in using
    return reactCreate_(this.props['tagName.']); // ignore props and children
  }
}

T.Noscript_ = TNoscript_;
T.Noscript  = new TNoscript_();

var TFieldset_padding_ = [10,10,10,10];
var TFieldset_border_width_ = [2,2,2,2];

class TFieldset_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Fieldset',desc);
    this._defaultProp.padding = TFieldset_padding_.slice(0);
    this._defaultProp.borderWidth = TFieldset_border_width_.slice(0);
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props.padding = TFieldset_padding_.slice(0);
    props.borderWidth = TFieldset_border_width_.slice(0);
    props['tagName.'] = 'fieldset';
    return props;
  }
}

T.Fieldset_ = TFieldset_;
T.Fieldset  = new TFieldset_();

T.Details_  = simpleExtends(TP_,'Details');
T.Details   = new T.Details_();

var TUl_padding_ = [0, 0, 0, 20];

class TUl_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Ul',desc);
    this._defaultProp.padding = TUl_padding_.slice(0); // _statedProp, _silentProp no change
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'ul';
    props.padding = TUl_padding_.slice(0);
    return props;
  }
}

T.Ul_ = TUl_;
T.Ul  = new TUl_();

class TOl_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Ol',desc);
    this._defaultProp.padding = TUl_padding_.slice(0); // _statedProp, _silentProp no change
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'ol';
    props.padding = TUl_padding_.slice(0);
    return props;
  }
}

T.Ol_ = TOl_;
T.Ol  = new TOl_();

T.Li_  = simpleExtends(TP_,'Li');
T.Li   = new T.Li_();
T.Dl_  = simpleExtends(TP_,'Dl');
T.Dl   = new T.Dl_();
T.Dd_  = simpleExtends(TP_,'Dd');
T.Dd   = new T.Dd_();
T.Dt_  = simpleExtends(TP_,'Dt');
T.Dt   = new T.Dt_();
T.Figure_ = simpleExtends(TP_,'Figure');
T.Figure  = new T.Figure_();
T.Figcaption_ = simpleExtends(TP_,'Figcaption');
T.Figcaption  = new T.Figcaption_();
T.Menu_ = simpleExtends(TP_,'Menu');
T.Menu  = new T.Menu_();
T.Menuitem_ = simpleExtends(TP_,'Menuitem');
T.Menuitem  = new T.Menuitem_();
T.Address_ = simpleExtends(TP_,'Address');
T.Address  = new T.Address_();
T.Form_ = simpleExtends(TP_,'Form');
T.Form  = new T.Form_();

var TIframe_margin_ = [0,0,0,0];

class TIframe_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Iframe',desc);
    this._defaultProp.margin = TIframe_margin_.slice(0);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'iframe';
    props.margin = TIframe_margin_.slice(0);
    return props;
  }
}

T.Iframe_ = TIframe_;
T.Iframe  = new TIframe_();

var TBlockquote_padding_ = [0,30,0,30];

class TBlockquote_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Blockquote',desc);
    this._defaultProp.padding = TBlockquote_padding_.slice(0);
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props.padding = TBlockquote_padding_.slice(0);  // default margin: [6,0,6,0]
    props['tagName.'] = 'blockquote';
    return props;
  }
}

T.Blockquote_ = TBlockquote_;
T.Blockquote  = new TBlockquote_();

class TTable_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Table',desc);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'table';
    return props;
  }
}

T.Table_ = TTable_;
T.Table  = new TTable_();

T.Caption_ = simpleExtends(TP_,'Caption');
T.Caption  = new T.Caption_();
T.Col_ = simpleExtends(TP_,'Col');
T.Col  = new T.Col_();
T.Colgroup_ = simpleExtends(TP_,'Colgroup');
T.Colgroup  = new T.Colgroup_();
T.Td_ = simpleExtends(TP_,'Td');
T.Td  = new T.Td_();

var TBody_margin_ = [0,0,0,0];

class TTbody_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Tbody',desc);
    this._defaultProp.margin = TBody_margin_.slice(0);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'tbody';
    props.margin = TBody_margin_.slice(0);
    return props;
  }
  
  render() {
    if (W.__design__) {
      syncProps_(this);
      if (this.hideThis) return null;   // as <noscript>
      
      var bChild = this.prepareState();
      var tailRow = reactCreate_('tr',{key:'$end',title:'end of Tbody',style:{height:'10px'}},reactCreate_('td'));
      bChild.push(tailRow);
      
      var props = setupRenderProp_(this);
      return reactCreate_(this.props['tagName.'],props,bChild);
    }
    else return super.render();
  }
}

T.Tbody_ = TTbody_;
T.Tbody  = new TTbody_();

T.Thead_ = simpleExtends(TP_,'Thead');
T.Thead  = new T.Thead_();
T.Tfoot_ = simpleExtends(TP_,'Tfoot');
T.Tfoot  = new T.Tfoot_();

var ThTr_margin_ = [0,0,0,0];

class TTh_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Th',desc);
    this._defaultProp.margin = ThTr_margin_.slice(0);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'th';
    props.margin = ThTr_margin_.slice(0);
    return props;
  }
}

T.Th_ = TTh_;
T.Th  = new TTh_();

class TTr_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Tr',desc);
    this._defaultProp.margin = ThTr_margin_.slice(0);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'tr';
    props.margin = ThTr_margin_.slice(0);
    return props;
  }
}

T.Tr_ = TTr_;
T.Tr  = new TTr_();

T.Hgroup_ = simpleExtends(TP_,'Hgroup');
T.Hgroup  = new T.Hgroup_();

T.H1_ = simpleExtends(TP_,'H1');
T.H1  = new T.H1_();
T.H2_ = simpleExtends(TP_,'H2');
T.H2  = new T.H2_();
T.H3_ = simpleExtends(TP_,'H3');
T.H3  = new T.H3_();
T.H4_ = simpleExtends(TP_,'H4');
T.H4  = new T.H4_();
T.H5_ = simpleExtends(TP_,'H5');
T.H5  = new T.H5_();
T.H6_ = simpleExtends(TP_,'H6');
T.H6  = new T.H6_();

var THr_border_width_ = [1,1,1,1];

class THr_ extends TP_ {
  constructor(name,desc) {
    super(name || 'Hr',desc);
    this._defaultProp.width = 0.9999;
    this._defaultProp.borderWidth = THr_border_width_.slice(0);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props.width = 0.9999;
    props.borderWidth = THr_border_width_.slice(0);
    props['tagName.'] = 'hr';
    return props;
  }
}

T.Hr_ = THr_;
T.Hr  = new THr_();

T.Pre_ = simpleExtends(TP_,'Pre');
T.Pre  = new T.Pre_();

// inline widgets
//---------------

var displayNoneProp_ = {style:{display:'none'}};

class TSpan_ extends TWidget_ {
  constructor(name,desc) {
    super(name || 'Span',desc);
    
    this._statedProp = [];
    this._silentProp = ['className','hookTo.','keyid.','childInline.','tagName.'];
    this._defaultProp = {width:undefined, height:undefined}; // 'html.' default is not passed, suggest not use width/height, but if used also OK
    this._htmlText = true;  // use 'html.'
  }
  
  _getSchema(self,iLevel) {
    return  { key: [-1,'string'],   // -1 means at top
      width: [], height: [],        // disable show width/height in prop-editor, default come from TWidget_
    };
  }
  
  getDefaultProps() {
    return { 'childInline.':true, 'tagName.':'span' }; // no width/height/className
  }
  
  getInitialState() { // step 1: define template as 'this._'
    var template = this.getShadowTemplate();
    Object.defineProperty(this,'_',{enumerable:false,configurable:false,writable:false,value:template});
    this.isHooked = false; // like this.isMounted(), but can used in render()
    this.hideThis = false;
    
    if (W.__debug__ && utils.widgetNum() == 0) {
      utils.instantShow('error: inline widget can not be used as topmost panel.');
      return {};
    }
    
    // step 2: define duals, tagAttrs, data-* / aria-*
    this.duals = {};
    var gui = { inSync:false, removeNum:0, className:this.props.className || '', compState:0,
      duals:{}, initDuals:[], initDuals0:[], // save duals.attr for prop-watching
      connectTo:{}, connectBy:{},
      id__:0, id2__:0,
    };
    var eventset  = gui.eventset = {};  // regist event callback
    var tagAttrs  = gui.tagAttrs = [];  // list tag-attributes
    var dualAttrs = gui.dualAttrs = {}; // {attrName:'dual-attr-name'}
    var dataset   = gui.dataset = [];   // list data-* aria-*
    var exprAttrs = gui.exprAttrs = []; // list $attr, will adjust to { attr:updateExpr(comp) } before first render
    var pathAttr = '', pathValue = '', flowFlag = '';
    gui.forExpr = false; gui.hasIdSetter = false;
    
    var currEvSet = {}, evSet_=this.$eventset || [{},{}], evSet=evSet_[0], sysEvSet=evSet_[1];
    delete this.$eventset; // $eventset is passed in _extend()
    
    var dualIdSetter = null;
    var b = Object.keys(this.props);
    for (var i = 0, item; item = b[i]; i++) {
      if (item.indexOf('data-') == 0) {
        if (item == 'data-unit.path' || item == 'data-span.path') {
          pathAttr = item;
          pathValue = this.props[item];
        }
        dataset.push(item);
      }
      else if (item.indexOf('dual-') == 0) {
        var dualKey = item.slice(5).replace(_hyphenPattern, function(_,chr) {
          return chr.toUpperCase();
        });
        if (dualKey) dualAttrs[dualKey] = item;
      }
      else if (item.indexOf('aria-') == 0)
        dataset.push(item);
      else if (item[0] == '$' && item.length > 1) {
        var itemValue = this.props[item], tp = typeof itemValue;
        if (tp == 'string') {
          if (item == '$id__') {
            itemValue = idSetter[itemValue];
            tp = typeof itemValue;  // wait process if tp == 'function'
          }
          else {
            var isRFor = false;
            item = item.slice(1);
            if (item == '$for') { // $$for
              item = 'for';
              isRFor = true;
            }
            if (ctrlExprCmd_.indexOf(item) >= 0) {
              if (item == 'for') {
                if (gui.forExpr)
                  console.log('warning: reduplicate property ($for)');
                else {
                  gui.forExpr = isRFor? 2: 1;  // flowFlag is ''
                  exprAttrs.push(item);        // only add one $for
                }
              }
              else {
                if (flowFlag)  // report error and ignore current
                  console.log('error: property ($' + item + ') conflict with previous ($' + flowFlag + ')');
                else {
                  flowFlag = item;
                  if (item != 'else')
                    exprAttrs.push(item);
                }
              }
            }
            else {
              if (item == 'children') {
                if (this.props.hasOwnProperty('for.index')) { // $children only used under forExpr
                  gui.isChildExpr = true;
                  gui.children2 = this.props.children;
                }
              }
              else if (item != 'key') // use $key, $children as normal prop, updated in parent for-loop
                exprAttrs.push(item);
            }
            continue;
          }
        }
        
        if (tp == 'function') {
          if (item[1] == '$') { // not support $$onEvent
            console.log('warning: invalid using props.' + item);
            continue;
          }
          
          item = item.slice(1);
          if (item == 'id__') { // pass setter by props.$id__
            dualIdSetter = itemValue;  // will bind this in defineDual('id__')
            gui.hasIdSetter = true;
          }
          else if (!sysEvSet[item])
            currEvSet[item] = itemValue.bind(this);
          // else, ignore
        }
        // else ignore  // $XX only can be string or function, ignore others
      }
      else {
        var iFlag = supportedAttr_[item];
        if (iFlag && iFlag != 5) // 5: className/style/width/height
          tagAttrs.push(item);
      }
    }
    gui.flowFlag = flowFlag;
    gui.dataset2 = dataset.slice(0);
    
    for (var sEvName in evSet) {
      eventset[sEvName] = this['$' + sEvName];
    }
    for (var sEvName in currEvSet) {
      eventset[sEvName] = currEvSet[sEvName];
    }
    for (var sEvName in sysEvSet) {
      eventset[sEvName] = this['$$' + sEvName];
    }
    
    // step 3: prepare dState
    Object.defineProperty(this,'$gui',{enumerable:false,configurable:false,writable:false,value:gui});
    if (W.__design__) gui.className = addClass_(gui.className,'rewgt-inline'); // gui.className is fixed, not changed by prop.className
    var dStyle = Object.assign({},this.props.style);
    var dState = { id__:0, childNumId:0, duals:[], exprAttrs:exprAttrs.slice(0),
      klass:'', style:{}, 'html.':null,
    }; // state.duals = [[attr,newValue], ...]
    if (W.__design__) {
      var d = template._getGroupOpt(this);
      dState['data-group.opt'] = d.type + '/' + d.editable; // no props['data-group.opt'], not in $gui.dataset
    }
    
    // step 4: hook parent widget
    var keyid = this.props['keyid.'];
    if (keyid) {
      var keyTp = typeof keyid;
      if (keyTp != 'string' && keyTp != 'number')
        keyid = undefined; // change to use automatic number keyid
    }
    
    var owner = this.props['hookTo.'];
    if (typeof owner == 'string')
      owner = W.W(owner); // can be W.W('')
    if (Array.isArray(owner) && owner.W) { // exists owner widget
      if (keyid !== undefined)
        owner.$set(keyid, owner.W(this));
      else keyid = owner.push(owner.W(this)) - 1;
      gui.keyid = keyid;
    }
    
    // step 5: regist duals
    gui.compIdx = {}; gui.comps = children2Arr_(this.props.children);
    
    Object.defineProperty(this.duals,'keyid', { enumerable:true, configurable:true,
      get: (function() {
        return this.$gui.keyid;
      }).bind(this),
      set: function(value,oldValue) { // no need bind this
        throw new Error('property (keyid) is readonly');
      },
    });
    
    this.defineDual('klass', function(value,oldValue) {
      this.state.klass = value || '';
    });
    this.defineDual('style', function(value,oldValue) {
      this.state.style = Object.assign({},oldValue,value);
    });
    this.defineDual('html.', function(value,oldValue) {
      this.state['html.'] = value || null;
    });
    this.defineDual('id__', function(value,oldValue) {
      this.state.id__ = value;   // is first render when oldValue == 0
      gui.id__ = gui.id2__ = value;
    });
    if (dualIdSetter) this.defineDual('id__',dualIdSetter);
    
    this.defineDual('trigger',triggerExprFn_);
    
    var hookThis = this.widget;
    if (owner && hookThis) {
      if (pathAttr) {
        hookThis.$callspace = {flowFlag:'ref', forSpace:null};
        hookThis.$callspace[pathAttr] = pathValue;
        var exprSpace = hookThis.$callspace.exprSpace = {};
        setupExprSpace(exprSpace,this);
      }
    }
    
    // step 6: setup comps, compIdx
    this.defineDual('childNumId', function(newNumId,oldNumId) { // if no props.children, newNumId will be 0, setter will not called
      // this.state.childNumId = newNumId;  // must be auto assigned
      
      var thisObj = this, hookThis = this.widget;
      if (!hookThis) return; // fatal error
      
      if (oldNumId == 0 && hookThis.parent === topmostWidget_)
        console.log('warning: can not hook inline widget to topmost directly.');
      
      var compIdx = gui.compIdx, bComp = gui.comps;
      bComp.forEach( function(child,iPos) {
        if (typeof child == 'string') {
          if (iPos == 0 && bComp.length == 1 && thisObj.duals.hasOwnProperty('html.')) {
            thisObj.state['html.'] = child;
            bComp[iPos] = undefined;
            return;
          }
          child = bComp[iPos] = reactCreate_(Span__,{'html.':child}); // auto change to React Element
        }
        else if (!child) return;
        
        var keyid, sKey = getElementKey_(child), isOld = false;
        if (sKey) {
          var iTmp = parseInt(sKey);
          if ((iTmp+'') === sKey)
            keyid = iTmp;
          else keyid = sKey;
          
          if (typeof compIdx[sKey] == 'number')  // history exists
            isOld = true;
        }
        else {
          keyid = iPos + gui.removeNum;
          sKey = keyid + '';
        }
        
        if (hasClass_(child.props.className, 'rewgt-static')) {
          if (isOld) {
            compIdx[keyid] = iPos;  // adjust position
            return;
          }
          
          var dProp = Object.assign({},child.props);
          // dProp['keyid.'] = keyid;
          dProp.key = sKey;
          if (W.__design__ && !(thisObj.props['$for'] || thisObj.props['$$for'])) {
            dProp.onMouseDown = staticMouseDown;
            dProp.onDoubleClick = staticDbClick.bind(thisObj);
          }
          compIdx[keyid] = iPos;
          bComp[iPos] = reactCreate_('span', dProp); // div.rewgt-static --> span.rewgt-static
          return; // adjust nothing on rewgt-static widget
        }
        
        var childInline2 = child.props['childInline.'];
        if (childInline2 !== undefined) {
          if (!childInline2) {
            bComp[iPos] = undefined;  // must not isOld
            return;   // not inline, ignore adding  // no need print warning
          }
        }
        else { // is pure react element
          compIdx[keyid] = iPos;
          if (!isOld)
            bComp[iPos] = reactClone_(child,{key:sKey}); // not pass 'keyid.'
          return;
        }
        
        if (!isOld && child.props['isReference.']) {
          if (sKey[0] != '$')
            sKey = keyid = '$' + sKey;
          // else, keyid and key prefixed with '$'
          
          if (inFirstLoading_)
            pendingRefers_.push([thisObj, keyid]);
        }
        
        if (isOld && hookThis !== child.props['hookTo.'])
          isOld = false;
        compIdx[keyid] = iPos;
        if (!isOld)
          bComp[iPos] = reactClone_(child,{'hookTo.':hookThis, key:sKey, 'keyid.':keyid});
      });
    });
    
    return dState;
  }
  
//componentDidMount() {
//  super.componentDidMount();
//}
//componentWillUnmount() {
//  super.componentWillUnmount();
//}
//setChild() {
//  super.setChild.apply(this,arguments);
//}
  
  willResizing(wd, hi, inPending) {
    return false; // ignore resizing, Span not support resizing evnet
  }
  
  prepareState() {
    console.log('warning: inline widget not support prepareState()');
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return reactCreate_('span',displayNoneProp_);
    
    var props = setupRenderProp_(this);
    var b = this.$gui.comps, children = b.length?b:this.state['html.'];
    return reactCreate_(this.props['tagName.'], props, children);
  }
}

T.Span_ = TSpan_;
T.Span  = new TSpan_();
var Span__ = createClass_(T.Span._extend());

class THiddenSpan_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'HiddenSpan',desc);
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    this.hideThis = true;
    return dState;
  }
}

T.HiddenSpan_ = THiddenSpan_;
T.HiddenSpan  = new THiddenSpan_();

class TBr_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Br',desc);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'br';
    return props;
  }
}

T.Br_ = TBr_;
T.Br  = new TBr_();

class TA_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'A',desc);
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'a';
    return props;
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.preventDefault();  // avoid jump to target href
    if (this.$onClick) this.$onClick(event);
  }
}

T.A_ = TA_;
T.A  = new TA_();

T.Q_ = simpleExtends(TSpan_,'Q');
T.Q  = new T.Q_();
T.Abbr_ = simpleExtends(TSpan_,'Abbr');
T.Abbr  = new T.Abbr_();

function addStepFunc_(comp) {
  comp.stepPlay = function(fSpeed) {      // not use fSpeed
    if (this.isHooked) {
      var node = findDomNode_(this);
      if (node && node.readyState >= 2) { // 2: HAVE_CURRENT_DATA
        node.play();
        return true;
      }
    }
    return false;
  };
  
  comp.stepPause = function(sReason) {    // sReason: JUMP_PAGE,NEXT_PAGE,PRE_STEP,POST_STEP
    if (this.isHooked) {
      var node = findDomNode_(this);
      if (node) {
        if (!node.paused)
          node.pause();
        return true;
      }
    }
    return false;
  };
  
  comp.stepIsDone = function() {
    if (!this.isHooked) return true;
    var node = findDomNode_(this);
    return !node || node.readyState < 2 || node.paused;
  };
}

class TAudio_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Audio',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.src = [iLevel+1,'string',null];
    dSchema.autoPlay = [iLevel+2,'string',['','autoplay']];
    dSchema.controls = [iLevel+3,'string',['','controls']];
    dSchema.loop = [iLevel+4,'string',['','loop']];
    dSchema.muted = [iLevel+5,'string',['','muted']];
    dSchema.preload = [iLevel+6,'string',['auto','meta','none']];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'audio';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    addStepFunc_(this);
    return dState;
  }
}

T.Audio_ = TAudio_;
T.Audio  = new TAudio_();

T.Source_ = simpleExtends(TSpan_,'Source');
T.Source  = new T.Source_();
T.Track_ = simpleExtends(TSpan_,'Track');
T.Track  = new T.Track_();
T.Bdi_ = simpleExtends(TSpan_,'Bdi');
T.Bdi  = new T.Bdi_();
T.Bdo_ = simpleExtends(TSpan_,'Bdo');
T.Bdo  = new T.Bdo_();
T.Data_ = simpleExtends(TSpan_,'Data');
T.Data  = new T.Data_();
T.Mark_ = simpleExtends(TSpan_,'Mark');
T.Mark  = new T.Mark_();
T.Wbr_ = simpleExtends(TSpan_,'Wbr');
T.Wbr  = new T.Wbr_();
T.Button_ = simpleExtends(TSpan_,'Button');
T.Button  = new T.Button_();

class TTextarea_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Textarea',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.disabled = [ iLevel+1,'string',['','disabled'] ];
    dSchema.readonly = [ iLevel+2,'string',['','readonly'] ];
    dSchema.placeholder = [ iLevel+3,'string' ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'textarea';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    if (this.props.defaultValue !== undefined)
      this.$gui.tagAttrs.push('defaultValue');
    if (this.props.value === undefined)
      this.defineDual('value');
    
    return dState;
  }
  
  $$onChange(event) {
    this.duals.value = event.target.value;
    if (this.$onChange) this.$onChange(event);
  }
}

T.Textarea_ = TTextarea_;
T.Textarea  = new TTextarea_();

class TProgress_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Progress',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.value = [ iLevel+1,'string' ];
    dSchema.max = [ iLevel+2,'string' ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'progress';
    return props;
  }
}

T.Progress_ = TProgress_;
T.Progress  = new TProgress_();

class TImg_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Img',desc);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'img';
    return props;
  }
  
  $$onDragStart(event) {
    if (W.__design__) {
      event.preventDefault();  // disable img draggable
      return;
    }
    if (this.$onDragStart)
      this.$onDragStart(event);
  }
}

T.Img_ = TImg_;
T.Img  = new TImg_();

class TVideo_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Video',desc);
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'video';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    addStepFunc_(this);
    return dState;
  }
}

T.Video_ = TVideo_;
T.Video  = new TVideo_();

T.Canvas_ = simpleExtends(TSpan_,'Canvas');
T.Canvas  = new T.Canvas_();
T.Picture_ = simpleExtends(TSpan_,'Picture');
T.Picture  = new T.Picture_();
T.Map_ = simpleExtends(TSpan_,'Map');
T.Map  = new T.Map_();
T.Area_ = simpleExtends(TSpan_,'Area');
T.Area  = new T.Area_();
T.Time_ = simpleExtends(TSpan_,'Time');
T.Time  = new T.Time_();
T.Output_ = simpleExtends(TSpan_,'Output');
T.Output  = new T.Output_();

class TInput_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Input',desc);
    this._htmlText = false;
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    Object.assign(dSchema, {
      type: [ iLevel+1,'string',['text','button','checkbox','file','hidden','image',
              'password','radio','reset','submit',
              'color','date','datetime','datetime-local','email','month',
              'number','range','search','tel','time','url','week'] ],
      checked: [ iLevel+2,'string',['','checked'] ],
      disabled: [ iLevel+3,'string',['','disabled'] ],
      readonly: [ iLevel+4,'string',['','readonly'] ],
      value: [ iLevel+5,'string' ],
      placeholder: [ iLevel+6,'string' ],
      min: [ iLevel+7,'string' ],
      max: [ iLevel+8,'string' ],
      step: [ iLevel+9,'string' ],
      pattern: [ iLevel+10,'string' ],
      src: [ iLevel+11,'string' ],
      defaultValue: [ iLevel+12,'string' ],
      defaultChecked: [ iLevel+13,'string' ],
      required: [ iLevel+14,'string',['','required'] ],
    });
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'input';
    props.type = 'text';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.props.defaultValue !== undefined)
      this.$gui.tagAttrs.push('defaultValue');    // take as duals.defaultValue
    if (this.props.defaultChecked !== undefined)
      this.$gui.tagAttrs.push('defaultChecked');  // take as duals.defaultChecked
    
    if (this.props.value === undefined) {
      var sType = this.props.type;
      if (sType !== 'checkbox' && sType !== 'radio')
        this.defineDual('value');  // force regist duals.value
    }
    
    return dState;
  }
  
  $$onChange(event) {
    var sType = this.props.type;
    if (sType === 'checkbox' || sType === 'radio')
      this.duals.checked = event.target.checked;
    else this.duals.value = event.target.value;
    if (this.$onChange) this.$onChange(event);
  }
}

T.Input_ = TInput_;
T.Input  = new TInput_();

T.Keygen_ = simpleExtends(TSpan_,'Keygen');
T.Keygen  = new T.Keygen_();

class TLabel_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Label',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.htmlFor = [ iLevel+1,'string',null,'[string]: indicate which input widget' ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'label';
    return props;
  }
}

T.Label_ = TLabel_;
T.Label  = new TLabel_();

T.Legend_ = simpleExtends(TSpan_,'Legend');
T.Legend  = new T.Legend_();
T.Sub_ = simpleExtends(TSpan_,'Sub');
T.Sub  = new T.Sub_();
T.Sup_ = simpleExtends(TSpan_,'Sup');
T.Sup  = new T.Sup_();

class TSelect_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Select',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.multiple = [ iLevel+1,'string',['','multiple'] ];
    dSchema.disabled = [ iLevel+2,'string',['','disabled'] ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'select';
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    if (this.props.defaultValue !== undefined)
      this.$gui.tagAttrs.push('defaultValue');
    if (this.props.value === undefined)
      this.defineDual('value');
    
    return dState;
  }
  
  $$onChange(event) {
    this.duals.value = event.target.value;
    if (this.$onChange) this.$onChange(event);
  }
}

T.Select_ = TSelect_;
T.Select  = new TSelect_();

T.Datalist_ = simpleExtends(TSelect_,'Datalist');
T.Datalist  = new T.Datalist_();

class TOptgroup_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Optgroup',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.label = [ iLevel+1,'string' ];
    dSchema.disabled = [ iLevel+2,'string',['','disabled'] ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'optgroup';
    return props;
  }
}

T.Optgroup_ = TOptgroup_;
T.Optgroup  = new TOptgroup_();

T.Option_ = simpleExtends(TSpan_,'Option');
T.Option  = new T.Option_();
T.B_ = simpleExtends(TSpan_,'B');
T.B  = new T.B_();
T.I_ = simpleExtends(TSpan_,'I');
T.I  = new T.I_();
T.S_ = simpleExtends(TSpan_,'S');
T.S  = new T.S_();
T.U_ = simpleExtends(TSpan_,'U');
T.U  = new T.U_();
T.Ins_ = simpleExtends(TSpan_,'Ins');
T.Ins  = new T.Ins_();
T.Del_ = simpleExtends(TSpan_,'Del');
T.Del  = new T.Del_();
T.Code_ = simpleExtends(TSpan_,'Code');
T.Code  = new T.Code_();
T.Var_ = simpleExtends(TSpan_,'Var');
T.Var  = new T.Var_();
T.Summary_ = simpleExtends(TSpan_,'Summary');
T.Summary  = new T.Summary_();
T.Em_ = simpleExtends(TSpan_,'Em');
T.Em  = new T.Em_();
T.Strong_ = simpleExtends(TSpan_,'Strong');
T.Strong  = new T.Strong_();
T.Big_ = simpleExtends(TSpan_,'Big');
T.Big  = new T.Big_();
T.Small_ = simpleExtends(TSpan_,'Small');
T.Small  = new T.Small_();
T.Dfn_ = simpleExtends(TSpan_,'Dfn');
T.Dfn  = new T.Dfn_();
T.Samp_ = simpleExtends(TSpan_,'Samp');
T.Samp  = new T.Samp_();
T.Kdb_ = simpleExtends(TSpan_,'Kdb');
T.Kdb  = new T.Kdb_();
T.Cite_ = simpleExtends(TSpan_,'Cite');
T.Cite  = new T.Cite_();
T.Dialog_ = simpleExtends(TSpan_,'Dialog');
T.Dialog  = new T.Dialog_();

class TMeter_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'Meter',desc);
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.value = [ iLevel+1,'string' ];
    dSchema.high = [ iLevel+2,'string' ];
    dSchema.low = [ iLevel+3,'string' ];
    dSchema.max = [ iLevel+4,'string' ];
    dSchema.min = [ iLevel+5,'string' ];
    dSchema.optimum = [ iLevel+6,'string' ];
    return dSchema;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['tagName.'] = 'meter';
    return props;
  }
}

T.Meter_ = TMeter_;
T.Meter  = new TMeter_();

T.Embed_ = simpleExtends(TSpan_,'Embed');
T.Embed  = new T.Embed_();
T.Object_ = simpleExtends(TSpan_,'Object');
T.Object  = new T.Object_();
T.Param_ = simpleExtends(TSpan_,'Param');
T.Param  = new T.Param_();
T.Ruby_ = simpleExtends(TSpan_,'Ruby');
T.Ruby  = new T.Ruby_();
T.Rp_ = simpleExtends(TSpan_,'Rp');
T.Rp  = new T.Rp_();
T.Rt_ = simpleExtends(TSpan_,'Rt');
T.Rt  = new T.Rt_();

// NavXXX, GroundXXX, OptXXX, RefXXX
//-----------------------------------
function navSetChecked_(comp,checkedId,callback) {
  if (checkedId) {
    var gui = comp.$gui, navKey = gui.navSubkey;
    var oldId = comp.state.checkedId;
    if (gui.navItems[checkedId]) { // is valid checkedId
      if (!disableSwitch(oldId,checkedId)) {
        comp.state.checkedId = checkedId;  // set immediately
        comp.reRender(callback);   // auto choose checkedId GroundXX to render out
        return;
      }
    }
    else if (navKey) {
      var widget = comp.widget, subNav = widget && widget[navKey];
      subNav = subNav && subNav.component;
      if (subNav && subNav.props['isNavigator.'] && !disableSwitch(oldId,checkedId)) {
        comp.state.checkedId = checkedId; // set immediately, this level is OK whereas sub level may failed
        subNav.fireChecked(checkedId,callback);
        return;
      }
    }
    
    // set checkedId even if switch ground failed
    comp.state.checkedId = checkedId; // set immediately
  }
  
  if (callback) callback(); // failed
  
  function disableSwitch(oldId,checkedId) {  // checkedId not used yet
    if (oldId || oldId === 0) {
      var child = comp.widget;
      child = child && child[oldId];
      child = child && child.component;
      
      if (child && child.navWillLeave) { // GroundXX.navWillLeave defined
        var info = child.navWillLeave();
        if (!info || typeof info == 'string' && !window.confirm(info))
          return true; // navWillLeave() return false, or confirm(sMsg) denied
      }
    }
    return false;
  }
}

class TNavPanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'NavPanel',desc);
    this._silentProp.push('isNavigator.');
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['isNavigator.'] = 1;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    dState.checkedId = '';
    
    var gui = this.$gui;
    gui.navItems = {};
    gui.navOrder = [];
    gui.navSubkey = undefined;  // sub NavXX
    
    if (this.widget && this.widget === topmostWidget_)
      utils.instantShow('error: NavPanel/NavDiv can not be used at topmost.');
    
    gui.updateNavItems = function() {
      var bComp = gui.comps, iLen = bComp.length;
      gui.navSubkey = undefined;
      if (W.__design__)
        gui.navItems = {};
      // else, not W.__design__, GroundXX should not be online removed by setChild()
      
      var bExist = [];
      for (var i = 0; i < iLen; i++) {
        var child = bComp[i];
        if (child) {
          var iTmp, sKey = getElementKey_(child);
          if (!sKey) continue;
          
          if (child.props['isNavigator.']) gui.navSubkey = sKey;
          if ((parseInt(sKey)+'') === sKey) continue;
          
          if (child.props['isPlayground.']) {
            gui.navItems[sKey] = child;
            bExist.push([sKey,true]);
          }
          else bExist.push([sKey,false]);
        }
      }
      
      // remove no-using none-ground in gui.navOrder, and merge existing ground to bExist
      var iLastPos = bExist.length;
      for (var i=gui.navOrder.length-1; i >= 0; i--) {
        var item = gui.navOrder[i];
        if (item[1]) {  // is GroundXX
          if (findExistKey(item[0]) < 0)  // merge to bExist
            bExist.splice(iLastPos,0,item);
          // else, ignore
        }
        else {
          var iTmp = findExistKey(item[0]);
          if (iTmp < 0)  // the item removed just now
            gui.navOrder.splice(i,1);
          else iLastPos = iTmp;
        }
      }
      gui.navOrder = bExist;
      
      function findExistKey(sKey) {
        return bExist.findIndex( function(item) {
          return item[0] === sKey;
        });
      }
    };
    
    this.defineDual('childNumId', function(value,oldValue) {
      gui.updateNavItems();
    });
    
    return dState;
  }
  
  listOptComp(withKey) {
    var ret = [];
    var widget = this.widget;
    if (!widget) return ret;
    
    var comps = this.$gui.comps, iLen = comps.length;
    for (var i=0; i < iLen; i++) {
      var child = comps[i];
      if (child && !child.props['isPlayground.']) {
        var sKey = getElementKey_(child), wdgt = sKey && widget[sKey];
        if (wdgt && scanOneLevel(wdgt)) return ret;
      }
    }
    return ret;
    
    function scanOneLevel(wdgt) {
      var ownerObj = wdgt.component;
      if (ownerObj) {
        if (ownerObj.props['isOption.']) {
          if (withKey) {
            if (withKey === ownerObj.$gui.keyid) {
              ret.push(ownerObj);
              return true; // quit
            }
          }
          else ret.push(ownerObj);
        }
        else if (ownerObj.props['isNavigator.'])
          return false;  // quit, not scan sub level of NavXX
        else {
          var comps = ownerObj.$gui.comps, iLen = comps.length;
          for (var i=0; i < iLen; i++) {
            var child = comps[i];
            if (child) {
              var sKey = getElementKey_(child), childWdgt = sKey && wdgt[sKey];
              if (childWdgt && scanOneLevel(childWdgt))
                return true;
            }
          }
        }
      }
      return false;
    }
  }
  
  fireChecked(sKeyid, callback) {  // sKeyid should be string
    if (this.isHooked && sKeyid && sKeyid !== this.state.checkedId) {
      sKeyid = sKeyid + '';
      var b = this.listOptComp(sKeyid), childObj = b[0];
      if (childObj && childObj.setChecked) {
        childObj.setChecked(callback); // auto set this.state.checkedId
        return;
      }
      else if (!childObj) {  // no OptXX defined, try show GroundXX directly
        navSetChecked_(this,sKeyid,callback);
        return;
      }
    }
    if (callback) callback();
  }
  
  prepareState() {
    var gui = this.$gui, oldWd = gui.cssWidth, oldHi = gui.cssHeight;    
    var bChild = super.prepareState();
    
    if (!gui.isPanel && this.isHooked) { // pass resizing for Unit-like widget (TNavDiv_)
      if ((typeof gui.cssWidth == 'number' && oldWd !== gui.cssWidth) || (typeof gui.cssHeight == 'number' && oldHi !== gui.cssHeight) || utils.dragInfo.justResized) {
        var self = this;
        setTimeout(function() {
          propagateResizing_(self,utils.dragInfo.inDragging);
        },0);
      }
    }
    return bChild;
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState(); // bChild is copy of gui.comps
    
    if (W.__design__) {  // 'display:none' for none-active playground
      var wdgt = this.widget;
      if (wdgt) {
        setTimeout( function() {
          bChild.forEach( function(child) {
            var sKey = child && getElementKey_(child);
            var obj = sKey && wdgt[sKey];
            obj = obj && obj.component;
            if (obj) obj.reRender();  // re-render since 'display:none' not driven by attr-changing
          });
        },0);
      }
    }
    else {  // not includes none-active playground to render
      var checkedId = this.state.checkedId + '', idx = bChild.length-1, found = false;
      while (idx >= 0) {
        var child = bChild[idx];
        if (child.props['isPlayground.']) {
          if (checkedId && checkedId == getElementKey_(child))
            found = true;
          else bChild.splice(idx,1);
        }
        idx -= 1;
      }
      
      if (!found && checkedId) { // checkedId should be string
        var gui = this.$gui, child = gui.navItems[checkedId];
        if (child) {  // then, prepare GroundXX in order
          var iPos = gui.navOrder.findIndex(function(item){ return item[0] === checkedId; });
          if (iPos < 0)
            bChild.push(child);
          else {
            var bNear = gui.navOrder.slice(iPos+1), iFrom = 0;
            var iTarg, iPos2, succ = false;
            while ((iTarg = bNear.findIndex(function(item,idx){ return idx >= iFrom && !item[1]; })) >= 0) {
              iPos2 = findInsPos(bChild,bNear[iTarg][0]); // bNear[iTarg][0] is none-ground sKeyid
              if (iPos2 >= 0) {
                succ = true;
                break;
              }
              iFrom = iTarg;
            }
            
            if (!succ)
              bChild.push(child);
            else bChild.splice(iPos2,0,child);
          }
        }
      }
    }
    
    var props = setupRenderProp_(this);
    return reactCreate_('div',props,bChild);
    
    function findInsPos(bChild,sKey) {
      for (var i=0,child; child=bChild[i]; i++) {
        if (sKey == getElementKey_(child)) return i;
      }
      return -1;
    }
  }
}

T.NavPanel_ = TNavPanel_;
T.NavPanel  = new TNavPanel_();

class TNavDiv_ extends TNavPanel_ {
  constructor(name,desc) {
    super(name || 'NavDiv',desc);
    // this._silentProp.push('isNavigator.');
    this._silentProp.push('tagName.');
    this._defaultProp.height = undefined;
    this._defaultProp.minHeight = 20;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.className = 'rewgt-unit';  // overwrite TNavPanel_'s default
    dProp['isNavigator.'] = 2;
    dProp['tagName.'] = 'div';
    dProp.height = null;
    dProp.minHeight = 20;
    return dProp;
  }
}

T.NavDiv_ = TNavDiv_;
T.NavDiv  = new TNavDiv_();

function designRenderGround(obj,iGroundId) {
  syncProps_(obj);
  if (obj.hideThis) return null;   // as <noscript>
  
  var owner = obj.widget;
  owner = owner && owner.parent;
  var inNav = false, checkedId = undefined, ownerObj = owner && owner.component;
  if (ownerObj && ownerObj.props['isNavigator.']) {
    checkedId = ownerObj.state.checkedId || '';
    inNav = true;
  }
  
  var bChild = obj.prepareState();
  var dStyle = Object.assign({},obj.state.style);
  if (inNav) {
    if (checkedId && checkedId == obj.$gui.keyid) // show it
      dStyle.display = 'block';
    else dStyle.display = 'none';  // hide it
  }
  // else, keep dStyle.display no changing
  
  if (!bChild.length && iGroundId == 2)
    bChild = obj.state['html.'] || null;
  
  var props = setupRenderProp_(obj,dStyle);
  return reactCreate_('div',props,bChild);
}

class TGroundPanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'GroundPanel',desc);
    this._silentProp.push('isPlayground.');
    this._defaultProp.height = undefined;
    this._defaultProp.minHeight = 20;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['isPlayground.'] = 1;
    props.width = 0.9999;
    props.height = null;
    props.minHeight = 20;
    return props;
  }
  
  render() {
    if (W.__design__)
      return designRenderGround(this,1);
    else return super.render();
  }
}

T.GroundPanel_ = TGroundPanel_;
T.GroundPanel  = new TGroundPanel_();

class TGroundDiv_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'GroundDiv',desc);
    this._silentProp.push('tagName.','isPlayground.');
    this._defaultProp.height = undefined;
    this._defaultProp.minHeight = 20;
    this._htmlText = true;
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    // props.className = 'rewgt-unit'; // default is 'rewgt-unit'
    // props['childInline.'] = false;  // default is false
    props.width = 0.9999;
    props.height = null;
    props.minHeight = 20;
    props['tagName.'] = 'div';
    props['isPlayground.'] = 2;
    return props;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    dState['html.'] = null;
    this.defineDual('html.', function(value,oldValue) {
      this.state['html.'] = value || null;
    });
    
    return dState;
  }
  
  render() {
    if (W.__design__)
      return designRenderGround(this,2);
    else {
      syncProps_(this);
      if (this.hideThis) return null;   // as <noscript>
      
      var bChild = this.prepareState();
      var props = setupRenderProp_(this);
      return reactCreate_(this.props['tagName.'], props, bChild.length?bChild:this.state['html.']);
    }
  }
}

T.GroundDiv_ = TGroundDiv_;
T.GroundDiv  = new TGroundDiv_();

function findNavOwner_(thisObj) {
  var owner = thisObj.widget;
  owner = owner && owner.parent;
  
  while (owner) {
    var ownerObj = owner.component;
    if (ownerObj) {
      if (ownerObj.props['isNavigator.'])
        return ownerObj;
      owner = owner.parent;
    }
    else break;
  }
  
  return null;
}

function optPopWindow_(self,popOption,newOpt,callback) { // callback should be available function
  if (typeof popOption.path == 'string') {
    if (!popOption.state) popOption.state = {opened:false};
    if (newOpt) {
      delete newOpt.state;
      popOption = Object.assign({},popOption,newOpt);
    }
    else popOption = Object.assign({},popOption);
    
    if (!popOption.state.opened) {
      var sPath = popOption.path;
      if (!sPath) sPath = './' + this.$gui.keyid;
      var ele = self.componentOf(sPath);
      ele = ele && ele.fullClone();
      
      if (!ele)
        utils.instantShow('warning: can not locate popup window (' + sPath + ').');
      else {
        utils.popWin.showWindow(ele,popOption, function() {
          self.duals['data-checked'] = '1';
          callback(true);
        },self);
        return;
      }
    }
  }
  
  callback(false);  // popup window failed
}

function trySyncUncheck_(self,ownerObj) {
  if (!ownerObj) ownerObj = self.findNavOwner();
  if (!ownerObj) return;
  
  var thisKey = self.$gui.keyid, bList = ownerObj.listOptComp();
  bList.forEach( function(comp) {
    if (comp !== self && comp.clearChecked && comp.$gui.keyid !== thisKey)
      comp.clearChecked();
  });
}

function setOptChecked_(self,callback,newOpt,isForce) {
  function delayCallback(bTime) {
    var iWait = bTime.shift();
    if (iWait) {
      setTimeout( function() {
        if (self.state['data-checked'])
          callback();
        else delayCall(bTime);
      },iWait);
    }
    else callback();  // force callback
  }
  
  var popOption = self.state.popOption;
  if (popOption) {
    if (!popOption.state || !popOption.state.opened) {
      optPopWindow_(self,popOption,newOpt, function(succ) {
        if (callback) callback();
      });
      return;
    }
    else {  // popOption.state.opened, fired by duals['data-checked'] = '1'
      if (!isForce) return; // else, isForce, continue next process
    }
  }
  
  if (!self.state['data-checked']) {
    self.duals['data-checked'] = '1';  // redirect to duals['data-checked'] = '1'
    if (callback) delayCallback([100,100,100]); // max wait 300 ms, if not ready force callback
    return;
  }
  
  var recheckable = self.state.recheckable;
  if (recheckable) {
    self.state.recheckable = false;   // avoid re-enter
    setTimeout( function() {
      self.state.recheckable = true;
    },300);
  }
  
  var justSet = false, ownerObj = null;
  function doCallback() {
    if (justSet) {
      trySyncUncheck_(self,ownerObj);
      self.fireTrigger();
    }
    if (callback) callback();
  }
  
  if (self.state.isolated) {
    if (isForce || recheckable)
      justSet = true;
    doCallback();
    return;
  }
  
  ownerObj = self.findNavOwner();
  if (ownerObj) {
    var sKeyid = self.$gui.keyid + '';
    if (ownerObj.state.checkedId !== sKeyid || isForce || recheckable) {
      if (!ownerObj.canNavigateTo || ownerObj.canNavigateTo(sKeyid)) {
        if (isForce || recheckable)
          justSet = true;
        navSetChecked_(ownerObj,sKeyid,doCallback); // fire navigation
        return;
      }
    }
  }
  doCallback();
}

function defineOptDual_(self,state) {
  state.isolated = false;
  self.defineDual('isolated', function(value,oldValue) {
    this.state.isolated = (value === 'false' || value === '0'? false: !!value);
  });
  
  state.recheckable = false;
  self.defineDual('recheckable', function(value,oldValue) {
    this.state.recheckable = (value === 'false' || value === '0'? false: !!value);
  });
  
  self.defineDual('popOption');
  
  state['data-checked'] = '';
  self.defineDual('data-checked', function(value,oldValue) {
    var sOld = oldValue === 'false' || oldValue === '0' || !oldValue ? '' : '1';
    var sNew = value === 'false' || value === '0' || !value ? '' : '1';
    if (sOld != sNew) {
      if (sNew) {
        self.state['data-checked'] = sNew;      // avoid recusive dual-assign
        setTimeout( function() {
          self.setChecked(null,undefined,true); // callback=null, isForce=true
        },0);
      }
      else self.state['data-checked'] = sNew;
    }
    else self.state['data-checked'] = sOld;     // no changing, fix value to '' or '1'
  });
}

function addOptSchema_(dSchema,iLevel) {
  var sBoolStr = '[string]: "" or "1"';
  dSchema['data-checked'] = [ iLevel+1,'string',null,sBoolStr ];
  dSchema.isolated = [ iLevel+2,'string',null,sBoolStr ];
  dSchema.recheckable = [ iLevel+3,'string',null,sBoolStr ];
  dSchema.trigger = [iLevel+4,'string',null,'[string]: [sPath,{trigger,pop_option},[sPath,modifier], ...]'];
  dSchema.popOption = [iLevel+5,'object',null,'[object]: {path:bodyElePath}'];
  return dSchema;
}

class TOptSpan_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'OptSpan',desc);
    this._statedProp.push('data-checked');
    this._silentProp.push('isOption.');
    this._defaultProp['data-checked'] = '';
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    return addOptSchema_(dSchema,iLevel);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['data-checked'] = '';  // force using this.state['data-checked']
    dProp['isOption.'] = true;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    defineOptDual_(this,dState);
    return dState;
  }
  
  findNavOwner() {
    return findNavOwner_(this);
  }
  
  fireTrigger() {
    fireTrigger_(undefined,this);  // auto check gui.syncTrigger // force fire action
  }
  
  clearChecked() {  // only clear this, not sync others in same group
    if (this.state['data-checked'])
      this.duals['data-checked'] = '';
  }
  
  setChecked(callback,newOpt,isForce) { // isForce means force re-selelect
    setOptChecked_(this,callback,newOpt,isForce);
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.stopPropagation();
    this.setChecked(null);
    if (this.$onClick) this.$onClick(event); // call by pass this
  }
}

T.OptSpan_ = TOptSpan_;
T.OptSpan  = new TOptSpan_();

class TOptA_ extends TOptSpan_ {
  constructor(name,desc) {
    super(name || 'OptA',desc);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'a';
    return dProp;
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.preventDefault();  // avoid jump to target href
    super.$$onClick(event);
  }
}

T.OptA_ = TOptA_;
T.OptA  = new TOptA_();

class TOptImg_ extends TOptSpan_ {
  constructor(name,desc) {
    super(name || 'OptImg',desc);
    this._htmlText = false;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'img';
    return dProp;
  }
}

T.OptImg_ = TOptImg_;
T.OptImg  = new TOptImg_();

class TOptButton_ extends TOptSpan_ {
  constructor(name,desc) {
    super(name || 'OptButton',desc);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'button';
    return dProp;
  }
}

T.OptButton_ = TOptButton_;
T.OptButton  = new TOptButton_();

class TOptOption_ extends TOptSpan_ {
  constructor(name,desc) {
    super(name || 'OptOption',desc);
    this._silentProp.push('selected'); // not save 'selected', suggest only using 'data-checked'
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.value = [ iLevel+1,'string' ];
    dSchema.label = [ iLevel+2,'string' ];
    dSchema.disabled = [ iLevel+3,'string',['','disabled'] ];
    return dSchema;
  }
  
  getInitialState() {
    var dState = super.getInitialState(), gui = this.$gui;
    
    this.defineDual('data-checked', function(value,oldValue) {
      var sValue = (value === 'false' || value === '0' || !value? '': '1');
      if (this.props.hasOwnProperty('selected'))
        this.state.selected = sValue; // avoid using duals.selected = xx
      
      var self = this;
      setTimeout( function() {
        var node = findDomNode_(self);
        if (node) node.selected = !!value; // maybe no duals.selected, synchorized here
      },0);
    });
    return dState;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'option';
    return dProp;
  }
}

T.OptOption_ = TOptOption_;
T.OptOption  = new TOptOption_();

class TOptDiv_ extends TDiv_ {
  constructor(name,desc) {
    super(name || 'OptDiv',desc);
    this._statedProp.push('data-checked');
    this._silentProp.push('isOption.');
    this._defaultProp['data-checked'] = '';
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    return addOptSchema_(dSchema,iLevel);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'div';
    dProp['data-checked'] = '';
    dProp['isOption.'] = true;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    defineOptDual_(this,dState);
    return dState;
  }
  
  findNavOwner() {
    return findNavOwner_(this);
  }
  
  fireTrigger() {
    fireTrigger_(undefined,this);
  }
  
  clearChecked() {  // only clear this, not sync others in same group
    if (this.state['data-checked'])
      this.duals['data-checked'] = '';
  }
  
  setChecked(callback,newOpt,isForce) {
    setOptChecked_(this,callback,newOpt,isForce);
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.stopPropagation();
    this.setChecked(null);
    if (this.$onClick) this.$onClick(event); // by pass this
  }
}

T.OptDiv_ = TOptDiv_;
T.OptDiv  = new TOptDiv_();

class TOptLi_ extends TP_ {
  constructor(name,desc) {
    super(name || 'OptLi',desc);
    this._statedProp.push('data-checked');
    this._silentProp.push('isOption.');
    this._defaultProp['data-checked'] = '';
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    return addOptSchema_(dSchema,iLevel);
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps(); // default width/height as TP_
    dProp['tagName.'] = 'li';
    dProp['data-checked'] = '';
    dProp['isOption.'] = true;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    defineOptDual_(this,dState);
    return dState;
  }
  
  findNavOwner() {
    return findNavOwner_(this);
  }
  
  fireTrigger() {
    fireTrigger_(undefined,this);
  }
  
  clearChecked() {  // only clear this, not sync others in same group
    if (this.state['data-checked'])
      this.duals['data-checked'] = '';
  }
  
  setChecked(callback,newOpt,isForce) {
    setOptChecked_(this,callback,newOpt,isForce);
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.stopPropagation();
    this.setChecked(null);
    if (this.$onClick) this.$onClick(event); // by pass this
  }
}

T.OptLi_ = TOptLi_;
T.OptLi  = new TOptLi_();

class TOptInput_ extends TOptSpan_ {
  constructor(name,desc) {  // input.type: checkbox radio button image reset submit
    super(name || 'OptInput',desc);
    this._htmlText = false;
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.type = [ iLevel+1,'string',['checkbox','radio','button','image'] ];
    dSchema.value = [ iLevel+2,'string' ];
    dSchema.src = [ iLevel+3,'string' ];
    return dSchema;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['tagName.'] = 'input';
    dProp.type = 'checkbox';
    dProp.checked = '';
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    if (this.props.defaultValue !== undefined)
      this.$gui.tagAttrs.push('defaultValue');  // data-checked should replace duals.defaultChecked
    if (this.props.value === undefined) {
      var sType = this.props.type;
      if (sType !== 'checkbox' && sType !== 'radio')
        this.defineDual('value');  // force regist duals.value
    }
    
    this.defineDual('data-checked', function(value,oldValue) {
      var sValue = (value === 'false' || value === '0' || !value? '': '1');
      this.state.checked = sValue; // not use duals.checked = xx
    });
    
    return dState;
  }
  
  clearChecked(targ) {
    if (!targ) targ = findDomNode_(this);
    if (targ) {
      if (targ.checked) targ.checked = false; // will trigger onChange
      if (this.state['data-checked'])
        this.duals['data-checked'] = '';
    }
  }
  
  $$onChange(event) {
    if (W.__design__)
      event.stopPropagation();
    
    var sType = this.state.type, targ = event.target;
    if (sType === 'checkbox' || sType === 'radio') {
      if (targ.checked)
        this.setChecked(null);
      else this.clearChecked(targ);
    }
    else this.duals.value = targ.value;
    
    if (this.$onChange) this.$onChange(event);
  }
  
  $$onClick(event) {
    if (W.__design__)
      event.stopPropagation();
    var sType = this.state.type;
    if (sType !== 'checkbox' && sType !== 'radio')
      this.setChecked(null);
    
    if (this.$onClick) this.$onClick(event);
  }
}

T.OptInput_ = TOptInput_;
T.OptInput  = new TOptInput_();

function setTemplateChild_(temp,child) {
  var sPath = getElementKey_(child);
  if (!sPath) return false;  // child of template must has key, otherwise, can not be referenced
  
  var iTmp = parseInt(sPath), keyid_ = (iTmp+'') === sPath? iTmp: sPath;
  var ele, iFlag = 1;
  if (child.props['isReference.']) {
    iFlag = 2;
    if (sPath[0] == '$') {
      sPath = sPath.slice(1);
      var iTmp = parseInt(sPath);
      if ((iTmp + '') == sPath)
        keyid_ = iTmp;
    }
    ele = reactClone_(child,{'hookTo.':temp,'keyid.':keyid_,key:sPath});
  }
  else {
    ele = reactClone_(child,{'hookTo.':temp,'keyid.':keyid_,key:sPath});
    if (child.props['isTemplate.']) {
      iFlag = 4;
      ele = new templateNode(ele);
      ele.pathSeg = sPath;
    }
    else if (child.props['isNavigator.'])
      iFlag = 3;
  }
  
  var bInfo = [iFlag,ele,''];
  temp.comps[sPath] = bInfo;
  if (iFlag != 2)  // no need scan child of ref node
    scanEveryChild(temp,sPath,bInfo,'');
  return true;
  
  function scanEveryChild(temp,sPath,bInfo,ownerSeg) {
    var iFlag = bInfo[0], ele = bInfo[1];
    var children = iFlag == 4? ele.element.props.children: ele.props.children; // not use childElements_() since we only scan in initializing
    if (!children) return;
    
    var ownerSeg2 = ownerSeg;
    if (iFlag == 3)
      ownerSeg2 = sPath;
    else if (iFlag == 4) {
      temp = ele;
      ownerSeg2 = sPath;
      sPath = '';
    }
    
    React.Children.forEach(children, function(child,idx) {
      var keyid = child.props['keyid.'];
      if (!keyid && keyid !== 0) {
        var sKey = getElementKey_(child);
        if (sKey) {
          var iTmp = parseInt(sKey);
          if (iTmp + '' === sKey)
            keyid = iTmp;
          else keyid = sKey;
        }
        else keyid = idx;
      }
      
      var sKeyid = keyid + '';
      var iFlag2 = 1, ele2 = reactClone_(child,{'keyid.':keyid, key:sKeyid, 'hookTo.':temp});
      var sPath2 = sPath? sPath + '.' + sKeyid: sKeyid;
      if (child.props['isTemplate.']) {
        iFlag2 = 4;
        ele2 = new templateNode(ele2);
        ele2.pathSeg = sPath2;  // ownerTemp.comps[pathSeg] = [4,ele2, ...]
      }
      else if (child.props['isNavigator.'])
        iFlag2 = 3;
      else if (child.props['isReference.'])
        iFlag2 = 2;
      
      var bInfo2 = [iFlag2,ele2,ownerSeg2];
      temp.comps[sPath2] = bInfo2;
      if (iFlag2 != 2)
        scanEveryChild(temp,sPath2,bInfo2,ownerSeg2); // sPath2 must not ''
    });
  }
}

function setupTemplateTree(thisObj) {  // add thisObj.$gui.template
  var owner = thisObj.widget, temp = null;
  owner = owner && owner.parent;
  if (owner) {
    var ownerObj = owner.component;
    if (ownerObj) {
      var idx = ownerObj.$gui.compIdx[thisObj.$gui.keyid];
      if (typeof idx == 'number') {
        var ele = ownerObj.$gui.comps[idx];  // find TempDiv/TempSpan from owner widget
        if (ele)  // ele.props['hookTo.'] === owner
          temp = new templateNode(ele);      // temp.pathSeg = ''
      }
    }
  }
  if (!temp) return false;
  
  thisObj.$gui.template = temp;
  var bComp = thisObj.$gui.comps, iLen = bComp.length;
  for (var i = 0; i < iLen; i++) {
    var child = bComp[i];
    if (child) setTemplateChild_(temp,child);
  }
  return true;
}

function checkForIfElse_(gui) {
  var sFlowName = '';
  if (gui.forExpr) {
    sFlowName = 'for';
    gui.forExpr = 0;
  }
  else if (gui.flowFlag) {
    sFlowName = gui.flowFlag;
    gui.flowFlag = '';
  }
  if (sFlowName) {
    console.log("error: can not use '$" + sFlowName + "' in template widget");
    var iPos = gui.exprAttrs.indexOf(sFlowName);
    if (iPos >= 0) gui.exprAttrs.splice(iPos,1);
  }
}

function templateElement_(thisObj,sPath) {
  if (!sPath || typeof sPath != 'string') return null;  // can not get template's element
  
  var ch = sPath[0];
  if (ch != '.' && ch != '/') {
    var tempNode = thisObj.$gui.template;
    if (!tempNode) return null;
    
    var bSeg = sPath.split('.'), tempPath = bSeg.shift();
    var b = tempNode.comps[tempPath];
    while (b) {
      var iType = b[0], next = b[1];
      if (iType == 2) {  // ref, no sub level  // [2,element,sOwnerSeg]
        return (bSeg.length == 0? next: null);
      }
      else if (iType == 4) {    // template: [4,tempNode,sOwnerSeg]
        if (bSeg.length == 0) return null;     // can not get template's element
        
        tempNode = next; next = tempNode.element;
        tempPath = bSeg.shift();
        b = tempNode.comps[tempPath];
      }
      else { // 1:normal 3:nav  // [iType,element,sOwnerSeg]
        if (bSeg.length == 0) return next;
        tempPath += '.' + bSeg.shift();
        b = tempNode.comps[tempPath];
      }
    }
  }
  else {
    var iPos = sPath.lastIndexOf('./');  // any of: ./  or ../
    if (iPos >= 0) {
      var comp = thisObj.componentOf(sPath.slice(0,iPos+2))
      return comp? comp.elementOf(sPath.slice(iPos+2)): null;
    }
    else if (ch == '.') {  // absolute path
      iPos = sPath.indexOf('.',1);
      if (iPos > 1) {
        var wdgt = W.W(sPath.slice(0,iPos)), comp = wdgt && wdgt.component;
        if (comp) return comp.elementOf(sPath.slice(iPos+1));
      }
    }
    else if (ch == '/' && sPath[1] == '/') {
      var ownerObj = thisObj.parentOf();
      return ownerObj? ownerObj.elementOf(sPath.slice(2)): null;
    }
    // else, unknown format
  }
  return null;
}

class TTempPanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'TempPanel',desc);
    this._silentProp.push('isTemplate.','data-temp.type');
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['isTemplate.'] = 1;
    if (W.__design__)
      dProp['data-temp.type'] = 1;
    else {
      dProp.width = 0;
      dProp.height = 0; // use zero size to help flex display
    }
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    checkForIfElse_(this.$gui);
    this.isLibGui = false;
    var style_ = this.props.style;
    if (this.props['hookTo.'] === topmostWidget_) {
      this.duals.style = style_ = Object.assign({},style_,{position:'absolute'});
      if ((this.$gui.keyid+'').indexOf('$$') == 0) this.isLibGui = true;
    }
    
    if (W.__design__ && !this.isLibGui) {
      this.duals.style = Object.assign({},style_,{display:'none'}); // default hide it
      setupTemplateTree(this);
    }
    else { // not in __design__, show zero width-height
      var template = this.props['template'];
      if (template instanceof templateNode)
        this.$gui.template = template;     // pass from props.template, fixed (no changing)
      else setupTemplateTree(this);
      this.$gui.compIndex = {};
      this.$gui.comps = [];  // force no child, referenced to this.$gui.template
    }
    
    return dState;
  }
  
  elementOf(sPath) {
    return templateElement_(this,sPath);
  }
  
  render() {
    if (W.__design__ && !this.isLibGui) {
      return super.render();
    }
    else {
      syncProps_(this);
      if (this.hideThis) return null;   // as <noscript>
      
      var dStyle = Object.assign({},this.state.style,{width:'0px',height:'0px',display:'none'});
      var props = setupRenderProp_(this,dStyle);
      return reactCreate_('div',props);
    }
  }
}

T.TempPanel_ = TTempPanel_;
T.TempPanel  = new TTempPanel_();

class TTempDiv_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'TempDiv',desc);
    this._silentProp.push('isTemplate.','tagName.','data-temp.type');
    this._htmlText = true;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['isTemplate.'] = 2;
    dProp['tagName.'] = 'div';
    if (W.__design__) {
      // dProp.width = 0.9999; dProp.height = 0.9999;
      dProp['data-temp.type'] = 2;
    }
    else {
      dProp.width = 0;
      dProp.height = 0; // use zero size to help flex display
    }
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    checkForIfElse_(this.$gui);
    this.isLibGui = false;
    var style_ = this.props.style;
    if (this.props['hookTo.'] === topmostWidget_) {
      this.duals.style = style_ = Object.assign({},style_,{position:'absolute'});
      if ((this.$gui.keyid+'').indexOf('$$') == 0) this.isLibGui = true;
    }
    
    if (W.__design__ && !this.isLibGui) {
      this.duals.style = Object.assign({},style_,{display:'none'});  // default hide it
      setupTemplateTree(this);
    }
    else {
      var template = this.props['template'];
      if (template instanceof templateNode)
        this.$gui.template = template;  // fixed, no changing
      else setupTemplateTree(this);
      this.$gui.compIndex = {};
      this.$gui.comps = [];  // force no child, referenced to this.$gui.template
    }
    
    return dState;
  }
  
  elementOf(sPath) {
    return templateElement_(this,sPath);
  }
  
  render() {
    if (W.__design__ && !this.isLibGui)
      return super.render();
    else {
      syncProps_(this);
      if (this.hideThis) return null;   // as <noscript>
      
      var dStyle = Object.assign({},this.state.style,{width:'0px',height:'0px',display:'none'});
      var props = setupRenderProp_(this,dStyle);
      return reactCreate_('div',props);
    }
  }
}

T.TempDiv_ = TTempDiv_;
T.TempDiv  = new TTempDiv_();

class TTempSpan_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'TempSpan',desc);
    this._silentProp.push('isTemplate.','data-temp.type');
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['isTemplate.'] = 3;
    if (W.__design__)
      dProp['data-temp.type'] = 3;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    
    checkForIfElse_(this.$gui);
    this.isLibGui = false;  // fixed to false
    if (W.__design__) {
      this.duals.style = Object.assign({},this.props.style,{display:'none'});  // default hide it
      setupTemplateTree(this);
    }
    else {
      var template = this.props['template'];
      if (template instanceof templateNode)
        this.$gui.template = template;
      else setupTemplateTree(this);
      this.$gui.compIndex = {};
      this.$gui.comps = [];  // force no child, referenced to this.$gui.template
    }
    
    return dState;
  }
  
  elementOf(sPath) {
    return templateElement_(this,sPath);
  }
  
  render() {
    if (W.__design__)
      return super.render();
    else {
      syncProps_(this);
      if (this.hideThis) return reactCreate_('span',displayNoneProp_);
      
      var dStyle = Object.assign({},this.state.style,{width:'0px',height:'0px',display:'none'});
      var props = setupRenderProp_(this,dStyle);
      return reactCreate_('span',props);
    }
  }
}

T.TempSpan_ = TTempSpan_;
T.TempSpan  = new TTempSpan_();

class TRefDiv_ extends TUnit_ {
  constructor(name,desc) {
    super(name || 'RefDiv',desc);
    this._silentProp.push('isReference.');
    this._htmlText = true;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.width = 0;
    dProp.height = 0;
    dProp['isReference.'] = 1;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.props['hookTo.'] === topmostWidget_)
      utils.instantShow('warning: can not add RefDiv to topmost widget.');
    return dState;
  }
  
  componentDidMount() {
    super.componentDidMount();
    
    var owner;
    if (!inFirstLoading_ && (owner=this.widget)) {
      owner = owner.parent;
      var ownerObj = owner && owner.component;
      if (ownerObj)
        loadReference_(ownerObj,this.$gui.keyid+'',function(){});
    }
  }
  
  render() {
    // no need call syncProps_(this) and ignore this.hideThis
    var sCls = classNameOf(this);
    var dProp = {style:{width:'0px',height:'0px'}};
    if (sCls) dProp.className = sCls;
    return reactCreate_('div',dProp);
  }
}

T.RefDiv_ = TRefDiv_;
T.RefDiv  = new TRefDiv_();
var RefDiv__ = creator.RefDiv__ = createClass_(T.RefDiv._extend());

class TRefSpan_ extends TSpan_ {
  constructor(name,desc) {
    super(name || 'RefSpan',desc);
    this._silentProp.push('isReference.');
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp['isReference.'] = 2;
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.props['hookTo.'] === topmostWidget_)
      utils.instantShow('error: can not hook RefSpan to topmost widget.');
    return dState;
  }
  
  componentDidMount() {
    super.componentDidMount();
    
    var owner;
    if (!inFirstLoading_ && (owner=this.widget)) {
      owner = owner.parent;
      var ownerObj = owner && owner.component;
      if (ownerObj)
        loadReference_(ownerObj,this.$gui.keyid+'', function(){});
    }
  }
  
  render() {
    // no need call syncProps_(this) and ignore this.hideThis
    var sCls = classNameOf(this);
    var dProp = {style:{width:'0px',height:'0px'}};
    if (sCls) dProp.className = sCls;
    return reactCreate_('span',dProp);
  }
}

T.RefSpan_ = TRefSpan_;
T.RefSpan  = new TRefSpan_();
var RefSpan__ = creator.RefSpan__ = createClass_(T.RefSpan._extend());

// ScenePage
//-----------------
class TScenePage_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'ScenePage',desc);
    this._silentProp.push('isScenePage.','isTemplate.');
    this._defaultProp.noShow = '';
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel+200);
    dSchema.noShow = [ iLevel+1,'string',['','1'],'[string]: disable show content' ];
    
    var sPerPixel = '[number]: 0~1 for percent, 0.9999 for 100%, N pixels';
    var bWd = dSchema.width, bHi = dSchema.height;
    if (bWd) { bWd[1] = 'number'; bWd[3] = sPerPixel; }
    if (bHi) { bHi[1] = 'number'; bHi[3] = sPerPixel; }
    return dSchema;
  }
  
  getDefaultProps() {
    var dProp = super.getDefaultProps();
    dProp.noShow = '';
    // dProp.width = 0.9999;   // default is 0.9999
    // dProp.height = 0.9999;  // defalut is 0.9999
    dProp['isScenePage.'] = 1;
    dProp.className = 'rewgt-panel rewgt-scene';
    return dProp;
  }
  
  getInitialState() {
    var dState = super.getInitialState();
    if (this.props['hookTo.'] !== topmostWidget_)
      utils.instantShow('error: ScenePage only hook to topmost widget.');
    
    var initStyle = Object.assign({},this.props.style,{position:'absolute',display:'none'}); // fixed to absolute, default hidden
    if (!initStyle.zIndex)
      initStyle.zIndex = '0'; // default is 0
    this.duals.style = initStyle;
    
    // ScenePage must have visible area
    var wd = this.props.width, hi = this.props.height;
    if (typeof wd != 'number' || !(wd > 0))  // NaN > 0 is false
      console.log('warning: invalid width of ScenePage (' + this.$gui.keyid + ')');
    if (typeof hi != 'number' || !(hi > 0))
      console.log('warning: invalid height of ScenePage (' + this.$gui.keyid + ')');
    
    if (W.__design__)
      this.$gui.currSelected = '';
    else { // if not __design__, take as TempPanel
      if (this.props['isTemplate.']) {   // props.noShow must be true
        checkForIfElse_(this.$gui);
        this.isLibGui = false;
        
        var template = this.props['template'];
        if (template instanceof templateNode)
          this.$gui.template = template; // pass from props.template, fixed (no changing)
        else setupTemplateTree(this);
        this.$gui.compIndex = {};
        this.$gui.comps = [];  // force no child, referenced to this.$gui.template
      }
    }
    
    return dState;
  }
  
  elementOf(sPath) {
    return this.props['isTemplate.']? templateElement_(this,sPath): super.elementOf(sPath);
  }
  
  setSelected(sKey) {
    if (!W.__design__) return; // only supported when in design
    
    var wdgt = this.widget, gui = this.$gui;
    if (gui.currSelected) { // try unselect old one
      if (sKey == gui.currSelected) return; // no change
      setSelected_(gui.currSelected,false);
      gui.currSelected = '';
    }
    if (sKey) {  // try select new one
      setSelected_(sKey,true);
      gui.currSelected = sKey;
    }
    
    function setSelected_(sKey,isSelect) {
      var childObj = wdgt && wdgt[sKey];
      childObj = childObj && childObj.component;
      if (!childObj) return;
      
      var iLevel = parseInt(childObj.state.style.zIndex) || 0;
      if (isSelect) {  // set to topmost
        if (iLevel >= -997 && iLevel <= 999) // not change -999 (to 1001) -998 (to 1000), take it as background
          childObj.setState({style:Object.assign({},childObj.state.style,{zIndex:iLevel+2000})});
      }
      else {  // restore to normal
        if (iLevel >= 1000 && iLevel <= 2999)
          childObj.setState({style:Object.assign({},childObj.state.style,{zIndex:iLevel-2000})});
      }
    }
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    if (this.props['isTemplate.']) {
      var dStyle = Object.assign({},this.state.style,{width:'0px',height:'0px',display:'none'});
      var props = setupRenderProp_(this,dStyle);
      return reactCreate_('div',props);
    }
    else {
      var bChild = this.prepareState();
      
      var dStyle = undefined;
      if (this.props.noShow && !W.__design__) { // if W.__design__, no change duals.style
        dStyle = Object.assign({},this.state.style);
        dStyle.display = 'none';
      }
      
      var centerDiv = reactCreate_('div',{'className':'rewgt-center'},bChild);
      var props = setupRenderProp_(this,dStyle);
      return reactCreate_('article',props,centerDiv);
    }
  }
}

T.ScenePage_ = TScenePage_;
T.ScenePage  = new TScenePage_();
var ScenePage__ = createClass_(T.ScenePage._extend());

// MaskablePanel
//--------------

function noPropagation(event) {
  event.stopPropagation();
}

class TMaskPanel_ extends TPanel_ {
  constructor(name,desc) {
    super(name || 'MaskPanel',desc);
  }
  
  getInitialState() {
    var dState = super.getInitialState();  // this.props['hookTo.'] must be W.body.$pop
    
    this.defineDual('popOption');
    this.defineDual('id__', function(value,oldValue) {
      if (oldValue !== 1) return;
      
      var bodyEle = null, frameEle = null;
      var dFrame, gui = this.$gui, popOption = this.props.popOption;
      if (popOption) {
        dFrame = popOption.frame;
        if (!dFrame)
          dFrame = {};
        else {
          frameEle = this.props.popFrame;  // should come from template or compObj.fullClone()
          if (frameEle && !frameEle.props) // invalid frame element
            frameEle = null;
        }
        
        if (this.props.children) {
          var b = children2Arr_(this.props.children); // not use childElements_()
          bodyEle = b[0];  // must pass one child (panel/unit/paragraph) for utils.popWin.showWindow()
        }
        gui.compIdx = {};
        gui.comps = [];    // ignore all pre-defined component
      }
      
      var hookOwner = this.widget;
      if (bodyEle && hookOwner && containNode_) { // assert(popOption && dFrame);
        // step 1: config this.state
        var frameInfo = containNode_.frameInfo, iTotalWd = window.innerWidth, iTotalHi = window.innerHeight;
        
        this.state.left = 0;
        this.state.top = 0;
        this.state.width = iTotalWd - frameInfo.leftWd - frameInfo.rightWd;
        this.state.height = iTotalHi - frameInfo.topHi - frameInfo.bottomHi;
        this.state.style = Object.assign({},this.state.style,{ position: 'absolute',
          zIndex: 'auto',  // same as parent (3016)
          backgroundColor: popOption.maskColor || 'rgba(238,238,238,0.84)',
        });
        
        // step 2: try add frame widget
        var stWd = this.state.width, stHi = this.state.height;
        if (frameEle) {
          var iWd = parsePercent(dFrame.width || 0.9,stWd,4);
          var iHi = parsePercent(dFrame.height || 0.9,stHi,4);
          var iLeft = parseLeftTop(dFrame.left,stWd,iWd);
          var iTop = parseLeftTop(dFrame.top,stHi,iHi);
          var dStyle_ = Object.assign({},frameEle.props.style, {
            position: 'absolute',
            zIndex: 'auto',
          });
          var dProp_ = { 'hookTo.':hookOwner, 'keyid.':'', key:'', style:dStyle_,
            left:iLeft, top:iTop, width:iWd, height:iHi,
          };
          
          gui.compIdx['0'] = 0;
          gui.comps.push(reactClone_(frameEle,dProp_));
        }
        
        // step 3: try set default frame style if popOption.frame not passed
        var iWd2 = parsePercent(popOption.width || 0.8,stWd,6);
        var iHi2 = parsePercent(popOption.height || 0.8,stHi,6);
        var iLeft2 = parseLeftTop(popOption.left,stWd,iWd2);
        var iTop2 = parseLeftTop(popOption.top,stHi,iHi2);
        
        if (!frameEle && iLeft2 > 0 && iTop2 > 0 && iLeft2 + iWd2 < stWd && iTop2 + iHi2 < stHi) {
          var iLeft3 = iLeft2-1, iTop3 = iTop2-1;
          frameEle = reactCreate_('div',{key:'0', style: {
            position:'absolute', zIndex:'auto',
            left:iLeft3+'px', top:iTop3+'px',
            width:iWd2+'px', height:iHi2+'px',
            border:'1px solid #e0e0e0', boxShadow:'-2px 8px 4px rgba(0,0,0,0.1)',
          }});
          gui.compIdx['0'] = 0;
          gui.comps.push(frameEle);
        }
        
        // step 4: try add body widget
        var keyid = '', sKey = getElementKey_(bodyEle);
        if (sKey) {
          var iTmp = parseInt(sKey);
          if ((iTmp+'') === sKey)
            keyid = iTmp;
          else keyid = sKey;
        }
        var dStyle2_ = Object.assign({},bodyEle.props.style, {
          backgroundColor: '#fff',
          position: 'absolute',
          zIndex: 'auto',
        });
        if (popOption.bodyStyle) Object.assign(dStyle2_,popOption.bodyStyle);
        var dProp2_ = { 'hookTo.':hookOwner, 'keyid.':keyid, key:sKey, style:dStyle2_,
          left:iLeft2, top:iTop2, width:iWd2, height:iHi2,
          $onClick:noPropagation,
        };
        
        var bodyEle2 = reactClone_(bodyEle,dProp2_);
        gui.compIdx[sKey] = gui.comps.length;
        gui.winComp = gui.comps.push(bodyEle2) - 1;
        if (popOption.state)
          popOption.state.opened = true;
        
        this.setEvent( { $onClick: function(event) {
            event.stopPropagation();
            if (W.__design__ || popOption.manualClose) return;
            
            setTimeout( function() {
              utils.popWin.popWindow();  // retData=undefined, callback=undefined
            },100);
          },
          $onDblClick: noPropagation,
          $onMouseDown: noPropagation, $onMouseMove: noPropagation, $onMouseUp: noPropagation,
          $onKeyPress: noPropagation, $onKeyDown: noPropagation, $onKeyUp: noPropagation,
          $onDragOver: noPropagation, $onDrop: noPropagation,
        });
      }
    });
    
    return dState;
    
    function parsePercent(iWd,iTotal,iMin) {
      if (iWd < 1) {
        if (iWd >= 0.9999)
          iWd = iTotal;
        else if (iWd > 0)
          iWd = iTotal * iWd;
        else iWd = iMin;
      }
      return iWd;
    }
    
    function parseLeftTop(iLeft,iTotal,iWd) {
      if (typeof iLeft != 'number')
        iLeft = (iTotal - iWd) / 2;
      else if (iLeft < 1)
        iLeft = iTotal * iLeft;
      if (iLeft < 0) iLeft = 0;
      return iLeft;
    }
  }
  
  componentDidMount() {
    super.componentDidMount();
    
    if (W.__design__) {
      var node = findDomNode_(this);
      if (node) {  // use html-event because design-GUI uses origianl DOM+JS, all html-event run before react-event
        node.onclick = noPropagation;
        node.ondblclick = noPropagation;
        node.onmousedown = noPropagation;
        node.onmousemove = noPropagation;
        node.onmouseup = noPropagation;
        node.onkeypress = noPropagation;
        node.onkeydown = noPropagation;
        node.onkeyup = noPropagation;
        node.ondragover = noPropagation;
        node.ondrop = noPropagation;
      }
    }
  }
  
  componentWillUnmount() {
    var opt = this.state.popOption;
    if (opt && opt.state && opt.state.opened) opt.state.opened = false;
    super.componentWillUnmount();
  }
}

var MaskPanel__ = createClass_((new TMaskPanel_())._extend());

// MarkedDiv
//----------
var SHADOW_WTC_FLAGS_ = null;  // used only in __design__
var SHADOW_WTC_ISPRE_ = null;  // used only in __design__

function shadowWtcTagFlag_() {
  if (!SHADOW_WTC_FLAGS_) {    // not initialized yet
    SHADOW_WTC_FLAGS_ = {};
    SHADOW_WTC_ISPRE_ = {};
    scanOneLevel(T,'');
  }
  return [SHADOW_WTC_FLAGS_,SHADOW_WTC_ISPRE_];
  
  function scanOneLevel(aSet,sPath) {
    Object.keys(aSet).forEach( function(sKey) {
      if (!sKey || sKey[sKey.length-1] == '_') return;
      var value = aSet[sKey];
      if (typeof value != 'object') return;
      
      if (value.getDefaultProps) {
        var props = value.getDefaultProps(), iFlag = 1;
        if (props['childInline.']) {
          if (hasClass_(props.className || '','rewgt-unit'))
            iFlag = 2;
          else iFlag = 3;
        }
        // else iFlag = 1; // Panel(0) or Unit(1), take all of them as Unit
        if (iFlag != 3)    // no need regist Span(3), default is 3
          SHADOW_WTC_FLAGS_[sPath+sKey] = iFlag;
        if (props['isPre.'])
          SHADOW_WTC_ISPRE_[sPath+sKey] = true;
      }
      else scanOneLevel(value,sPath + sKey + '.');  // scan sub-level
    });
  }
}
creator.scanWtcFlag = shadowWtcTagFlag_;

function scanPreCode_(htmlNode,sPrefix,canEditStatic) {
  var bRet = [], bStatic = [];
  for (var i=0,node; node = htmlNode.children[i]; i++) {
    var bInfo = creator.scanNodeAttr(node,sPrefix,i);
    if (!bInfo) {
      if (node.classList.contains('rewgt-static')) {
        for (var i2=0,node2; node2=node.childNodes[i2]; i2++) {
          bStatic.push(node2);  // includes text node
        }
      }
      else bStatic.push(node);
      continue;  // ignore all none '$=xx' node
    }
    
    var sTemplate = bInfo[0], dProp = bInfo[1];
    if (sTemplate == 'RefDiv')
      bRet.push(reactCreate_(RefDiv__,dProp));
    else if (sTemplate == 'RefSpan')
      bRet.push(reactCreate_(RefSpan__,dProp));
    else {  // is WTC
      var ch, bSeg = sTemplate.split('.');
      if (bSeg.length == 1 && (ch=sTemplate[0]) >= 'a' && ch <= 'z') { // html tag, such as: div button
        var sHtml = dProp['html.'] || null;
        delete dProp['html.']; delete dProp['isPre.'];
        bRet.push(reactCreate_(wtcCls,dProp,sHtml)); // only scan one level for pure react element
      }
      else {
        var clsSet = getWTC_(sTemplate), sName = bSeg.pop(), wtcCls = clsSet[sName];
        var sPrefix2 = sPrefix + '[' + i + '].' + sTemplate;
        if (!wtcCls) {
          console.log('error: can not find WTC (' + sPrefix2 + ')');
          continue;
        }
        
        var sTag = node.nodeName, bChild_ = [];
        if (sTag == 'DIV' || sTag == 'SPAN')
          bChild_ = scanPreCode_(node,sPrefix2,canEditStatic); // if no child, result is []
        bChild_.unshift(wtcCls,dProp);
        bRet.push(reactCreate_.apply(null,bChild_));
      }
    }
  }
  
  if (bRet.length == 0 && bStatic.length) { // no need set 'hasStatic.', scaned from MarkedDiv node
    var idx = W.$staticNodes.push(bStatic) - 1; // use W.$staticNodes, not local
    var dProp2 = {className:'rewgt-static', name:idx+''};
    if (!canEditStatic) dProp2['data-marked'] = '1'; // use data-marked to avoid online editing
    bRet.push( reactCreate_('div',dProp2) );
  }
  return bRet;
}
creator.scanPreCode = scanPreCode_;

var re_autoname_ = /^auto[0-9]+$/;

function renewMarkdown_(compObj,mdText,callback) {
  var gui = compObj.$gui, isTable = compObj.props['markedTable.'], notShow = compObj.props.noShow;
  
  try {
    var sHtml = utils.marked(mdText);  // maybe raise exception
    var node = document.createElement('div'), bList = [];
    node.innerHTML = sHtml;
    
    var bKey = [];
    gui.comps.forEach( function(child) {
      if (child && child.props['hookTo.']) {
        var sKey = getElementKey_(child);
        if (sKey) bKey.push('-' + sKey);
      }
    });
    if (bKey.length && compObj.isHooked) {
      compObj.setChild(bKey, function() {
        resetComp(node);
      });
    }
    else resetComp(node);
  }
  catch(e) {
    console.log(e);
    if (callback) callback(false);
  }
  
  function resetComp(htmlNode) {
    gui.removeNum += gui.comps.length; // let childNumId changed
    gui.compIdx = {}; gui.comps = [];  // should be no child
    gui.statics = {};
    
    if (isTable) {
      compObj.firstScan = true;
      compObj.cellKeys = {};
      compObj.cellStyles = {};
    }
    
    var regNode = []; // [[sKey,ele],...] for MarkedDiv, [[[sKey,ele],...],...] for MarkedTable
    var regSub = [];
    for (var i=0,node; node = htmlNode.children[i]; i++) {
      var sPath = node.getAttribute('$'), sTag = node.nodeName;
      if (sPath && (sTag == 'PRE' || sTag == 'DIV')) {
        if (bList.length) {
          AddOneStatic(gui,bList);
          bList = [];  // create new, old should append to gui.statics
        }
        
        var bInfo = creator.scanNodeAttr(node,'',0), sTemplate = bInfo && bInfo[0];
        if (!bInfo || sTemplate === 'RefSpan') {
          console.log('error: invalid node (<' + sTag + ' $=' + sPath + '>)');
          continue;
        }
        var dProp = bInfo[1];
        
        var isWTC = sTemplate != 'RefDiv', isOrgTag = false;
        var wtcCls, childCls = null, childProp = null;
        if (isWTC) {
          var ch, bSeg = sTemplate.split('.');
          if (bSeg.length == 1 && (ch=sTemplate[0]) >= 'a' && ch <= 'z') { // html tag, such as: div button
            isOrgTag = true;
            wtcCls = sTemplate;
          }
          else {
            var clsSet = getWTC_(sTemplate), sName = bSeg.pop();
            wtcCls = clsSet[sName];
            if (!wtcCls) {
              console.log('error: can not find WTC (' + sTemplate + ')');
              continue;
            }
            
            if (wtcCls.defaultProps && !hasClass_(wtcCls.defaultProps.className || '',['rewgt-panel','rewgt-unit'])) {
              childCls = wtcCls; childProp = dProp;
              wtcCls = P__; dProp = {};
            }
          }
        }
        else wtcCls = RefDiv__;
        
        var keyid, keyIdx = gui.comps.length, sKey = dProp.key;
        var namedKey = '', registKey = '';
        if (!sKey || typeof sKey != 'string' || sKey.search(re_autoname_) == 0) { // take 'autoN' as none-define
          registKey = keyid = 'auto' + (keyIdx + gui.removeNum);
          if (!isWTC)  // is linker
            sKey = keyid = '$' + keyid;
          else sKey = keyid;
        }
        else {
          namedKey = registKey = sKey;
          if (!isWTC && sKey[0] != '$')
            sKey = '$' + sKey;
          keyid = sKey;
        }
        
        var ele;
        if (isOrgTag) {
          dProp.key = sKey;
          var sHtml = dProp['html.'] || null;
          delete dProp['html.']; delete dProp['isPre.'];
          ele = reactCreate_(wtcCls,dProp,sHtml); // only scan one level
        }
        else {
          Object.assign(dProp,{'hookTo.':compObj.widget, 'keyid.':keyid, key:sKey});
          if (!isWTC) {       // is linker
            if (dProp.style)
              dProp.style.display = '';      // to default display: block table ...
            else dProp.style = {display:''};
          }
          
          var bChild_ = [];
          if (sTag == 'DIV')  // ignore sub node of <pre>, we only using node.innerHTML for that
            bChild_ = scanPreCode_(node,'['+i+'].'+sTemplate,false);
          if (childCls) {
            bChild_.unshift(childCls,childProp);
            bChild_ = [reactCreate_.apply(null,bChild_)];
          }
          
          bChild_.unshift(wtcCls,dProp);
          ele = reactCreate_.apply(null,bChild_);
        }
        
        gui.compIdx[sKey] = keyIdx;
        gui.comps.push(ele);
        if (namedKey) {
          if (isTable)
            regNode[namedKey] = ele;
          else regSub[namedKey] = ele;
        }
        regSub.push([registKey,ele]);
        
        if (inFirstLoading_ && !isWTC) // !isWTC must be !isOrgTag
          pendingRefers_.push([compObj,sKey]);
      }
      else if (!sPath) {
        if (!isTable)
          bList.push(node);      // record static nodes
        else {
          if (bList.length) {    // default table cell only hold one block-node
            AddOneStatic(gui,bList);
            bList = [];
          }
          if (sTag == 'HR') {    // new table row
            var ele = reactCreate_('hr',{'markedRow.':true});
            gui.comps.push(ele); // no need hook  // no need add to gui.compIdx
            
            if (isTable) {
              regNode.push(regSub);  // regSub maybe is []
              regSub = [];
            }
          }
          else bList.push(node);
        }
      }
      // else, '$' defined    // ignore, such as <span $=xx>
    }
    if (bList.length) AddOneStatic(gui,bList);
    if (isTable) {
      if (regSub.length)
        regNode.push(regSub); // record left named element
    }
    else regNode = regSub;
    
    if (callback) {
      setTimeout( function() {
        callback(true,regNode);
      },0);
    }
  }
  
  function AddOneStatic(gui,bList) {
    if (notShow) return;
    
    var keyIdx = gui.comps.length, sName = (0x100000 + gui.removeNum + keyIdx) + ''; 
    var keyid = keyIdx + gui.removeNum, sKey = keyid + '';
    var dProp = {className:'rewgt-static', name:sName, key:sKey};
    
    gui.compIdx[sKey] = keyIdx;
    gui.comps.push(reactCreate_('div',dProp));
    gui.statics[sName] = bList;
  }
}

class TMarkedDiv_ extends TDiv_ {
  constructor(name,desc) {
    super(name || 'MarkedDiv',desc);
    this._defaultProp.width = undefined;
    this._defaultProp.minWidth = 20;
    this._defaultProp.noShow = '';
    this._silentProp.push('marked.','hasStatic.','noSaveChild.');
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props.noShow = '';
    props.width = null;
    props.minWidth = 20;     // minWidth=20  minHeight=20
    props['marked.'] = true;
    props['hasStatic.'] = true;
    props['noSaveChild.'] = true;
    props['isPre.'] = true;  // means save as <pre $=MarkedDiv>
    return props;
  }
  
  _getSchema(self,iLevel) {
    iLevel = iLevel || 1200;
    var dSchema = super._getSchema(self,iLevel + 200);
    dSchema.noShow = [ iLevel+1,'string',['','1'],'[string]: disable show content' ];
    return dSchema;
  }
  
  _getGroupOpt(self) {
    var dOpt = { type: 'mono', // mono, extend
      editable: 'none',        // all, some, none // 'some' means can not remove sub-level widget
      baseUrl: creator.appBase(), tools: [],
    };
    var wdgt = self.widget;
    if (!wdgt || !self.isHooked) // widget not ready yet, dOpt.tools is empty
      return dOpt;
    
    var sPath = wdgt.getPath();
    dOpt.tools = [ {
      name:'editor', icon:'res/edit_txt.png', title:'edit markdown',
      url:'edit_markdown.html', halfScreen:true, noMove:false,
      clickable:true, width:0.9, height:0.9, // left,top, no assign means center
      
      get: function(compObj) { // compObj === self
        var sMarked = self.state['html.'] || '';
        return [sMarked,sPath,shadowWtcTagFlag_()];
      },
      
      set: function(compObj,outValue,beClose) {
        var sText = outValue[0], sWdgtPath = outValue[1];
        if (self !== compObj || sWdgtPath != sPath) return; // check available
        
        if (typeof sText == 'string') {
          renewMarkdown_(compObj,sText, function(succ,regNode) {    // compObj must isHooked
            if (!succ) return;
            
            // not use compObj.duals['html.'] = sText  // no trigger listen in __design__
            compObj.setState({'html.':sText,id__:identicalId()}, function() {
              renewStaticChild(compObj,true);
              
              var newNodes = null;
              if (compObj.state.nodes.length == 0) {
                if (regNode && regNode.length)
                  newNodes = regNode;
                // else, both old and new is empty, ignore update
              }
              else newNodes = regNode || [];
              if (newNodes) {
                setTimeout( function() {
                  compObj.duals.nodes = newNodes;
                },10); // ensure content of newNodes be prepared first, they maybe linked
              }
              
              if (W.__design__ && beClose) {  // notify backup current doc
                if (containNode_ && containNode_.notifyBackup)
                  containNode_.notifyBackup(sWdgtPath,1000); // renew schema prop editor
              }
            }); // gui.comps changed, use compObj.setState() trigger render
          });
        }
      },
    }];
    return dOpt;
  }
  
  getInitialState() {
    var state = super.getInitialState();
    
    var self = this, gui = this.$gui, ownerObj = this.widget;
    ownerObj = ownerObj && ownerObj.parent;
    ownerObj = ownerObj && ownerObj.component;
    if (ownerObj && ownerObj.props['markedTable.']) {
      this.defineDual('colSpan', function(value,oldValue) {
        var num = parseInt(value);
        this.state.colSpan = isNaN(num)? undefined: num;
        renderOwner();
      });  // default is undefined  // undefined means col-span=1
      this.defineDual('rowSpan', function(value,oldValue) {
        var num = parseInt(value);
        this.state.rowSpan = isNaN(num)? undefined: num;
        renderOwner();
      });  // default is undefined
      
      if (this.props.tdStyle) {
        this.defineDual('tdStyle', function(value,oldValue) {
          this.state.tdStyle = Object.assign({},oldValue,value);
          renderOwner();
        },this.props.tdStyle);
      }
    }
    
    gui.delayTid = 0;
    this.defineDual('html.', function(value,oldValue) {
      if (!this.widget || typeof value != 'string') return;
      
      var iCount = 0;
      delayRun();
      
      function delayRun() {
        if (gui.delayTid) { // avoid side effects, ignore previous `duals['html.'] = s`
          clearTimeout(gui.delayTid);
          gui.delayTid = 0;
        }
        
        if (++iCount > 24) return; // try within 2.4 seconds
        if (self.isHooked) {
          renewMarkdown_(self,value, function(succ,regNode) {
            if (!succ) return;
            self.reRender( function () {
              renewStaticChild(self,true);
              
              var newNodes = null;
              if (self.state.nodes.length == 0) {
                if (regNode && regNode.length)
                  newNodes = regNode;
                // else, both old and new is empty, ignore update
              }
              else newNodes = regNode || [];
              if (newNodes) {
                setTimeout( function() {
                  self.duals.nodes = newNodes;
                },10);
              }
            });
          });
        }
        else { // still in creating yet, delay a moment
          gui.delayTid = setTimeout( function () {
            delayRun();
          },100);
        }
      }
    });
    
    state.nodes = [];  // preset it, should avoid first assignment
    this.defineDual('nodes'); // should not come from props.nodes  // come from 'html.' scanning
    
    return state;
    
    function renderOwner() {
      var cellKey = self.$gui.keyid + '';
      setTimeout( function() {
        var owner = self.widget;
        owner = owner && owner.parent;
        owner = owner && owner.component;
        if (owner && owner.cellKeys && owner.cellStyles) {
          owner.cellKeys[cellKey] = [self.state.rowSpan,self.state.colSpan];
          owner.cellStyles[cellKey] = self.state.tdStyle;  // maybe undefined
          owner.reRender();  // force render
        }
      },0);
    }
  }
  
  willResizing(wd,hi,inPending) { // called by parent in next render tick
    if (!inPending && this.isHooked) {  // ignore pending state of dragging
      var self = this;
      setTimeout( function() {
        propagateResizing_(self,false);
      },0);      // let 'this.setState({parentWidth,parentHeight})' run first
    }
    return true; // true means contine run this.setState({parentWidth,parentHeight})
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;   // as <noscript>
    
    var bChild = this.prepareState();
    if (this.props.noShow) bChild = null;
    
    var props = setupRenderProp_(this);
    return reactCreate_(this.props['tagName.'],props,bChild); // not use 'html.'
  }
}

T.MarkedDiv_ = TMarkedDiv_;
T.MarkedDiv  = new TMarkedDiv_();

class TMarkedTable_ extends TMarkedDiv_ {
  constructor(name,desc) {
    super(name || 'MarkedTable',desc);
    this._silentProp.push('markedTable.');
  }
  
  getDefaultProps() {
    var props = super.getDefaultProps();
    props['markedTable.'] = true;
    props['tagName.'] = 'table';
    return props;
  }
  
  getInitialState() {
    var state = super.getInitialState();
    this.firstScan = true;
    this.cellKeys = {};
    this.cellStyles = {};
    return state;
  }
  
  render() {
    syncProps_(this);
    if (this.hideThis) return null;    // as <noscript>
    
    var bChild = this.prepareState();  // bChild is new copied
    var props = setupRenderProp_(this);
    if (this.props.noShow)             // not show content, only use duals.nodes
      return reactCreate_('div',props);
    
    if (bChild.length == 0)            // at least define one cell
      bChild.push(reactCreate_(P__,{'html.':' '}));
    
    var bRow = ['tbody',null], lastRow = null;
    var self = this, firstScan = this.firstScan;
    this.firstScan = false;
    
    bChild.forEach( function(child) {
      if (child.props['markedRow.']) {
        if (lastRow)
          bRow.push(reactCreate_.apply(null,lastRow));
        lastRow = ['tr',null];
      }
      else {
        if (!lastRow) lastRow = ['tr',null];
        
        var cellKey = child.props['keyid.'];
        var rowSpan = undefined, colSpan = undefined, tdStyle = null;
        if (cellKey !== undefined) cellKey = cellKey + '';
        if (cellKey && child.props['marked.']) {
          if (firstScan) {
            var tmp, num;
            if ((tmp=child.props['rowSpan']) && !isNaN(num=parseInt(tmp)))
              rowSpan = num + '';
            if ((tmp=child.props['colSpan']) && !isNaN(num=parseInt(tmp)))
              colSpan = num + '';
            self.cellKeys[cellKey] = [rowSpan,colSpan];
            tdStyle = self.cellStyles[cellKey] = child.props.tdStyle; // maybe undefined
          }
          else {
            var b = self.cellKeys[cellKey];
            if (Array.isArray(b)) {
              rowSpan = b[0];
              colSpan = b[1];
            }
            tdStyle = self.cellStyles[cellKey];  // maybe undefined
          }
        }
        
        var tdProp = null;
        if (cellKey) {
          tdProp = {key:cellKey,rowSpan:rowSpan,colSpan:colSpan}; // rowSpan colSpan maybe undefined, overwrite history
          if (tdStyle) tdProp.style = tdStyle;
        }
        lastRow.push(reactCreate_('td',tdProp,child));
      }
    });
    if (lastRow) bRow.push(reactCreate_.apply(null,lastRow));
    
    var tbody = reactCreate_.apply(null,bRow);
    return reactCreate_('table',props,tbody);
  }
}

T.MarkedTable_ = TMarkedTable_;
T.MarkedTable  = new TMarkedTable_();

module.exports = T;
