import $ from 'jquery' // external global
import base64 from 'base64-arraybuffer'
import { StrDump } from './StrDump.js'

var strDump = new StrDump()

export function DumpString (dump) {
  this.dumper = dump
}

DumpString.prototype.dump = function (val, abs) {
  var dumpOpts = this.dumper.getDumpOpts()
  if ($.isNumeric(val)) {
    dumpOpts.attribs.class.push('numeric')
    this.dumper.checkTimestamp(val)
  }
  if (!dumpOpts.addQuotes) {
    dumpOpts.attribs.class.push('no-quotes')
  }
  if (abs) {
    return this.dumpAbs(abs)
  }
  return val
}

DumpString.prototype.dumpAbs = function (abs) {
  // console.log('dumpAbs', JSON.parse(JSON.stringify(abs)))
  var dumpOpts = this.dumper.getDumpOpts()
  var parsed
  var val
  if (abs.typeMore === 'classname') {
    val = this.dumper.markupIdentifier(abs.value)
    parsed = this.dumper.parseTag(val)
    $.extend(dumpOpts.attribs, parsed.attribs)
    return parsed.innerhtml
  }
  val = this.helper(abs.value)
  if (['base64', 'json', 'serialized'].indexOf(abs.typeMore) > -1) {
    return this.dumpEncoded(val, abs)
  }
  if (abs.typeMore === 'binary') {
    return this.dumpBinary(abs)
  }
  if (abs.strlen) {
    val += '<span class="maxlen">&hellip; ' + (abs.strlen - abs.value.length) + ' more bytes (not logged)</span>'
  }
  if (abs.prettifiedTag) {
    dumpOpts.postDump = function (val, dumpOpts) {
      return $('<span />', {
        class: 'value-container',
        'data-type': dumpOpts.type,
        html: '<span class="prettified">(prettified)</span> '
      }).append(val)
    }
  }
  return val
}

DumpString.prototype.dumpAsSubstitution = function (val) {
  // console.warn('dumpAsSubstitution', val)
  var ret = ''
  var diff
  if (typeof val === 'object') {
    if (val.typeMore === 'binary') {
      if (!val.value.length) {
        return 'Binary data not collected'
      }
      ret = this.dumper.parseTag(this.helper(val.value)).innerhtml
      diff = val.strlen - ret.split(' ').length
      if (diff) {
        ret += '[' + diff + ' more bytes (not logged)]'
      }
      return ret
    }
  }
  // we do NOT wrap in <span>...  log('<a href="%s">link</a>', $url);
  return this.dumper.dump(val, {}, null)
}

DumpString.prototype.dumpBinary = function (abs) {
  var dumpOpts = this.dumper.getDumpOpts()
  var lis = []
  var val = abs.value
    ? this.helper(abs.value)
    : ''
  var strLenDiff = abs.strlen - abs.strlenValue
  // console.warn('dumpBinary', abs)
  if (val.length && strLenDiff) {
    val += '<span class="maxlen">&hellip; ' + strLenDiff + ' more bytes (not logged)</span>'
  }
  if (abs.contentType) {
    lis.push('<li>mime type = <span class="t_string">' + abs.contentType + '</span></li>')
  }
  lis.push('<li>size = <span class="t_int">' + abs.strlen + '</span></li>')
  lis.push(abs.value.length
    ? '<li class="t_string"><span class="binary">' + val + '</span></li>'
    : '<li>Binary data not collected</li>')
  val = '<span class="t_type">binary string</span>' +
    '<ul class="list-unstyled value-container" data-type="' + abs.type + '">' +
       lis.join('') +
    '</ul>'
  if (dumpOpts.tagName === 'td') {
    val = '<td>' + val + '</td>'
  }
  dumpOpts.tagName = null
  return val
}

DumpString.prototype.dumpEncoded = function (val, abs) {
  var dumpOpts = this.dumper.getDumpOpts()
  var tagName = dumpOpts.tagName === '__default__'
    ? 'span'
    : dumpOpts.tagName
  var $tag = $('<' + tagName + '>', {
    class: 'string-encoded tabs-container',
    'data-type': abs.typeMore
  }).html(
      '<nav role="tablist">' +
        '<a class="nav-link" data-target=".string-raw" data-toggle="tab" role="tab"></a>' +
        '<a class="active nav-link" data-target=".string-decoded" data-toggle="tab" role="tab">decoded</a>' +
      '</nav>' +
      '<div class="string-raw tab-pane" role="tabpanel"></div>' +
      '<div class="active string-decoded tab-pane" role="tabpanel"></div>'
  )
  // console.warn('dumpEncoded', val, abs.typeMore, tagName)
  dumpOpts.tagName = null
  if (abs.typeMore === 'base64') {
    $tag.find('.nav-link').eq(0).html('base64')
    if (val.length && abs.strlen) {
      val += '<span class="maxlen">&hellip; ' + (abs.strlen - val.length) + ' more bytes (not logged)</span>'
    }
    val = $('<span />', dumpOpts.attribs).addClass('t_string').html(val)[0].outerHTML
  } else if (abs.typeMore === 'json') {
    $tag.find('.nav-link').eq(0).html('json')
    if (abs.prettified || abs.strlen) {
      abs.typeMore = null // unset typeMore to prevent loop
      val = this.dumper.dump(abs)
    }
  } else if (abs.typeMore === 'serialized') {
    $tag.find('.nav-link').eq(0).html('serialized')
    $tag.find('.nav-link').eq(1).html('unserialized')
  }
  $tag.find('.string-raw').html(val)
  $tag.find('.string-decoded').html(this.dumper.dump(abs.valueDecoded))
  // console.groupEnd()
  return $tag[0].outerHTML
}

DumpString.prototype.helper = function (val) {
  var bytes = val.substr(0, 6) === '_b64_:'
    ? new Uint8Array(base64.decode(val.substr(6)))
    : strDump.encodeUTF16toUTF8(val)
  var dumpOpts = this.dumper.getDumpOpts()
  val = dumpOpts.sanitize
    ? strDump.dump(bytes, true)
    : strDump.dump(bytes, false)
  if (dumpOpts.visualWhiteSpace) {
    val = visualWhiteSpace(val)
  }
  return val
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
  var i = 0
  var strBr = ''
  var searchReplacePairs = [
    [/\r/g, '<span class="ws_r"></span>'],
    [/\n/g, '<span class="ws_n"></span>' + strBr + '\n']
  ]
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
