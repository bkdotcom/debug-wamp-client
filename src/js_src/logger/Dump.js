import $ from 'jquery' // external global
import base64 from 'base64-arraybuffer'
import { StrDump } from './StrDump.js'
import { DumpObject } from './dumpObject.js'

var strDump = new StrDump()
var typeMore = null
var $span
var argStringOpts = {}

export var Dump = function () {
  this.objectDumper = new DumpObject(this)
}

Dump.prototype.ABSTRACTION = '\x00debug\x00'.parseHex()
Dump.prototype.NOT_INSPECTED = '\x00notInspected\x00'.parseHex()
Dump.prototype.RECURSION = '\x00recursion\x00'.parseHex()
Dump.prototype.UNDEFINED = '\x00undefined\x00'.parseHex()

Dump.prototype.dump = function (val, opts, wrap, decodeString) {
  // console.log('dump', JSON.stringify(val))
  var type = this.getType(val)
  var method = 'dump' + type.ucfirst()
  var k
  var absAttribs = {}
  var optsDefault = {
    addQuotes: true,
    sanitize: true,
    visualWhiteSpace: true
  }
  if (opts === undefined || opts === true) {
    opts = []
  }
  if (wrap === undefined) {
    wrap = true
  }
  argStringOpts = $.extend(optsDefault, opts)
  $span = $('<span />')
  if (typeMore === 'abstraction') {
    for (k in argStringOpts) {
      if (val[k] !== undefined) {
        argStringOpts[k] = val[k]
      }
    }
    absAttribs = val.attribs || {}
    if (['string', 'bool', 'float', 'int', 'null'].indexOf(type) >= 0) {
      val = this[method](val.value)
    } else {
      val = this[method](val)
    }
  } else {
    val = this[method](val)
  }
  if (wrap) {
    if (absAttribs.class) {
      $span.addClass(absAttribs.class)
      delete absAttribs.class
    }
    $span.attr(absAttribs)
    val = $span.addClass('t_' + type).html(val)[0].outerHTML
  }
  $span = $('<span />')
  return val
}

Dump.prototype.dumpBool = function (val) {
  $span.addClass(typeMore)
  return val ? 'true' : 'false'
}

Dump.prototype.dumpArray = function (array) {
  var html = ''
  var keys = array.__debug_key_order__ || Object.keys(array)
  var length = keys.length
  var key
  var i
  if (length === 0) {
    html = '<span class="t_keyword">array</span>' +
        '<span class="t_punct">(</span>\n' +
        '<span class="t_punct">)</span>'
  } else {
    delete array.__debug_key_order__
    html = '<span class="t_keyword">array</span>' +
      '<span class="t_punct">(</span>\n' +
      '<span class="array-inner">\n'
    for (i = 0; i < length; i++) {
      key = keys[i]
      html += '\t<span class="key-value">' +
          '<span class="t_key' + (/^\d+$/.test(key) ? ' t_int' : '') + '">' + key + '</span>' +
          '<span class="t_operator">=&gt;</span>' +
          this.dump(array[key], true) +
        '</span>\n'
    }
    html += '</span>' +
      '<span class="t_punct">)</span>'
  }
  return html
}

Dump.prototype.dumpCallable = function (abs) {
  return (!abs.hideType ? '<span class="t_type">callable</span> ' : '') +
    this.markupIdentifier(abs)
}

Dump.prototype.dumpConst = function (abs) {
  $span.attr('title', abs.value
    ? 'value: ' + this.dump(abs.value)
    : null)
  return this.markupIdentifier(abs.name)
}

Dump.prototype.dumpFloat = function (val) {
  var date = checkTimestamp(val)
  if (date) {
    $span.addClass('timestamp').attr('title', date)
  }
  return val
}

Dump.prototype.dumpInt = function (val) {
  return this.dumpFloat(val)
}

Dump.prototype.dumpNotInspected = function () {
  return 'NOT INSPECTED'
}

Dump.prototype.dumpNull = function () {
  return 'null'
}

Dump.prototype.dumpObject = function (abs) {
  var val = this.objectDumper.dumpObject(abs)
  $span.attr('data-accessible', abs.scopeClass === abs.className
    ? 'private'
    : 'public'
  )
  return val
}

Dump.prototype.dumpRecursion = function () {
  return '<span class="t_keyword">array</span> <span class="t_recursion">*RECURSION*</span>'
}

Dump.prototype.dumpResource = function (abs) {
  return abs.value
}

