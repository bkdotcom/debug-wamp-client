/*
eslint no-extend-native: ["error", { "exceptions": ["String"] }]
*/

Number.isSafeInteger = Number.isSafeInteger || function (value) {
  return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

Number.isInteger = Number.isInteger || function (nVal) {
  return typeof nVal === 'number' &&
    isFinite(nVal) &&
    nVal > -9007199254740992 && nVal < 9007199254740992 &&
    Math.floor(nVal) === nVal
}

if (!Array.isArray) {
  Array.isArray = function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]'
  }
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
  }
}
if (!Object.keys) {
  Object.keys = function (o) {
    if (o !== Object(o)) {
      throw new TypeError('Object.keys called on a non-object')
    }
    var k = []
    var p
    for (p in o) {
      if (Object.prototype.hasOwnProperty.call(o, p)) {
        k.push(p)
      }
    }
    return k
  }
}

String.prototype.escapeHtml = function () {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return this.replace(/[&<>"']/g, function (m) { return map[m] })
}

String.prototype.parseHex = function () {
  return this.replace(/\\x([A-F0-9]{2})/gi, function (a, b) {
    return String.fromCharCode(parseInt(b, 16))
  })
}

String.prototype.ucfirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}
