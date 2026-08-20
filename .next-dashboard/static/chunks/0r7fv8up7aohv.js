(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,785907,t=>{"use strict";var e=t.i(431690);let r=t=>{let e=t.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,e,r)=>r?r.toUpperCase():e.toLowerCase());return e.charAt(0).toUpperCase()+e.slice(1)},i=(...t)=>t.filter((t,e,r)=>!!t&&""!==t.trim()&&r.indexOf(t)===e).join(" ").trim();var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};let a=(0,e.forwardRef)(({color:t="currentColor",size:r=24,strokeWidth:a=2,absoluteStrokeWidth:n,className:s="",children:l,iconNode:d,...p},f)=>(0,e.createElement)("svg",{ref:f,...o,width:r,height:r,stroke:t,strokeWidth:n?24*Number(a)/Number(r):a,className:i("lucide",s),...!l&&!(t=>{for(let e in t)if(e.startsWith("aria-")||"role"===e||"title"===e)return!0})(p)&&{"aria-hidden":"true"},...p},[...d.map(([t,r])=>(0,e.createElement)(t,r)),...Array.isArray(l)?l:[l]]));t.s(["default",0,(t,o)=>{let n=(0,e.forwardRef)(({className:n,...s},l)=>(0,e.createElement)(a,{ref:l,iconNode:o,className:i(`lucide-${r(t).replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}`,`lucide-${t}`,n),...s}));return n.displayName=r(t),n}],785907)},105460,(t,e,r)=>{var i={675:function(t,e){"use strict";e.byteLength=function(t){var e=l(t),r=e[0],i=e[1];return(r+i)*3/4-i},e.toByteArray=function(t){var e,r,a=l(t),n=a[0],s=a[1],d=new o((n+s)*3/4-s),p=0,f=s>0?n-4:n;for(r=0;r<f;r+=4)e=i[t.charCodeAt(r)]<<18|i[t.charCodeAt(r+1)]<<12|i[t.charCodeAt(r+2)]<<6|i[t.charCodeAt(r+3)],d[p++]=e>>16&255,d[p++]=e>>8&255,d[p++]=255&e;return 2===s&&(e=i[t.charCodeAt(r)]<<2|i[t.charCodeAt(r+1)]>>4,d[p++]=255&e),1===s&&(e=i[t.charCodeAt(r)]<<10|i[t.charCodeAt(r+1)]<<4|i[t.charCodeAt(r+2)]>>2,d[p++]=e>>8&255,d[p++]=255&e),d},e.fromByteArray=function(t){for(var e,i=t.length,o=i%3,a=[],n=0,s=i-o;n<s;n+=16383)a.push(function(t,e,i){for(var o,a=[],n=e;n<i;n+=3)o=(t[n]<<16&0xff0000)+(t[n+1]<<8&65280)+(255&t[n+2]),a.push(r[o>>18&63]+r[o>>12&63]+r[o>>6&63]+r[63&o]);return a.join("")}(t,n,n+16383>s?s:n+16383));return 1===o?a.push(r[(e=t[i-1])>>2]+r[e<<4&63]+"=="):2===o&&a.push(r[(e=(t[i-2]<<8)+t[i-1])>>10]+r[e>>4&63]+r[e<<2&63]+"="),a.join("")};for(var r=[],i=[],o="u">typeof Uint8Array?Uint8Array:Array,a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",n=0,s=a.length;n<s;++n)r[n]=a[n],i[a.charCodeAt(n)]=n;function l(t){var e=t.length;if(e%4>0)throw Error("Invalid string. Length must be a multiple of 4");var r=t.indexOf("=");-1===r&&(r=e);var i=r===e?0:4-r%4;return[r,i]}i[45]=62,i[95]=63},72:function(t,e,r){"use strict";var i=r(675),o=r(783),a="function"==typeof Symbol&&"function"==typeof Symbol.for?Symbol.for("nodejs.util.inspect.custom"):null;function n(t){if(t>0x7fffffff)throw RangeError('The value "'+t+'" is invalid for option "size"');var e=new Uint8Array(t);return Object.setPrototypeOf(e,s.prototype),e}function s(t,e,r){if("number"==typeof t){if("string"==typeof e)throw TypeError('The "string" argument must be of type string. Received type number');return p(t)}return l(t,e,r)}function l(t,e,r){if("string"==typeof t){var i=t,o=e;if(("string"!=typeof o||""===o)&&(o="utf8"),!s.isEncoding(o))throw TypeError("Unknown encoding: "+o);var a=0|u(i,o),l=n(a),d=l.write(i,o);return d!==a&&(l=l.slice(0,d)),l}if(ArrayBuffer.isView(t))return f(t);if(null==t)throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t);if(D(t,ArrayBuffer)||t&&D(t.buffer,ArrayBuffer)||"u">typeof SharedArrayBuffer&&(D(t,SharedArrayBuffer)||t&&D(t.buffer,SharedArrayBuffer)))return function(t,e,r){var i;if(e<0||t.byteLength<e)throw RangeError('"offset" is outside of buffer bounds');if(t.byteLength<e+(r||0))throw RangeError('"length" is outside of buffer bounds');return Object.setPrototypeOf(i=void 0===e&&void 0===r?new Uint8Array(t):void 0===r?new Uint8Array(t,e):new Uint8Array(t,e,r),s.prototype),i}(t,e,r);if("number"==typeof t)throw TypeError('The "value" argument must not be of type number. Received type number');var p=t.valueOf&&t.valueOf();if(null!=p&&p!==t)return s.from(p,e,r);var h=function(t){if(s.isBuffer(t)){var e=0|c(t.length),r=n(e);return 0===r.length||t.copy(r,0,0,e),r}return void 0!==t.length?"number"!=typeof t.length||function(t){return t!=t}(t.length)?n(0):f(t):"Buffer"===t.type&&Array.isArray(t.data)?f(t.data):void 0}(t);if(h)return h;if("u">typeof Symbol&&null!=Symbol.toPrimitive&&"function"==typeof t[Symbol.toPrimitive])return s.from(t[Symbol.toPrimitive]("string"),e,r);throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t)}function d(t){if("number"!=typeof t)throw TypeError('"size" argument must be of type number');if(t<0)throw RangeError('The value "'+t+'" is invalid for option "size"')}function p(t){return d(t),n(t<0?0:0|c(t))}function f(t){for(var e=t.length<0?0:0|c(t.length),r=n(e),i=0;i<e;i+=1)r[i]=255&t[i];return r}e.Buffer=s,e.SlowBuffer=function(t){return+t!=t&&(t=0),s.alloc(+t)},e.INSPECT_MAX_BYTES=50,e.kMaxLength=0x7fffffff,s.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1),e={foo:function(){return 42}};return Object.setPrototypeOf(e,Uint8Array.prototype),Object.setPrototypeOf(t,e),42===t.foo()}catch(t){return!1}}(),!s.TYPED_ARRAY_SUPPORT&&"u">typeof console&&"function"==typeof console.error&&console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),Object.defineProperty(s.prototype,"parent",{enumerable:!0,get:function(){if(s.isBuffer(this))return this.buffer}}),Object.defineProperty(s.prototype,"offset",{enumerable:!0,get:function(){if(s.isBuffer(this))return this.byteOffset}}),s.poolSize=8192,s.from=function(t,e,r){return l(t,e,r)},Object.setPrototypeOf(s.prototype,Uint8Array.prototype),Object.setPrototypeOf(s,Uint8Array),s.alloc=function(t,e,r){return(d(t),t<=0)?n(t):void 0!==e?"string"==typeof r?n(t).fill(e,r):n(t).fill(e):n(t)},s.allocUnsafe=function(t){return p(t)},s.allocUnsafeSlow=function(t){return p(t)};function c(t){if(t>=0x7fffffff)throw RangeError("Attempt to allocate Buffer larger than maximum size: 0x7fffffff bytes");return 0|t}function u(t,e){if(s.isBuffer(t))return t.length;if(ArrayBuffer.isView(t)||D(t,ArrayBuffer))return t.byteLength;if("string"!=typeof t)throw TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof t);var r=t.length,i=arguments.length>2&&!0===arguments[2];if(!i&&0===r)return 0;for(var o=!1;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":return I(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return k(t).length;default:if(o)return i?-1:I(t).length;e=(""+e).toLowerCase(),o=!0}}function h(t,e,r){var o,a,n,s=!1;if((void 0===e||e<0)&&(e=0),e>this.length||((void 0===r||r>this.length)&&(r=this.length),r<=0||(r>>>=0)<=(e>>>=0)))return"";for(t||(t="utf8");;)switch(t){case"hex":return function(t,e,r){var i=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>i)&&(r=i);for(var o="",a=e;a<r;++a)o+=O[t[a]];return o}(this,e,r);case"utf8":case"utf-8":return x(this,e,r);case"ascii":return function(t,e,r){var i="";r=Math.min(t.length,r);for(var o=e;o<r;++o)i+=String.fromCharCode(127&t[o]);return i}(this,e,r);case"latin1":case"binary":return function(t,e,r){var i="";r=Math.min(t.length,r);for(var o=e;o<r;++o)i+=String.fromCharCode(t[o]);return i}(this,e,r);case"base64":return o=this,a=e,n=r,0===a&&n===o.length?i.fromByteArray(o):i.fromByteArray(o.slice(a,n));case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return function(t,e,r){for(var i=t.slice(e,r),o="",a=0;a<i.length;a+=2)o+=String.fromCharCode(i[a]+256*i[a+1]);return o}(this,e,r);default:if(s)throw TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),s=!0}}function g(t,e,r){var i=t[e];t[e]=t[r],t[r]=i}function m(t,e,r,i,o){var a;if(0===t.length)return -1;if("string"==typeof r?(i=r,r=0):r>0x7fffffff?r=0x7fffffff:r<-0x80000000&&(r=-0x80000000),(a=r*=1)!=a&&(r=o?0:t.length-1),r<0&&(r=t.length+r),r>=t.length)if(o)return -1;else r=t.length-1;else if(r<0)if(!o)return -1;else r=0;if("string"==typeof e&&(e=s.from(e,i)),s.isBuffer(e))return 0===e.length?-1:b(t,e,r,i,o);if("number"==typeof e){if(e&=255,"function"==typeof Uint8Array.prototype.indexOf)if(o)return Uint8Array.prototype.indexOf.call(t,e,r);else return Uint8Array.prototype.lastIndexOf.call(t,e,r);return b(t,[e],r,i,o)}throw TypeError("val must be string, number or Buffer")}function b(t,e,r,i,o){var a,n=1,s=t.length,l=e.length;if(void 0!==i&&("ucs2"===(i=String(i).toLowerCase())||"ucs-2"===i||"utf16le"===i||"utf-16le"===i)){if(t.length<2||e.length<2)return -1;n=2,s/=2,l/=2,r/=2}function d(t,e){return 1===n?t[e]:t.readUInt16BE(e*n)}if(o){var p=-1;for(a=r;a<s;a++)if(d(t,a)===d(e,-1===p?0:a-p)){if(-1===p&&(p=a),a-p+1===l)return p*n}else -1!==p&&(a-=a-p),p=-1}else for(r+l>s&&(r=s-l),a=r;a>=0;a--){for(var f=!0,c=0;c<l;c++)if(d(t,a+c)!==d(e,c)){f=!1;break}if(f)return a}return -1}s.isBuffer=function(t){return null!=t&&!0===t._isBuffer&&t!==s.prototype},s.compare=function(t,e){if(D(t,Uint8Array)&&(t=s.from(t,t.offset,t.byteLength)),D(e,Uint8Array)&&(e=s.from(e,e.offset,e.byteLength)),!s.isBuffer(t)||!s.isBuffer(e))throw TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(t===e)return 0;for(var r=t.length,i=e.length,o=0,a=Math.min(r,i);o<a;++o)if(t[o]!==e[o]){r=t[o],i=e[o];break}return r<i?-1:+(i<r)},s.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},s.concat=function(t,e){if(!Array.isArray(t))throw TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return s.alloc(0);if(void 0===e)for(r=0,e=0;r<t.length;++r)e+=t[r].length;var r,i=s.allocUnsafe(e),o=0;for(r=0;r<t.length;++r){var a=t[r];if(D(a,Uint8Array)&&(a=s.from(a)),!s.isBuffer(a))throw TypeError('"list" argument must be an Array of Buffers');a.copy(i,o),o+=a.length}return i},s.byteLength=u,s.prototype._isBuffer=!0,s.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)g(this,e,e+1);return this},s.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)g(this,e,e+3),g(this,e+1,e+2);return this},s.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)g(this,e,e+7),g(this,e+1,e+6),g(this,e+2,e+5),g(this,e+3,e+4);return this},s.prototype.toString=function(){var t=this.length;return 0===t?"":0==arguments.length?x(this,0,t):h.apply(this,arguments)},s.prototype.toLocaleString=s.prototype.toString,s.prototype.equals=function(t){if(!s.isBuffer(t))throw TypeError("Argument must be a Buffer");return this===t||0===s.compare(this,t)},s.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return t=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(t+=" ... "),"<Buffer "+t+">"},a&&(s.prototype[a]=s.prototype.inspect),s.prototype.compare=function(t,e,r,i,o){if(D(t,Uint8Array)&&(t=s.from(t,t.offset,t.byteLength)),!s.isBuffer(t))throw TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof t);if(void 0===e&&(e=0),void 0===r&&(r=t?t.length:0),void 0===i&&(i=0),void 0===o&&(o=this.length),e<0||r>t.length||i<0||o>this.length)throw RangeError("out of range index");if(i>=o&&e>=r)return 0;if(i>=o)return -1;if(e>=r)return 1;if(e>>>=0,r>>>=0,i>>>=0,o>>>=0,this===t)return 0;for(var a=o-i,n=r-e,l=Math.min(a,n),d=this.slice(i,o),p=t.slice(e,r),f=0;f<l;++f)if(d[f]!==p[f]){a=d[f],n=p[f];break}return a<n?-1:+(n<a)},s.prototype.includes=function(t,e,r){return -1!==this.indexOf(t,e,r)},s.prototype.indexOf=function(t,e,r){return m(this,t,e,r,!0)},s.prototype.lastIndexOf=function(t,e,r){return m(this,t,e,r,!1)};function x(t,e,r){r=Math.min(t.length,r);for(var i=[],o=e;o<r;){var a,n,s,l,d=t[o],p=null,f=d>239?4:d>223?3:d>191?2:1;if(o+f<=r)switch(f){case 1:d<128&&(p=d);break;case 2:(192&(a=t[o+1]))==128&&(l=(31&d)<<6|63&a)>127&&(p=l);break;case 3:a=t[o+1],n=t[o+2],(192&a)==128&&(192&n)==128&&(l=(15&d)<<12|(63&a)<<6|63&n)>2047&&(l<55296||l>57343)&&(p=l);break;case 4:a=t[o+1],n=t[o+2],s=t[o+3],(192&a)==128&&(192&n)==128&&(192&s)==128&&(l=(15&d)<<18|(63&a)<<12|(63&n)<<6|63&s)>65535&&l<1114112&&(p=l)}null===p?(p=65533,f=1):p>65535&&(p-=65536,i.push(p>>>10&1023|55296),p=56320|1023&p),i.push(p),o+=f}var c=i,u=c.length;if(u<=4096)return String.fromCharCode.apply(String,c);for(var h="",g=0;g<u;)h+=String.fromCharCode.apply(String,c.slice(g,g+=4096));return h}function v(t,e,r){if(t%1!=0||t<0)throw RangeError("offset is not uint");if(t+e>r)throw RangeError("Trying to access beyond buffer length")}function y(t,e,r,i,o,a){if(!s.isBuffer(t))throw TypeError('"buffer" argument must be a Buffer instance');if(e>o||e<a)throw RangeError('"value" argument is out of bounds');if(r+i>t.length)throw RangeError("Index out of range")}function w(t,e,r,i,o,a){if(r+i>t.length||r<0)throw RangeError("Index out of range")}function A(t,e,r,i,a){return e*=1,r>>>=0,a||w(t,e,r,4,34028234663852886e22,-34028234663852886e22),o.write(t,e,r,i,23,4),r+4}function E(t,e,r,i,a){return e*=1,r>>>=0,a||w(t,e,r,8,17976931348623157e292,-17976931348623157e292),o.write(t,e,r,i,52,8),r+8}s.prototype.write=function(t,e,r,i){if(void 0===e)i="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)i=e,r=this.length,e=0;else if(isFinite(e))e>>>=0,isFinite(r)?(r>>>=0,void 0===i&&(i="utf8")):(i=r,r=void 0);else throw Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");var o,a,n,s,l,d,p,f,c=this.length-e;if((void 0===r||r>c)&&(r=c),t.length>0&&(r<0||e<0)||e>this.length)throw RangeError("Attempt to write outside buffer bounds");i||(i="utf8");for(var u=!1;;)switch(i){case"hex":return function(t,e,r,i){r=Number(r)||0;var o=t.length-r;i?(i=Number(i))>o&&(i=o):i=o;var a=e.length;i>a/2&&(i=a/2);for(var n=0;n<i;++n){var s,l=parseInt(e.substr(2*n,2),16);if((s=l)!=s)break;t[r+n]=l}return n}(this,t,e,r);case"utf8":case"utf-8":return o=e,a=r,T(I(t,this.length-o),this,o,a);case"ascii":return n=e,s=r,T(S(t),this,n,s);case"latin1":case"binary":return function(t,e,r,i){return T(S(e),t,r,i)}(this,t,e,r);case"base64":return l=e,d=r,T(k(t),this,l,d);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return p=e,f=r,T(function(t,e){for(var r,i,o=[],a=0;a<t.length&&!((e-=2)<0);++a)i=(r=t.charCodeAt(a))>>8,o.push(r%256),o.push(i);return o}(t,this.length-p),this,p,f);default:if(u)throw TypeError("Unknown encoding: "+i);i=(""+i).toLowerCase(),u=!0}},s.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}},s.prototype.slice=function(t,e){var r=this.length;t=~~t,e=void 0===e?r:~~e,t<0?(t+=r)<0&&(t=0):t>r&&(t=r),e<0?(e+=r)<0&&(e=0):e>r&&(e=r),e<t&&(e=t);var i=this.subarray(t,e);return Object.setPrototypeOf(i,s.prototype),i},s.prototype.readUIntLE=function(t,e,r){t>>>=0,e>>>=0,r||v(t,e,this.length);for(var i=this[t],o=1,a=0;++a<e&&(o*=256);)i+=this[t+a]*o;return i},s.prototype.readUIntBE=function(t,e,r){t>>>=0,e>>>=0,r||v(t,e,this.length);for(var i=this[t+--e],o=1;e>0&&(o*=256);)i+=this[t+--e]*o;return i},s.prototype.readUInt8=function(t,e){return t>>>=0,e||v(t,1,this.length),this[t]},s.prototype.readUInt16LE=function(t,e){return t>>>=0,e||v(t,2,this.length),this[t]|this[t+1]<<8},s.prototype.readUInt16BE=function(t,e){return t>>>=0,e||v(t,2,this.length),this[t]<<8|this[t+1]},s.prototype.readUInt32LE=function(t,e){return t>>>=0,e||v(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+0x1000000*this[t+3]},s.prototype.readUInt32BE=function(t,e){return t>>>=0,e||v(t,4,this.length),0x1000000*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},s.prototype.readIntLE=function(t,e,r){t>>>=0,e>>>=0,r||v(t,e,this.length);for(var i=this[t],o=1,a=0;++a<e&&(o*=256);)i+=this[t+a]*o;return i>=(o*=128)&&(i-=Math.pow(2,8*e)),i},s.prototype.readIntBE=function(t,e,r){t>>>=0,e>>>=0,r||v(t,e,this.length);for(var i=e,o=1,a=this[t+--i];i>0&&(o*=256);)a+=this[t+--i]*o;return a>=(o*=128)&&(a-=Math.pow(2,8*e)),a},s.prototype.readInt8=function(t,e){return(t>>>=0,e||v(t,1,this.length),128&this[t])?-((255-this[t]+1)*1):this[t]},s.prototype.readInt16LE=function(t,e){t>>>=0,e||v(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?0xffff0000|r:r},s.prototype.readInt16BE=function(t,e){t>>>=0,e||v(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?0xffff0000|r:r},s.prototype.readInt32LE=function(t,e){return t>>>=0,e||v(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},s.prototype.readInt32BE=function(t,e){return t>>>=0,e||v(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},s.prototype.readFloatLE=function(t,e){return t>>>=0,e||v(t,4,this.length),o.read(this,t,!0,23,4)},s.prototype.readFloatBE=function(t,e){return t>>>=0,e||v(t,4,this.length),o.read(this,t,!1,23,4)},s.prototype.readDoubleLE=function(t,e){return t>>>=0,e||v(t,8,this.length),o.read(this,t,!0,52,8)},s.prototype.readDoubleBE=function(t,e){return t>>>=0,e||v(t,8,this.length),o.read(this,t,!1,52,8)},s.prototype.writeUIntLE=function(t,e,r,i){if(t*=1,e>>>=0,r>>>=0,!i){var o=Math.pow(2,8*r)-1;y(this,t,e,r,o,0)}var a=1,n=0;for(this[e]=255&t;++n<r&&(a*=256);)this[e+n]=t/a&255;return e+r},s.prototype.writeUIntBE=function(t,e,r,i){if(t*=1,e>>>=0,r>>>=0,!i){var o=Math.pow(2,8*r)-1;y(this,t,e,r,o,0)}var a=r-1,n=1;for(this[e+a]=255&t;--a>=0&&(n*=256);)this[e+a]=t/n&255;return e+r},s.prototype.writeUInt8=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,1,255,0),this[e]=255&t,e+1},s.prototype.writeUInt16LE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,2,65535,0),this[e]=255&t,this[e+1]=t>>>8,e+2},s.prototype.writeUInt16BE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,2,65535,0),this[e]=t>>>8,this[e+1]=255&t,e+2},s.prototype.writeUInt32LE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,4,0xffffffff,0),this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t,e+4},s.prototype.writeUInt32BE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,4,0xffffffff,0),this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t,e+4},s.prototype.writeIntLE=function(t,e,r,i){if(t*=1,e>>>=0,!i){var o=Math.pow(2,8*r-1);y(this,t,e,r,o-1,-o)}var a=0,n=1,s=0;for(this[e]=255&t;++a<r&&(n*=256);)t<0&&0===s&&0!==this[e+a-1]&&(s=1),this[e+a]=(t/n|0)-s&255;return e+r},s.prototype.writeIntBE=function(t,e,r,i){if(t*=1,e>>>=0,!i){var o=Math.pow(2,8*r-1);y(this,t,e,r,o-1,-o)}var a=r-1,n=1,s=0;for(this[e+a]=255&t;--a>=0&&(n*=256);)t<0&&0===s&&0!==this[e+a+1]&&(s=1),this[e+a]=(t/n|0)-s&255;return e+r},s.prototype.writeInt8=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,1,127,-128),t<0&&(t=255+t+1),this[e]=255&t,e+1},s.prototype.writeInt16LE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,2,32767,-32768),this[e]=255&t,this[e+1]=t>>>8,e+2},s.prototype.writeInt16BE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,2,32767,-32768),this[e]=t>>>8,this[e+1]=255&t,e+2},s.prototype.writeInt32LE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,4,0x7fffffff,-0x80000000),this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24,e+4},s.prototype.writeInt32BE=function(t,e,r){return t*=1,e>>>=0,r||y(this,t,e,4,0x7fffffff,-0x80000000),t<0&&(t=0xffffffff+t+1),this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t,e+4},s.prototype.writeFloatLE=function(t,e,r){return A(this,t,e,!0,r)},s.prototype.writeFloatBE=function(t,e,r){return A(this,t,e,!1,r)},s.prototype.writeDoubleLE=function(t,e,r){return E(this,t,e,!0,r)},s.prototype.writeDoubleBE=function(t,e,r){return E(this,t,e,!1,r)},s.prototype.copy=function(t,e,r,i){if(!s.isBuffer(t))throw TypeError("argument should be a Buffer");if(r||(r=0),i||0===i||(i=this.length),e>=t.length&&(e=t.length),e||(e=0),i>0&&i<r&&(i=r),i===r||0===t.length||0===this.length)return 0;if(e<0)throw RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw RangeError("Index out of range");if(i<0)throw RangeError("sourceEnd out of bounds");i>this.length&&(i=this.length),t.length-e<i-r&&(i=t.length-e+r);var o=i-r;if(this===t&&"function"==typeof Uint8Array.prototype.copyWithin)this.copyWithin(e,r,i);else if(this===t&&r<e&&e<i)for(var a=o-1;a>=0;--a)t[a+e]=this[a+r];else Uint8Array.prototype.set.call(t,this.subarray(r,i),e);return o},s.prototype.fill=function(t,e,r,i){if("string"==typeof t){if("string"==typeof e?(i=e,e=0,r=this.length):"string"==typeof r&&(i=r,r=this.length),void 0!==i&&"string"!=typeof i)throw TypeError("encoding must be a string");if("string"==typeof i&&!s.isEncoding(i))throw TypeError("Unknown encoding: "+i);if(1===t.length){var o,a=t.charCodeAt(0);("utf8"===i&&a<128||"latin1"===i)&&(t=a)}}else"number"==typeof t?t&=255:"boolean"==typeof t&&(t=Number(t));if(e<0||this.length<e||this.length<r)throw RangeError("Out of range index");if(r<=e)return this;if(e>>>=0,r=void 0===r?this.length:r>>>0,t||(t=0),"number"==typeof t)for(o=e;o<r;++o)this[o]=t;else{var n=s.isBuffer(t)?t:s.from(t,i),l=n.length;if(0===l)throw TypeError('The value "'+t+'" is invalid for argument "value"');for(o=0;o<r-e;++o)this[o+e]=n[o%l]}return this};var $=/[^+/0-9A-Za-z-_]/g;function I(t,e){e=e||1/0;for(var r,i=t.length,o=null,a=[],n=0;n<i;++n){if((r=t.charCodeAt(n))>55295&&r<57344){if(!o){if(r>56319||n+1===i){(e-=3)>-1&&a.push(239,191,189);continue}o=r;continue}if(r<56320){(e-=3)>-1&&a.push(239,191,189),o=r;continue}r=(o-55296<<10|r-56320)+65536}else o&&(e-=3)>-1&&a.push(239,191,189);if(o=null,r<128){if((e-=1)<0)break;a.push(r)}else if(r<2048){if((e-=2)<0)break;a.push(r>>6|192,63&r|128)}else if(r<65536){if((e-=3)<0)break;a.push(r>>12|224,r>>6&63|128,63&r|128)}else if(r<1114112){if((e-=4)<0)break;a.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}else throw Error("Invalid code point")}return a}function S(t){for(var e=[],r=0;r<t.length;++r)e.push(255&t.charCodeAt(r));return e}function k(t){return i.toByteArray(function(t){if((t=(t=t.split("=")[0]).trim().replace($,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}(t))}function T(t,e,r,i){for(var o=0;o<i&&!(o+r>=e.length)&&!(o>=t.length);++o)e[o+r]=t[o];return o}function D(t,e){return t instanceof e||null!=t&&null!=t.constructor&&null!=t.constructor.name&&t.constructor.name===e.name}var O=function(){for(var t="0123456789abcdef",e=Array(256),r=0;r<16;++r)for(var i=16*r,o=0;o<16;++o)e[i+o]=t[r]+t[o];return e}()},783:function(t,e){e.read=function(t,e,r,i,o){var a,n,s=8*o-i-1,l=(1<<s)-1,d=l>>1,p=-7,f=r?o-1:0,c=r?-1:1,u=t[e+f];for(f+=c,a=u&(1<<-p)-1,u>>=-p,p+=s;p>0;a=256*a+t[e+f],f+=c,p-=8);for(n=a&(1<<-p)-1,a>>=-p,p+=i;p>0;n=256*n+t[e+f],f+=c,p-=8);if(0===a)a=1-d;else{if(a===l)return n?NaN:1/0*(u?-1:1);n+=Math.pow(2,i),a-=d}return(u?-1:1)*n*Math.pow(2,a-i)},e.write=function(t,e,r,i,o,a){var n,s,l,d=8*a-o-1,p=(1<<d)-1,f=p>>1,c=5960464477539062e-23*(23===o),u=i?0:a-1,h=i?1:-1,g=+(e<0||0===e&&1/e<0);for(isNaN(e=Math.abs(e))||e===1/0?(s=+!!isNaN(e),n=p):(n=Math.floor(Math.log(e)/Math.LN2),e*(l=Math.pow(2,-n))<1&&(n--,l*=2),n+f>=1?e+=c/l:e+=c*Math.pow(2,1-f),e*l>=2&&(n++,l/=2),n+f>=p?(s=0,n=p):n+f>=1?(s=(e*l-1)*Math.pow(2,o),n+=f):(s=e*Math.pow(2,f-1)*Math.pow(2,o),n=0));o>=8;t[r+u]=255&s,u+=h,s/=256,o-=8);for(n=n<<o|s,d+=o;d>0;t[r+u]=255&n,u+=h,n/=256,d-=8);t[r+u-h]|=128*g}}},o={};function a(t){var e=o[t];if(void 0!==e)return e.exports;var r=o[t]={exports:{}},n=!0;try{i[t](r,r.exports,a),n=!1}finally{n&&delete o[t]}return r.exports}a.ab="/ROOT/preveia/node_modules/next/dist/compiled/buffer/",e.exports=a(72)},127670,t=>{"use strict";let e=(0,t.i(785907).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);t.s(["Loader2",0,e],127670)},284216,t=>{"use strict";let e=(0,t.i(785907).default)("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);t.s(["X",0,e],284216)},178735,t=>{"use strict";let e=(0,t.i(785907).default)("file-text",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);t.s(["FileText",0,e],178735)},735567,t=>{"use strict";let e=(0,t.i(785907).default)("eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);t.s(["Eye",0,e],735567)},927232,t=>{"use strict";function e(t){return(e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}t.s(["default",()=>e])},595219,t=>{"use strict";let e=(0,t.i(785907).default)("download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);t.s(["Download",0,e],595219)},952809,t=>{"use strict";let e=(0,t.i(785907).default)("save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);t.s(["Save",0,e],952809)},274246,688438,964077,t=>{"use strict";let e=72/2.54;function r(t){return"classico"===t?"classico":"moderno"}function i(t){let e=String(t?.cidade||t?.city||"").trim(),r=String(t?.estado||t?.state||t?.oab_uf||"").trim().toUpperCase();return(e||r&&"MA"!==r||(e="São Luís",r="MA"),e&&r)?{cidade:e,uf:r,localFormatado:`${e}/${r}`}:e?{cidade:e,uf:r,localFormatado:e}:r?{cidade:"",uf:r,localFormatado:`[Cidade]/${r}`}:{cidade:"São Luís",uf:"MA",localFormatado:"São Luís/MA"}}function o(t,e=new Date){let{localFormatado:r}=i(t),a=function(t=new Date){return t.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}(e);return`${r}, ${a}`}function a(t,e){let{cidade:r,uf:o,localFormatado:a}=i(e);if(!o)return t;let n=t,s=o.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return n=n.replace(RegExp(`(^|\\n)(\\*{0,2})${s},(\\s+\\d{1,2}\\s+de\\s+[A-Za-z\xe7\xc7\xe1\xe9\xed\xf3\xfa\xe3\xf5\xe2\xea\xf4\xe0\xfc]+\\s+de\\s+\\d{4})`,"gi"),`$1$2${a},$3`),n=r?n.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9])\\/${s}\\b`,"g"),`$1${a}`):n.replace(RegExp(`(^|[^A-Za-z\xc0-\xff0-9\\]])\\/${s}\\b`,"g"),`$1[Cidade]/${o}`)}function n(t){return t.replace(/^#{1,6}\s+/,"").replace(/^\*{1,2}/,"").replace(/\*{1,2}$/,"").replace(/^[IVXLC]+[.\-–—)\s:]+/i,"").replace(/^\d+(\.\d+)*[.\-–—)\s]+/,"").trim().toLowerCase().replace(/\s+/g," ")}function s(t){let e=t.trim();return/^#{1,6}\s+\S/.test(e)||/^\*{0,2}\d+(\.\d+)*\s+[A-ZÀ-Ÿ]/.test(e)||/^\*{0,2}[IVXLC]+\s*[–—\-.:)]\s+\S/.test(e)}function l(t){let e=t.match(/^(#{1,6})\s/);return e?e[1].length:/^\*{0,2}\d+\.\d+/.test(t.trim())?3:(/^\*{0,2}\d+\s/.test(t.trim()),2)}function d(t){let e=t.split("\n"),r=[];for(let t=0;t<e.length;t++){let i=e[t],o=e[t+1];if(s(i)&&o&&s(o)&&n(i)===n(o)&&n(i).length>3){l(i)<=l(o)&&(r.push(i),t++);continue}r.push(i)}let i=[];for(let t=0;t<r.length;t++){let e=i[i.length-1],o=r[t];e&&s(e)&&o.trim()&&n(e)===n(o)&&n(e).length>3||i.push(o)}return i.join("\n")}function p(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function f(t){return t.replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/_(.+?)_/g,"$1").replace(/`([^`]+)`/g,"$1")}function c(t){let e=t.search(/\n(?:(?:Nestes termos|Termos em que)[,.]?\s*\n+)?(?:Pede deferimento\.?)/i);if(-1===e){let e=t.search(/\n\*{0,2}[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+/i);return -1===e?t:u(t,e)}return u(t,e)}function u(t,e){let r=t.length,i=t.slice(e).search(/\n(?:>\s|Esta petição foi elaborada|\*{0,2}"A proteção)/i);return i>0&&(r=e+i),`${t.slice(0,e)}

<<<CLOSING>>>
${t.slice(e+1,r)}
<<<END_CLOSING>>>${t.slice(r)}`}let h=/(S[IÍ]NTESE|QUADRO\s+SIN[OÓ]PTICO|PROVAS\s+JUNTADAS|FUNDAMENTA[CÇ][AÃ]O|DOS?\s+PEDIDOS?|PRELIMINARMENTE|PLANILHA|FUMUS|PERICULUM)/i;function g(t){var e;let i,o,n,s,l,u,g,m,b=r(t.estilo),x=t.corPeticao||String(t.adv.cor_peticao||"#1d4ed8"),v=function(t,e={}){let i=r(e.estilo),o=a(t,e.adv);o=c(o=d(o));let n=RegExp("\\|(.+)\\|\\n\\|[-:\\s|]+\\|\\n((?:\\|.+\\|\\n?)+)","g");o=(o=(o=o.replace(n,(t,e,r)=>{let i=e.split("|").map(t=>t.trim()).filter(Boolean),o=r.trim().split("\n").map(t=>t.split("|").map(t=>t.trim()).filter(Boolean)),a='<div class="doc-table-wrap keep-together"><table class="doc-table"><thead><tr>';return i.forEach(t=>{a+=`<th>${p(f(t))}</th>`}),a+="</tr></thead><tbody>",o.forEach((t,e)=>{a+=`<tr class="${e%2==0?"even":"odd"}">`,t.forEach(t=>{a+=`<td>${p(f(t))}</td>`}),a+="</tr>"}),a+="</tbody></table></div>"})).replace(/<<<CLOSING>>>\n?/g,'<div class="closing-block keep-together">')).replace(/<<<END_CLOSING>>>/g,"</div>");let s=t=>p(f(String(t)));return(o=(o=(o=(o=(o=(o=function(t){let e=t.split(/(<div class="doc-box keep-together">)/);if(1===e.length)return t;let r=e[0];for(let t=1;t<e.length;t++)if('<div class="doc-box keep-together">'===e[t]){let i=e[t+1]||"",o=i.search(/<div class="(?:section-bar|section-classic|main-title|closing-block|doc-box)/);-1===o?r+=`<div class="doc-box keep-together">${i}</div>`:r+=`<div class="doc-box keep-together">${i.slice(0,o)}</div>${i.slice(o)}`,t++}else r+=e[t];return r}(o=(o=(o=(o=(o=(o=(o=(o=o.replace(/^#### (.+)$/gm,(t,e)=>`<div class="sub-sub-title">${s(e)}</div>`)).replace(/^### (.+)$/gm,(t,e)=>`<div class="sub-title">${s(e)}</div>`)).replace(/^## (.+)$/gm,(t,e)=>{let r=f(String(e)),o=h.test(r),a=`<div class="${"classico"===i?"section-classic":"section-bar"}${o?" doc-box-title":""}">${p(r)}</div>`;return o?`<<<BOX_START>>>${a}`:a})).replace(/^# (.+)$/gm,(t,e)=>`<div class="main-title">${s(e)}</div>`)).replace(/^(\*{0,2})(\d+\.\d+(?:\.\d+)*)\s+(.+?)(\*{0,2})$/gm,(t,e,r,i)=>{let o=`${r} ${f(String(i))}`,a=/fumus|periculum/i.test(o)?" keep-together":"";return`<div class="sub-title${a}">${p(o)}</div>`})).replace(/^(\*{0,2})(Fumus\s+boni\s+iuris(?:\s*[\/·–—-]\s*Periculum\s+in\s+mora)?|Periculum\s+in\s+mora)(\*{0,2})\s*$/gim,(t,e,r)=>`<div class="sub-title keep-together">${p(f(String(r)))}</div>`)).replace(/^(\*{0,2})(\d+)\.\s+([A-ZÀ-Ÿ].+?)(\*{0,2})$/gm,(t,e,r,o)=>{let a=`${r}. ${f(String(o))}`,n=h.test(a),s=`<div class="${"classico"===i?"section-classic":"section-bar"}${n?" doc-box-title":""}">${p(a)}</div>`;return n?`<<<BOX_START>>>${s}`:s})).replace(/<<<BOX_START>>>/g,'<div class="doc-box keep-together">'))).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")).replace(/\*(.+?)\*/g,"<em>$1</em>")).replace(/^---$/gm,'<hr class="divider"/>')).replace(/^✓ (.+)$/gm,'<div class="proof-item"><span class="check">✓</span>$1</div>')).replace(/^>\s?(.+)$/gm,'<blockquote class="doc-quote">$1</blockquote>')).split("\n\n").map(t=>t.startsWith("<")||t.includes("<div")?t:t.trim()?/<(?:div|table|hr|blockquote)/.test(t)?t.split("\n").map(t=>t.trim()?t.startsWith("<")?t:`<p class="doc-para">${t}</p>`:"").join(""):`<p class="doc-para">${t.replace(/\n/g,"<br/>")}</p>`:"").join("")}(t.text,{estilo:b,adv:t.adv}),y=String(t.adv.office_name||t.adv.name||"Advogado");return`
    <style>${function(t){let{estilo:e,corPeticao:r}=t,i="moderno"===e,o=!1!==t.comMargens?"padding: 3cm 2cm 2cm 3cm;":"padding: 0;";return`
    .pdf-page {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      ${o}
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      height: auto;
      min-height: 0;
    }
    .pdf-banner { width: 100%; max-height: 72px; object-fit: contain; object-position: left center; margin-bottom: 10px; display: block; }
    .pdf-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0A2540; padding-bottom: 14px; margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; }
    .pdf-header .logo { height: 50px; max-width: 180px; object-fit: contain; }
    .pdf-header .logo-fallback { height: 44px; width: 44px; border-radius: 8px; background: linear-gradient(135deg, #D4AF37, #B8941F); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size: 11px; color:#000; }
    .pdf-header .office-info { text-align:right; }
    .pdf-header .office-name { font-weight:bold; font-size: 13px; color:#0A2540; text-transform:uppercase; }
    .pdf-header .office-sub { font-size: 10px; color:#555; margin-top:2px; }
    .pdf-header .office-mail { font-size: 10px; color:${i?"#1d4ed8":"#333"}; margin-top:1px; }
    .section-bar { background: linear-gradient(135deg, ${r}, ${r}cc); color: #fff; font-weight: bold; font-size: 13px; padding: 8px 14px; margin: 22px 0 14px; border-left: 5px solid #D4AF37; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
    .section-classic { color: #000; font-weight: bold; font-size: 13px; padding: 4px 0; margin: 22px 0 10px; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.3px; border: none; background: none; page-break-after: avoid; break-after: avoid; }
    .sub-title { font-weight: bold; font-size: 12px; text-decoration: underline; margin: 14px 0 6px 16px; color:${i?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
    .sub-sub-title { font-weight: bold; font-size: 11px; margin: 10px 0 4px 28px; color:#000; page-break-after: avoid; break-after: avoid; }
    .main-title { text-align:center; font-weight:bold; font-size:15px; text-transform:uppercase; margin: 18px 0; color:${i?"#0A2540":"#000"}; page-break-after: avoid; break-after: avoid; }
    p, .doc-para {
      font-size: 12px;
      line-height: 1.65;
      text-align: justify;
      margin: 0 0 10px;
      orphans: 3;
      widows: 3;
      page-break-inside: auto;
      break-inside: auto;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }
    strong { color: ${i?"#0A2540":"#000"}; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    table.doc-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 11px; }
    table.doc-table th { background: ${i?"#0A2540":"#000"}; color: #fff; padding: 7px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
    table.doc-table td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
    table.doc-table tr.even td { background: ${i?"#f4f6f9":"#f5f5f5"}; }
    .proof-item { display:flex; align-items:center; gap:8px; font-size:12px; padding:6px 10px; margin-bottom:4px; background:${i?"#f8f8f8":"transparent"}; border-left: 3px solid ${i?"#D4AF37":"#000"}; page-break-inside: avoid; break-inside: avoid; }
    .proof-item .check { color:${i?"#D4AF37":"#000"}; font-weight:bold; }
    .doc-box { ${i?"border: 1px solid #c5d0e0; background: #f8fafc; padding: 12px 14px; margin: 16px 0; border-radius: 4px;":"border: 1px solid #000; background: transparent; padding: 10px 12px; margin: 16px 0;"}
      page-break-inside: avoid; break-inside: avoid;
    }
    .doc-box .section-bar, .doc-box .section-classic { margin-top: 0; }
    .doc-table-wrap { page-break-inside: avoid; break-inside: avoid; }
    .closing-block { text-align: right; margin-top: 36px; margin-left: auto; max-width: 58%; page-break-inside: avoid; break-inside: avoid; }
    .closing-block p { text-align: right; margin-bottom: 6px; }
    .closing-block strong { color: #000; }
    .doc-quote { font-size: 11px; color: #444; border-left: 2px solid #ccc; padding-left: 10px; margin: 12px 0; font-style: italic; text-align: left; }
    .pdf-footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; display:flex; justify-content:space-between; font-size: 9px; color: #888; page-break-inside: avoid; break-inside: avoid; }
    .pdf-page-spacer { width: 100%; display: block; pointer-events: none; }
    .keep-together { page-break-inside: avoid; break-inside: avoid; }
  `}({estilo:b,corPeticao:x,comMargens:t.comMargens})}</style>
    <div class="pdf-page">
      ${i=String((e=t.adv).office_name||e.name||"Advogado"),o=String(e.oab_uf||e.estado||"").toUpperCase(),n=String(e.oab_number||""),s=String(e.email||""),l=String(e.whatsapp||e.phone||""),u=e.banner_url?`<img src="${p(String(e.banner_url))}" class="pdf-banner" alt="Timbre"/>`:"",g=`${window.location.origin}/logo.png`,m=e.logo_url?`<img src="${p(String(e.logo_url))}" class="logo" alt="Logo"/>`:`<img src="${g}" class="logo" alt="Marple"/>`,`
    ${u}
    <div class="pdf-header keep-together">
      ${m}
      <div class="office-info">
        <div class="office-name">${p(i)}</div>
        <div class="office-sub">OAB/${p(o)} n\xba ${p(n)}</div>
        ${s?`<div class="office-mail">${p(s)}</div>`:""}
        ${l?`<div class="office-mail">${p(l)}</div>`:""}
      </div>
    </div>
  `}
      <div class="pdf-body">${v}</div>
      <div class="pdf-footer">
        <span>${p(y)}</span>
        <span>Gerado via Marple</span>
      </div>
    </div>
  `}t.s(["A4_WIDTH_PX",0,794,"MARGEM_PETICAO_PT",0,{left:3*e,top:3*e,right:2*e,bottom:2*e},"corrigirLocalNoTexto",0,a,"formatarLocalData",0,o,"limparMarkdownResidual",0,f,"marcarBlocoFinal",0,c,"margensDocxTwips",0,function(){return{top:Math.round(1701),right:Math.round(1134),bottom:Math.round(1134),left:Math.round(1701)}},"montarHtmlPeticao",0,g,"normalizarEstiloPeticao",0,r,"prepararTextoPeticao",0,function(t,e){return d(a(t,e))},"resolverLocalAdvogado",0,i],688438);let m="salario-maternidade-rural";function b(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function x(t,e="A informar"){let r=String(t||"").trim();if(!r)return e;if(!/\d/.test(r))return r;let i=t=>t>=1900&&t<=Math.min(2100,new Date().getFullYear()+1),o=(t,e,r)=>!i(r)||e<1||e>12||t<1||t>31?null:`${String(t).padStart(2,"0")}/${String(e).padStart(2,"0")}/${r}`,a=r.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);if(a){var n;let t;return o(Number.parseInt(a[1],10),Number.parseInt(a[2],10),(t=Number.parseInt(n=a[3],10),2===n.length?t>=50?1900+t:2e3+t:t))||e}if(a=r.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return o(Number.parseInt(a[3],10),Number.parseInt(a[2],10),Number.parseInt(a[1],10))||e;if(a=r.match(/^(\d{4})$/)){let t=Number.parseInt(a[1],10);return i(t)?String(t):e}let s=/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g;if(s.test(r))return r.replace(s,t=>x(t,e));let l=/(\d{4})-(\d{2})-(\d{2})/g;return l.test(r)?r.replace(l,t=>x(t,e)):r}function v(t,e,r){let i=t.indexOf(e);if(-1===i)return"";let o=t.indexOf(r,i+e.length);return -1===o?t.slice(i+e.length).trim():t.slice(i+e.length,o).trim()}function y(t){return String(t||"").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\s+\n/g,"\n").replace(/\n\s+/g,"\n").trim()}function w(t,e=""){let r=e?`sm-para ${e}`:"sm-para";return t.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).map(t=>{let e=b(y(f(t)).replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g,t=>x(t)).replace(/(\d{4})-(\d{2})-(\d{2})/g,t=>x(t))).replace(/\n/g,"<br/>");return`<p class="${r}">${e}</p>`}).join("")}function A(t){let e,r,i,o,a;if(!t)return"";let n=t.estilo||"horizontal";if("none"===n||!t.eventos?.length)return"";if("vertical"===n){let e,r;return e=`LINHA DO TEMPO — ${t.nome.toUpperCase()} | ${t.atividade}${t.local?` • ${t.local}`:""}`,r=(t.eventos.length?t.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).map((t,e)=>`
      <tr>
        <td class="sm-tl-num">${e+1}</td>
        <td class="sm-tl-data">${b(t.data)}</td>
        <td class="sm-tl-body">
          <div class="sm-tl-titulo">${b(t.titulo)}</div>
          ${t.detalhe?`<div class="sm-tl-detalhe">${b(t.detalhe)}</div>`:""}
        </td>
      </tr>`).join(""),`
    <div class="sm-timeline sm-timeline-vertical keep-together">
      <div class="sm-tl-title">${b(e)}</div>
      <table class="sm-tl-table" cellpadding="0" cellspacing="0">
        <tbody>${r}</tbody>
      </table>
    </div>
  `}return i=(r=(e=t.eventos.length?t.eventos:[{data:"—",titulo:"Sem eventos",detalhe:""}]).length)>1?624/(r-1):0,o=`LINHA DO TEMPO — ${t.nome.toUpperCase()} | ${t.atividade}${t.local?` • ${t.local}`:""}`,a="",e.forEach((t,e)=>{let r=48+e*i,o=e%2==0;a+=`
      <circle cx="${r}" cy="130" r="14" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
      <text x="${r}" y="135" text-anchor="middle" fill="#fff" font-size="11" font-family="Arial,sans-serif" font-weight="700">${e+1}</text>
      <text x="${r}" y="${o?60:204}" text-anchor="middle" fill="#555" font-size="10" font-family="Arial,sans-serif">${b(t.data)}</text>
      <text x="${r}" y="${o?78:168}" text-anchor="middle" fill="#0A2540" font-size="11" font-family="Arial,sans-serif" font-weight="700">${b(t.titulo)}</text>
      ${t.detalhe?`<text x="${r}" y="${o?96:186}" text-anchor="middle" fill="#666" font-size="9" font-family="Arial,sans-serif">${b(t.detalhe)}</text>`:""}
    `}),`
    <div class="sm-timeline keep-together">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" width="100%" height="260" role="img" aria-label="${b(o)}">
        <rect x="0" y="0" width="720" height="260" rx="12" ry="12" fill="#EEF1F5" stroke="#D0D7E2"/>
        <text x="16" y="28" fill="#0A2540" font-size="12" font-family="Arial,sans-serif" font-weight="700">${b(o)}</text>
        <line x1="48" y1="130" x2="672" y2="130" stroke="#0A2540" stroke-width="2.5"/>
        ${a}
      </svg>
    </div>
  `}function E(t,e=!0){if(!t.length)return"";let r=t.map(t=>{let e=t.match(/^((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s*([\s\S]*)$/i),r=e?e[1].toLowerCase():"",i=e?e[2]:t;return`
        <table class="sm-pedido-item" data-pdf-keep="1" cellpadding="0" cellspacing="0" width="100%" border="0"
          style="width:100%;border-collapse:collapse;margin:0 0 10px;page-break-inside:avoid;break-inside:avoid;">
          <tr>
            <td style="font-size:11.5px;line-height:1.6;text-align:justify;padding:0;vertical-align:top;">
              <span class="sm-rom">${b(r)}.</span> ${b(f(i))}
            </td>
          </tr>
        </table>`}).join("");return`
    <div class="sm-pedidos">
      ${e?'<p class="sm-para sm-pedidos-intro">Diante do exposto, requer:</p>':""}
      ${r}
    </div>
  `}function $(t){return`<div class="sm-section-bar keep-together">${b(t)}</div>`}function I(t){return t.includes("<<<SM_RURAL_V2>>>")}function S(t){var e,r,i,n,s,l,d;let p,c,u,h,g,m,S,k,T,D,O,R=a(t.text,t.adv);if(!I(R))return null;let N=(e=v(R,"<<<META>>>","<<<END_META>>>"),{tipoAcao:e.match(/tipo_acao:\s*(.+)/i)?.[1]?.trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",juizoDigital:!/juizo_digital:\s*false/i.test(e),prioridades:{idoso:/prioridade_idoso:\s*true/i.test(e),deficiente:/prioridade_deficiente:\s*true/i.test(e),menor:/prioridade_menor:\s*true/i.test(e)}}),L=v(R,"<<<ENDERECO>>>","<<<END_ENDERECO>>>"),_=v(R,"<<<QUALIFICACAO>>>","<<<END_QUALIFICACAO>>>"),M=v(R,"<<<TITULO>>>","<<<SUBTITULO>>>"),U=v(R,"<<<SUBTITULO>>>","<<<END_TITULO>>>"),z=v(R,"<<<EM_FACE>>>","<<<END_EM_FACE>>>"),C=v(R,"<<<I_PRELIMINARES>>>","<<<END_I>>>"),B=function(t){let e=[];for(let r of t.split("\n")){let t=r.match(/^\|(.+)\|(.+)\|\s*$/);if(!t)continue;let i=f(t[1].trim()),o=f(t[2].trim());!i||/^[-:]+$/.test(i)||/^campo$/i.test(i)||/^valor$/i.test(o)||((/data|nascimento|requer|indefer|der\.?\s*adm|req\.?\s*adm/i.test(i)||/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(o)||/^\d{4}-\d{2}-\d{2}/.test(o))&&(o=x(o)),e.push({campo:i,valor:o}))}return e}(v(R,"<<<II_QUADRO>>>","<<<END_II>>>")),P=v(R,"<<<III_SINTESE_ANTES>>>","<<<END_III_ANTES>>>"),j=function(t){try{let e=JSON.parse(t);if(!e||!Array.isArray(e.eventos))return null;let r=String(e.estilo||"horizontal").toLowerCase();return{nome:String(e.nome||"AUTORA"),atividade:String(e.atividade||"Agricultora"),local:String(e.local||""),estilo:"vertical"===r||"none"===r?r:"horizontal",eventos:e.eventos.map(t=>{let e=String(t?.data||"").trim();return{data:e?/\d/.test(e)?x(e):e:"—",titulo:String(t?.titulo||""),detalhe:String(t?.detalhe||"")}})}}catch{return null}}(v(R,"<<<TIMELINE>>>","<<<END_TIMELINE>>>")),F=v(R,"<<<III_SINTESE_DEPOIS>>>","<<<END_III_DEPOIS>>>"),q=v(R,"<<<IV_PROVAS>>>","<<<END_IV>>>").split("\n").map(t=>t.replace(/^✓\s*/,"").replace(/^[-*]\s*/,"").trim()).filter(Boolean).filter(t=>!t.startsWith("<")&&!/^#{1,6}\s/.test(t)),V=v(R,"<<<IV_FECHO>>>","<<<END_IV_FECHO>>>"),H=v(R,"<<<V_FUNDAMENTACAO>>>","<<<END_V>>>"),Z=function(t){let e,r=[],i=/(?:^|\n)\s*((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s+/gi,o=[];for(;null!==(e=i.exec(t));)o.push({num:e[1].toLowerCase(),start:e.index,bodyStart:e.index+e[0].length});for(let e=0;e<o.length;e++){let i=e+1<o.length?o[e+1].start:t.length,a=t.slice(o[e].bodyStart,i).trim();a&&r.push(`${o[e].num}. ${a}`)}return r}(v(R,"<<<VI_PEDIDOS>>>","<<<END_VI>>>")),G=v(R,"<<<FECHAMENTO>>>","<<<END_FECHAMENTO>>>"),J=(v(R,"<<<PLANILHA>>>","<<<END_PLANILHA>>>"),Z.filter(t=>!/^viii\./i.test(t.trim()))),X=Z.filter(t=>/^viii\./i.test(t.trim())),W=C.match(/DA GRATUIDADE[\s\S]*/i)?.[0]||C,Y=W.match(/^(DA GRATUIDADE[^:\n]*:?)/im),Q=Y?.[1]||"DA GRATUIDADE DA JUSTIÇA:",K=W.replace(/^(DA GRATUIDADE[^:\n]*:?)\s*/im,""),tt=function(t,e){let r=o(t),i=e.match(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm),a=(t,e)=>`
    <td class="sm-sign-card">
      <div class="sm-sign-line"></div>
      <div class="sm-sign-name">${b(t)}</div>
      <div class="sm-sign-oab">${b(e)}</div>
    </td>`,n="";if(i&&i.length)n=i.slice(0,2).map(t=>{let[e,r]=t.split("\n");return a(e.trim(),r.trim())}).join("");else{let e=String(t.name||"Advogado(a)"),r=String(t.oab_uf||t.estado||"").toUpperCase(),i=String(t.oab_number||"");n=a(e,`OAB/${r} n\xba ${i}`)}let s=e.replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,"").replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim,"").trim();return`
    <div class="sm-fechamento">
      ${w(s)}
      <p class="sm-local-data">${b(r)}.</p>
      <table class="sm-sign-row" cellpadding="0" cellspacing="0" width="100%">
        <tr>${n}</tr>
      </table>
    </div>
  `}(t.adv,G),te=y(f(L||"AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE [CIDADE]/[UF]")),tr=A(j),ti=!!tr.trim(),to=f(M||"AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE"),ta=b((to=to.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi," SALÁRIO-MATERNIDADE ")).trim()).replace(/SALÁRIO-MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE").replace(/SALÁRIO-\s*<br\/>\s*MATERNIDADE/gi,"SALÁRIO-<br/>MATERNIDADE"),tn=P||"";ti||(tn=tn.replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi," ").replace(/\s{2,}/g," ").trim());let ts=`
    ${(p=String((r=t.adv).office_name||r.name||"Advocacia"),c=String(r.oab_uf||r.estado||"").toUpperCase(),u=String(r.oab_number||""),h=String(r.email||""),m=(g=r.logo_url?String(r.logo_url):"")&&g.startsWith("data:")?`<img src="${g}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:g?`<img src="${b(g)}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`:`<table cellpadding="0" cellspacing="0" style="width:36px;height:36px;background:#D4AF37;"><tr><td style="width:36px;height:36px;text-align:center;vertical-align:middle;font-weight:bold;font-size:11px;color:#000;">${b(p.slice(0,2).toUpperCase())}</td></tr></table>`,S=h?`<br/><span style="font-size:9px;color:#1d4ed8;line-height:1.4;">${b(h)}</span>`:"",`
    <div class="sm-header">
      <table class="sm-header-table" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:130px;" />
          <col style="width:auto;" />
        </colgroup>
        <tr>
          <td width="130" valign="middle" align="left" style="width:130px;vertical-align:middle;text-align:left;padding:0;overflow:hidden;">${m}</td>
          <td valign="middle" align="right" style="vertical-align:middle;text-align:right;padding:0 0 0 10px;overflow:hidden;">
            <p align="right" style="margin:0;padding:0;text-align:right;font-family:'Times New Roman',Times,serif;">
              <span style="font-weight:bold;font-size:11.5px;text-transform:uppercase;line-height:1.35;color:#0A2540;">${b(p)}</span><br/>
              <span style="font-size:9px;color:#444;line-height:1.4;">OAB/${b(c)} n\xb0 ${b(u)}</span>${S}
            </p>
          </td>
        </tr>
      </table>
      <div class="sm-header-line"></div>
    </div>
  `)}
    <div class="sm-endereco">${b(te)}</div>
    ${(i=N.tipoAcao,n=N.juizoDigital,s=N.prioridades,k=t=>t?"(X)":"( )",T=(i||"").trim()||"SALÁRIO MATERNIDADE - SEGURADO ESPECIAL",`
    <table class="sm-meta-row" cellpadding="0" cellspacing="0">
      <tr>
        <td class="sm-meta-spacer">&nbsp;</td>
        <td class="sm-meta-cell">
          <table class="sm-meta-box" cellpadding="0" cellspacing="0">
            <tr><td class="sm-meta-inner">
              <div class="sm-meta-tipo">${b(T)}</div>
              ${!1!==n?'<div class="sm-meta-digital">JUÍZO 100% DIGITAL</div>':""}
              <div class="sm-meta-prio">
                <div class="sm-meta-prio-title">Prioridade Legal na tramita\xe7\xe3o processual:</div>
                <div class="sm-meta-prio-item">${k(s.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;</div>
                <div class="sm-meta-prio-item">${k(s.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;</div>
                <div class="sm-meta-prio-item">${k(s.menor)} Menor nos termos do ECA – Lei 8.069/1990;</div>
              </div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `)}
    ${w(_,"sm-para-qualif")}
    <div class="sm-main-title">${ta}</div>
    <div class="sm-sub-title">${b(f(U||"(SEGURADA ESPECIAL – AGRICULTORA)"))}</div>
    ${w(z)}
    ${$("I – PRELIMINARMENTE")}
    ${(l=f(Q),`<div class="sm-subhead keep-together">${b(l)}</div>`)}
    ${w(K)}
    ${$("II – QUADRO SINÓPTICO")}
    ${(D=B.map((t,e)=>`
      <tr class="${e%2==0?"even":"odd"}">
        <td class="campo">${b(t.campo)}</td>
        <td class="valor">${b(t.valor)}</td>
      </tr>`).join(""),`
    <div class="sm-table-wrap keep-together">
      <div class="sm-table-caption">RESUMO DAS PRINCIPAIS INFORMA\xc7\xd5ES DO PROCESSO</div>
      <table class="sm-quadro">
        <tbody>${D}</tbody>
      </table>
    </div>
  `)}
    ${$("III – SÍNTESE DO CONTEXTO FÁTICO")}
    ${w(tn)}
    ${ti?tr:""}
    ${w(F||"")}
    ${$("IV – DAS PROVAS JUNTADAS AOS AUTOS")}
    
    <div class="sm-provas keep-together">
      <table class="sm-provas-table" cellpadding="0" cellspacing="0" width="100%">
        ${q.map((t,e)=>`
          <tr class="${e%2==0?"even":"odd"}">
            <td class="sm-check">✓</td>
            <td class="sm-prova-txt">${b(t)}</td>
          </tr>`).join("")}
      </table>
    </div>
  
    ${w(V)}
    ${$("V – FUNDAMENTAÇÃO JURÍDICA")}
    ${w(H)}
    ${$("VI – PEDIDO / REQUERIMENTOS")}
    ${E(J.length?J:Z,!0)}
    ${X.length?E(X,!1):""}
    <div class="sm-fecho-bloco">
      ${tt}
      
    <div class="sm-anexo" style="margin-top:10pt;padding-top:4pt;border-top:0.5pt solid #ccc;page-break-before:auto;break-before:auto;page-break-inside:avoid;break-inside:avoid;">
      <div class="sm-anexo-title" style="margin:4px 0 10px;font-size:13px;">ANEXO – PLANILHA DE C\xc1LCULO</div>
      <div class="sm-table-wrap" style="margin:6px 0 8px;">
        <div class="sm-table-caption" style="padding:6px 10px;">PLANILHA DE C\xc1LCULO</div>
        <table class="sm-planilha" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:65%;" />
            <col style="width:35%;" />
          </colgroup>
          <tbody>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">1\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">2\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">3\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">4\xba M\xeas de benef\xedcio</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="total"><td style="padding:5px 10px;background:#c8a951;font-weight:bold;color:#1a1a1a;">TOTAL</td><td align="right" style="padding:5px 10px;text-align:right;background:#c8a951;font-weight:bold;color:#1a1a1a;white-space:nowrap;">R$ 6.072,00</td></tr>
          </tbody>
        </table>
        <p class="sm-nota" style="margin-top:4px;">Refer\xeancia do valor: quantia devida por fato gerador (cada nascimento) — sal\xe1rio m\xednimo vigente</p>
      </div>
    </div>
  
    </div>
    ${(O=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}),`
    <div class="sm-doc-fecho-wrap">
      <div class="sm-doc-gerado">Documento gerado em ${b(O)} pela plataforma Marple</div>
    </div>
  `)}
  `;return`
    <style>${d=!1!==t.comMargens,`
    .pdf-page.sm-rural {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      max-width: 794px;
      height: auto;
      min-height: 0;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      ${d?"padding: 3cm 2cm 2cm 3cm;":"padding: 0; box-sizing: border-box;"}
    }
    .sm-sheet {
      position: relative;
      min-height: 0;
      height: auto;
      width: 100%;
      box-sizing: border-box;
      page-break-inside: auto;
    }
    .sm-sheet-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-sheet-main { vertical-align: top; padding: 0; width: 100%; }
    .sm-sheet-foot { vertical-align: bottom; padding: 16px 0 0; width: 100%; }
    .sm-body { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; }
    .sm-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Evitar page-break-before no fluxo — causa p\xe1ginas em branco com html2canvas */
    .page-break-before { page-break-before: auto; break-before: auto; }
    .keep-together { page-break-inside: auto; break-inside: auto; }

    /* —— Cabe\xe7alho: TABLE logo | dados (sem flex) —— */
    .sm-header { margin-bottom: 18px; width: 100%; }
    .sm-header-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-header-logo { width: 24%; vertical-align: middle; text-align: left; padding: 0 8px 0 0; }
    .sm-header-info { width: 76%; vertical-align: middle; text-align: right; padding: 0; }
    .sm-logo { height: 36px; max-height: 36px; max-width: 120px; width: auto; display: block; }
    .sm-logo-fallback {
      height: 36px; width: 36px; border-collapse: collapse;
      background: #D4AF37;
    }
    .sm-logo-fallback td {
      height: 36px; width: 36px; text-align: center; vertical-align: middle;
      font-weight: bold; font-size: 11px; color: #000;
      background: #D4AF37;
    }
    .sm-office-name {
      font-weight: bold; font-size: 11.5px; color: #0A2540;
      text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.35;
    }
    .sm-office-sub { font-size: 9px; color: #444; margin-top: 2px; line-height: 1.4; }
    .sm-office-mail { font-size: 9px; color: #1d4ed8; margin-top: 1px; }
    .sm-header-line {
      border: none; border-top: 1.5px solid #0A2540;
      margin-top: 8px; width: 100%; height: 0;
    }
    .sm-page-top-line {
      border: none; border-top: 1px solid #999;
      width: 100%; height: 0; margin: 0 0 14px;
    }

    /* —— Rodap\xe9: no fluxo do documento (sem fixed/absolute) —— */
    .sm-footer { margin-top: 0; page-break-inside: avoid; break-inside: avoid; width: 100%; }
    .sm-footer-line { border: none; border-top: 1px solid #999; width: 100%; height: 0; margin: 0 0 6px; }
    .sm-footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-footer-left {
      text-align: left; font-weight: 600; font-size: 9px; color: #555; width: 70%;
    }
    .sm-footer-right {
      text-align: right; white-space: nowrap; font-size: 9px; color: #555; width: 30%;
    }

    .sm-endereco {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      text-align: justify;
      margin: 22px 0 20px;
      line-height: 1.55;
      page-break-after: avoid;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }

    /* —— Meta: tabela 2 cols + borda tracejada via border-style (sem float) —— */
    .sm-meta-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin: 0 0 14px; page-break-inside: avoid;
    }
    .sm-meta-spacer { width: 46%; padding: 0; }
    .sm-meta-cell { width: 54%; padding: 0; vertical-align: top; text-align: left; }
    table.sm-meta-box {
      width: 100%; border-collapse: collapse;
      border: 1.5px dashed #0A2540;
      background: #ffffff;
    }
    .sm-meta-inner {
      padding: 10px 12px;
      font-size: 9.5px;
      line-height: 1.5;
      text-align: left;
      vertical-align: top;
      color: #1a1a1a;
      overflow-wrap: anywhere;
      word-wrap: break-word;
      max-width: 100%;
    }
    .sm-meta-tipo {
      font-weight: bold; font-size: 10.5px; color: #0A2540;
      text-transform: uppercase; margin-bottom: 4px; line-height: 1.35;
      overflow-wrap: anywhere; word-wrap: break-word;
    }
    .sm-meta-digital {
      font-weight: bold; font-size: 10.5px; color: #0A2540; margin-bottom: 8px;
    }
    .sm-meta-prio {
      border-top: 1px dashed #999; padding-top: 6px; margin-top: 4px;
    }
    .sm-meta-prio-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
      font-size: 9.5px;
    }
    .sm-meta-prio-item { margin: 2px 0; line-height: 1.4; }

    .sm-main-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; color: #0A2540; margin: 16px 0 4px;
      page-break-after: avoid;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: normal;
      hyphens: none;
    }
    .sm-sub-title {
      text-align: center; font-size: 12px; font-weight: bold;
      margin: 0 0 14px; page-break-after: avoid;
    }

    .sm-section-bar {
      background: #2d5f8a;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 8px 14px;
      margin: 18px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      width: 100%;
      box-sizing: border-box;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .sm-subhead {
      font-weight: bold;
      font-size: 11.5px;
      color: #1a1a1a;
      margin: 10px 0 8px;
      padding: 0;
      background: none;
      border: none;
      page-break-after: avoid;
    }

    .sm-para {
      font-size: 11.5px;
      line-height: 1.65;
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0 0 10px;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sm-para-qualif { text-indent: 1.25cm; }

    .sm-table-wrap { margin: 10px 0 16px; page-break-inside: avoid; width: 100%; box-sizing: border-box; }
    .sm-table-caption {
      background: #1a3a5c;
      color: #fff;
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }
    table.sm-quadro, table.sm-planilha {
      width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed;
    }
    table.sm-quadro td, table.sm-planilha td {
      padding: 7px 10px; border-bottom: 1px solid #dde3ec; vertical-align: top;
    }
    table.sm-quadro tr.even td, table.sm-planilha tr.even td { background: #f5f5f5; }
    table.sm-quadro tr.odd td, table.sm-planilha tr.odd td { background: #ffffff; }
    table.sm-quadro td.campo { font-weight: bold; width: 42%; color: #1a1a1a; }
    table.sm-quadro td.valor { font-weight: normal; width: 58%; }
    table.sm-planilha td.num { text-align: right; white-space: nowrap; width: 35%; }
    table.sm-planilha tr.total td {
      background: #c8a951 !important;
      font-weight: bold;
      color: #1a1a1a;
    }
    .sm-nota {
      font-size: 9.5px; font-style: italic; color: #555;
      margin-top: 8px; text-align: center;
    }
    .sm-anexo-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; margin: 8px 0 16px; color: #0A2540;
      background: none; padding: 0;
    }

    .sm-timeline { margin: 14px 0 18px; page-break-inside: auto; }
    .sm-timeline svg { display: block; width: 100%; height: auto; }
    .sm-timeline-vertical { background: #EEF1F5; border: 1px solid #D0D7E2; padding: 12px 14px; }
    .sm-tl-title { font-weight: bold; font-size: 11.5px; color: #0A2540; margin-bottom: 10px; text-transform: uppercase; }
    .sm-tl-table { width: 100%; border-collapse: collapse; }
    .sm-tl-table td { padding: 8px 6px; vertical-align: top; border-bottom: 1px solid #d8dee8; }
    .sm-tl-num {
      font-weight: bold; color: #fff; background: #0A2540;
      text-align: center; width: 22px; height: 22px;
      line-height: 22px; font-size: 11px;
    }
    .sm-tl-data { width: 110px; font-size: 10.5px; color: #555; white-space: nowrap; }
    .sm-tl-titulo { font-weight: bold; font-size: 11.5px; color: #0A2540; }
    .sm-tl-detalhe { font-size: 10px; color: #666; margin-top: 2px; }

    .sm-provas { margin: 8px 0; }
    table.sm-provas-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.sm-provas-table tr.even td { background: #f5f5f5; }
    table.sm-provas-table tr.odd td { background: #fff; }
    table.sm-provas-table td { padding: 6px 10px; font-size: 11.5px; vertical-align: top; }
    table.sm-provas-table td.sm-check {
      color: #15803d; font-weight: bold; width: 22px; text-align: center;
    }
    table.sm-provas-table td.sm-prova-txt { width: auto; }

    .sm-pedidos-list { list-style: none; padding: 0; margin: 8px 0 0; }
    .sm-pedidos-list li,
    table.sm-pedido-item {
      font-size: 11.5px; line-height: 1.6; text-align: justify;
      margin: 0 0 10px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .sm-pedidos-intro { margin-bottom: 8px; }
    .sm-rom { font-weight: bold; margin-right: 4px; }

    .sm-fechamento { margin-top: 18px; }
    .sm-fecho-bloco { page-break-inside: auto; break-inside: auto; }
    .sm-local-data { text-align: right; font-size: 12px; margin: 14px 0 16px; font-weight: 500; }
    table.sm-sign-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin-top: 8px; page-break-inside: avoid;
    }
    td.sm-sign-card { text-align: center; vertical-align: top; padding: 0 12px; width: 50%; }
    .sm-sign-line { border-top: 1px solid #222; margin: 0 8px 8px; height: 0; }
    .sm-sign-name { font-weight: bold; font-size: 11.5px; text-transform: uppercase; }
    .sm-sign-oab { font-size: 10px; color: #333; margin-top: 2px; }

    .sm-doc-fecho-wrap {
      margin-top: 48pt;
      padding-top: 24pt;
      min-height: 72pt;
      width: 100%;
      box-sizing: border-box;
    }
    .sm-doc-gerado {
      text-align: center;
      font-size: 9px;
      color: #888;
      font-style: italic;
      border-top: 0.5pt solid #ddd;
      padding-top: 10pt;
      line-height: 1.4;
    }
  `}</style>
    <div class="pdf-page sm-rural">
      ${ts}
    </div>
  `}t.s(["AGENT_SM_RURAL",0,m,"injetarTimelineNoTexto",0,function(t,e){let r=JSON.stringify({nome:e.nome,atividade:e.atividade,local:e.local,estilo:e.estilo||"horizontal",eventos:e.eventos},null,2),i=`<<<TIMELINE>>>
${r}
<<<END_TIMELINE>>>`;return/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/.test(t)?t.replace(/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/,i):t.includes("<<<III_SINTESE_DEPOIS>>>")?t.replace("<<<III_SINTESE_DEPOIS>>>",`${i}

<<<III_SINTESE_DEPOIS>>>`):`${t.trim()}

${i}
`},"isSmRuralStructured",0,I,"montarHtmlSmRural",0,S,"montarTimelineDataPadrao",0,function(t,e="horizontal"){let r,i,o=[(t.cidade||"").trim(),(t.estado||t.uf||"").trim()].filter(Boolean).join("/");if(!o&&(t.endereco||"").trim()){let e=t.endereco.match(/([A-Za-zÀ-ú\s]+)\s*\/\s*([A-Z]{2})\s*$/);e&&(o=`${e[1].trim()}/${e[2]}`)}return{nome:(t.nome||"AUTORA").trim()||"AUTORA",atividade:(t.atividade||t.ocupacao||"Agricultora").trim()||"Agricultora",local:o,estilo:e,eventos:(r=[],(i=(t.periodo_segurado||"").trim())&&r.push({data:"Infância / juventude",titulo:"Início do labor rural",detalhe:i}),(t.data_nascimento_crianca||"").trim()&&r.push({data:x(t.data_nascimento_crianca.trim()),titulo:"Nascimento do(a) filho(a)",detalhe:t.nome_crianca?`Crian\xe7a: ${t.nome_crianca}`:""}),(t.data_requerimento||"").trim()&&r.push({data:x(t.data_requerimento.trim()),titulo:"Requerimento administrativo",detalhe:t.nb?`NB ${t.nb}`:"Pedido de salário-maternidade"}),(t.data_indeferimento||"").trim()&&r.push({data:x(t.data_indeferimento.trim()),titulo:"Indeferimento pelo INSS",detalhe:(t.motivo_inss||"").trim().slice(0,80)}),r.push({data:new Date().toLocaleDateString("pt-BR"),titulo:"Ajuizamento da ação",detalhe:"Petição inicial — JEF"}),r.length?r:[{data:"—",titulo:"Evento 1",detalhe:""},{data:"—",titulo:"Evento 2",detalhe:""}])}},"renderTimelineHtml",0,A,"slugArquivoPeticaoSm",0,function(t){let e=String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-");return`peticao-salario-maternidade-${e||"cliente"}`},"textoRodapeSm",0,function(t){let e=String(t.office_name||t.name||"Advocacia").trim(),{localFormatado:r}=i(t),o=e.toUpperCase();return r?`${o} | ${r}`:o}],964077),t.s(["montarHtmlPeticao",0,function(t){if(t.agentType===m||I(t.text)){let e=S({text:t.text,adv:t.adv,comMargens:t.comMargens,estilo:t.estilo});if(e)return e}return g(t)}],274246)}]);