Dump.prototype.dumpString = function (val) {
  var bytes
  var date
  // var sanitize = true
  if ($.isNumeric(val)) {
    $span.addClass('numeric')
    date = checkTimestamp(val)
    if (date) {
      $span.addClass('timestamp').attr('title', date)
    }
  } else {
    bytes = val.indexOf('_b64_:') === 0
      ? new Uint8Array(base64.decode(val.substr(6)))
      : strDump.encodeUTF16toUTF8(val)
    // console.log('bytes', bytes)
    if (argStringOpts.sanitize) {
      val = strDump.dump(bytes, true)
    } else {
      val = strDump.dump(bytes, false)
    }
    if (argStringOpts.visualWhiteSpace) {
      val = visualWhiteSpace(val)
    }
  }
  if (!argStringOpts.addQuotes) {
    $span.addClass('no-quotes')
  }
  return val
}

Dump.prototype.dumpUndefined = function () {
  return ''
}

Dump.prototype.getType = function (val) {
  var type
  typeMore = null
  if (val === null) {
    return 'null'
  }
  if (typeof val === 'boolean') {
    typeMore = val ? 'true' : 'false'
    return 'bool'
  }
  if (typeof val === 'string') {
    if (val === this.NOT_INSPECTED) {
      return 'notInspected'
    }
    if (val === this.RECURSION) {
      return 'recursion'
    }
    if (val === this.UNDEFINED) {
      return 'undefined'
    }
    return 'string'
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return 'int'
    }
    return 'float'
  }
  if (typeof val === 'object') { // already checked for null
    type = 'array'
    if (val.debug === this.ABSTRACTION) {
      type = val.type
      typeMore = 'abstraction'
    }
    return type
  }
  if (typeof val === 'undefined') {
    return 'undefined'
  }
}

Dump.prototype.markupIdentifier = function (val, attribs, tag) {
  var classname = ''
  var operator = '::'
  var identifier = ''
  var regex = /^(.+)(::|->)(.+)$/
  var matches = [] // str.match()
  // var opMethod = ''
  var split = []
  attribs = attribs || {}
  tag = tag || 'span'

  if (typeof val === 'object' && val.debug === this.ABSTRACTION) {
    val = val.value
    if (typeof val === 'object') {
      classname = val[0]
      identifier = val[1]
    } else {
      matches = val.match(regex)
      if (matches) {
        classname = matches[1]
        operator = matches[2]
        identifier = matches[3]
      } else {
        identifier = val
      }
    }
  } else if (typeof val === 'string' && (matches = val.match(regex))) {
    classname = matches[1]
    operator = matches[2]
    identifier = matches[3]
  } else {
    classname = val
  }
  operator = '<span class="t_operator">' + operator.escapeHtml() + '</span>'
  if (classname) {
    split = classname.split('\\')
    if (split.length > 1) {
      classname = split.pop()
      classname = '<span class="namespace">' + split.join('\\') + '\\</span>' +
        classname
    }
    attribs.class = 'classname'
    classname = $('<' + tag + '/>', attribs).html(classname)[0].outerHTML
  } else {
    operator = ''
  }
  if (identifier) {
    identifier = '<span class="t_identifier">' + identifier + '</span>'
  } else {
    operator = ''
  }
  return classname + operator + identifier
}

function checkTimestamp (val) {
  var secs = 86400 * 90 // 90 days worth o seconds
  var tsNow = Date.now() / 1000
  val = parseFloat(val, 10)
  if (val > tsNow - secs && val < tsNow + secs) {
    return (new Date(val * 1000)).toString()
  }
  return false
}

/**
 * Add whitespace markup
 *
 * @param string str string which to add whitespace html markup
 *
 * @return string
 */
function visualWhiteSpace (str) {
  // display \r, \n, & \t
  var strBr = ''
  var searchReplacePairs = [
    [/\r/g, '<span class="ws_r"></span>'],
    [/\n/g, '<span class="ws_n"></span>' + strBr + '\n']
  ]
  var i = 0
  var length = searchReplacePairs.length
  str = str.replace(/(\r\n|\r|\n)/g, function (match) {
    for (i = 0; i < length; i++) {
      match = match.replace(searchReplacePairs[i][0], searchReplacePairs[i][1])
    }
    return match
  })
    .replace(/(<br \/>)?\n$/g, '')
    .replace(/\t/g, '<span class="ws_t">\t</span>')
  return str
}
