import $ from 'jquery' // external global

export function DumpObject (dump) {
  this.dump = dump
}

DumpObject.prototype.dumpObject = function (abs) {
  // console.info('dumpObject', abs)
  var html = ''
  var title = ((abs.phpDoc.summary || '') + '\n\n' + (abs.phpDoc.description || '')).trim()
  var strClassName = this.dump.markupIdentifier(abs.className, {
    title: title.length ? title : null
  })
  var OUTPUT_CONSTANTS = 4
  var OUTPUT_METHODS = 8
  if (abs.isRecursion) {
    html = strClassName +
      ' <span class="t_recursion">*RECURSION*</span>'
  } else if (abs.isExcluded) {
    html = strClassName +
      ' <span class="excluded">(not inspected)</span>'
  } else {
    try {
      html = this.dumpToString(abs) +
        strClassName +
        '<dl class="object-inner">' +
          (abs.extends.length
            ? '<dt>extends</dt>' +
              '<dd class="extends">' + abs.extends.join('</dd><dd class="extends">') + '</dd>'
            : ''
          ) +
          (abs.implements.length
            ? '<dt>implements</dt>' +
              '<dd class="interface">' + abs.implements.join('</dd><dd class="interface">') + '</dd>'
            : ''
          ) +
          (abs.flags & OUTPUT_CONSTANTS
            ? this.dumpConstants(abs.constants)
            : ''
          ) +
          this.dumpProperties(abs, { viaDebugInfo: abs.viaDebugInfo }) +
          (abs.flags & OUTPUT_METHODS
            ? this.dumpMethods(abs)
            : ''
          ) +
          this.dumpPhpDoc(abs) +
        '</dl>'
    } catch (e) {
      console.warn('e', e)
    }
  }
  return html
}

DumpObject.prototype.dumpToString = function (abs) {
  // var objToString = ''
  var val = ''
  var len
  var title
  var valAppend = ''
  var $toStringDump
  if (abs.stringified !== null) {
    val = abs.stringified
  } else if (typeof abs.methods.__toString !== 'undefined' && abs.methods.__toString.returnValue) {
    val = abs.methods.__toString.returnValue
  }
  if (typeof val === 'object') {
    len = val.strlen
    val = val.value
  } else {
    len = val.length
  }
  if (len === 0) {
    return ''
  }
  if (len > 100) {
    val = val.substring(0, 100)
    valAppend = '&hellip; <i>(' + (len - 100) + ' more bytes)</i>'
  }
  $toStringDump = $(this.dump.dump(val))
  title = (!abs.stringified ? '__toString() : ' : '') + $toStringDump.prop('title')
  if (title === '__toString() : ') {
    title = '__toString()'
  }
  return '<span class="' + $toStringDump.prop('class') + ' t_stringified" ' +
    (title.length ? 'title="' + title + '"' : '') +
    '>' +
    $toStringDump.html() +
    valAppend +
    '</span> '
}

DumpObject.prototype.dumpConstants = function (constants) {
  var html = Object.keys(constants).length
    ? '<dt class="constants">constants</dt>'
    : ''
  var self = this
  $.each(constants, function (key, value) {
    html += '<dd class="constant">' +
      '<span class="t_identifier">' + key + '</span>' +
      ' <span class="t_operator">=</span> ' +
      self.dump.dump(value, true) +
      '</dd>'
  })
  return html
}

DumpObject.prototype.dumpPhpDoc = function (abs) {
  var count
  var html = ''
  var i
  var i2
  var info
  var key
  var tagEntries
  var value
  for (key in abs.phpDoc) {
    tagEntries = abs.phpDoc[key]
    if (!Array.isArray(tagEntries)) {
      continue
    }
    for (i = 0, count = tagEntries.length; i < count; i++) {
      info = tagEntries[i]
      if (key === 'author') {
        value = info.name
        if (info.email) {
          value += ' &lt;<a href="mailto:' + info.email + '">' + info.email + '</a>&gt;'
        }
        if (info.desc) {
          value += ' ' + info.desc.escapeHtml()
        }
      } else if (key === 'link') {
        value = '<a href="' + info.uri + '" target="_blank">' +
          (info.desc || info.uri).escapeHtml() +
          '</a>'
      } else if (key === 'see' && info.uri) {
        value = '<a href="' + info.uri + '" target="_blank">' +
          (info.desc || info.uri).escapeHtml() +
          '</a>'
      } else {
        value = ''
        for (i2 in info) {
          value += info[i2] === null
            ? ''
            : info[i2].escapeHtml() + ' '
        }
      }
      html += '<dd class="phpDoc phpdoc-' + key + '">' +
        '<span class="phpdoc-tag">' + key + '</span>' +
        '<span class="t_operator">:</span> ' +
        value +
        '</dd>'
    }
  }
  if (html.length) {
    html = '<dt>phpDoc</dt>' + html
  }
  return html
}

DumpObject.prototype.dumpProperties = function (abs, meta) {
  var html = ''
  var properties = abs.properties
  var label = Object.keys(properties).length
    ? 'properties'
    : 'no properties'
  var self = this
  if (meta.viaDebugInfo) {
    label += ' <span class="text-muted">(via __debugInfo)</span>'
  }
  html = '<dt class="properties">' + label + '</dt>'
  html += magicMethodInfo(abs, ['__get', '__set'])
  $.each(properties, function (k, info) {
    // console.info('property info', info)
    var $dd
    var isPrivateAncestor = $.inArray('private', info.visibility) >= 0 && info.inheritedFrom
    var modifiers = ''
    var classes = {
      'debuginfo-value': info.valueFrom === 'debugInfo',
      'debug-value': info.valueFrom === 'debug',
      forceShow: info.forceShow,
      excluded: info.isExcluded,
      'private-ancestor': info.isPrivateAncestor
    }
    if (typeof info.visibility !== 'object') {
      info.visibility = [info.visibility]
    }
    classes[info.visibility.join(' ')] = $.inArray('debug', info.visibility) < 0
    $.each(info.visibility, function (i, vis) {
      modifiers += '<span class="t_modifier_' + vis + '">' + vis + '</span> '
    })
    if (info.isStatic) {
      modifiers += '<span class="t_modifier_static">static</span> '
    }
    $dd = $('<dd class="property">' +
      modifiers +
      (isPrivateAncestor
        ? ' (<i>' + info.inheritedFrom + '</i>)'
        : ''
      ) +
      (info.type
        ? ' <span class="t_type">' + info.type + '</span>'
        : ''
      ) +
      ' <span class="t_identifier"' +
        (info.desc
          ? ' title="' + info.desc.escapeHtml() + '"'
          : ''
        ) +
        '>' + k + '</span>' +
      (info.value !== self.dump.UNDEFINED
        ? ' <span class="t_operator">=</span> ' +
          self.dump.dump(info.value)
        : ''
      ) +
      '</dd>'
    )
    $.each(classes, function (classname, useClass) {
      if (useClass) {
        $dd.addClass(classname)
      }
    })
    html += $dd[0].outerHTML
  })
  return html
}

DumpObject.prototype.dumpMethods = function (abs) {
  var label = Object.keys(abs.methods).length
    ? 'methods'
    : 'no methods'
  var html = '<dt class="methods">' + label + '</dt>'
  var self = this
  html += magicMethodInfo(abs, ['__call', '__callStatic'])
  $.each(abs.methods, function (k, info) {
    var paramStr = self.dumpMethodParams(info.params)
    var modifiers = []
    var returnType = ''
    var $dd
    if (info.isFinal) {
      modifiers.push('<span class="t_modifier_final">final</span>')
    }
    modifiers.push('<span class="t_modifier_' + info.visibility + '">' + info.visibility + '</span>')
    if (info.isStatic) {
      modifiers.push('<span class="t_modifier_static">static</span>')
    }
    if (info.return && info.return.type) {
      returnType = ' <span class="t_type"' +
        (info.return.desc !== null
          ? ' title="' + info.return.desc.escapeHtml() + '"'
          : ''
        ) +
        '>' + info.return.type + '</span>'
    }
    $dd = $('<dd class="method">' +
      modifiers.join(' ') +
      returnType +
      ' <span class="t_identifier"' +
        (info.phpDoc && info.phpDoc.summary !== null
          ? ' title="' + info.phpDoc.summary.escapeHtml() + '"'
          : ''
        ) +
        '>' + k + '</span>' +
      '<span class="t_punct">(</span>' + paramStr + '<span class="t_punct">)</span>' +
      (k === '__toString'
        ? '<br />' + self.dump.dump(info.returnValue, true)
        : ''
      ) +
      '</dd>'
    )
    $dd.addClass(info.visibility)
    if (info.isDeprecated) {
      $dd.addClass('deprecated')
    }
    if (info.implements && info.implements.length) {
      $dd.attr('data-implements', info.implements)
    }
    if (info.inheritedFrom) {
      $dd.addClass('inherited')
    }
    html += $dd[0].outerHTML
  })
  return html
}

DumpObject.prototype.dumpMethodParams = function (params) {
  var html = ''
  var defaultValue
  // var title
  var self = this
  $.each(params, function (i, info) {
    html += '<span class="parameter">'
    if (typeof info.type === 'string') {
      html += '<span class="t_type">' + info.type + '</span> '
    }
    html += '<span class="t_parameter-name"' +
      (info.desc !== null
        ? ' title="' + info.desc.escapeHtml().replace('\n', ' ') + '"'
        : ''
      ) + '>' + info.name.escapeHtml() + '</span>'
    if (info.defaultValue !== self.dump.UNDEFINED) {
      defaultValue = info.defaultValue
      if (typeof defaultValue === 'string') {
        defaultValue = defaultValue.replace('\n', ' ')
      }
      html += ' <span class="t_operator">=</span> '
      html += $(self.dump.dump(defaultValue, true, true, false))
        .addClass('t_parameter-default')[0].outerHTML
    }
    html += '</span>, ' // end .parameter
  })
  if (html.length) {
    html = html.substr(0, html.length - 2) // remove ', '
  }
  return html
}

function magicMethodInfo (abs, methods) {
  var i = 0
  var methodsHave = []
  var method
  for (i = 0; i < methods.length; i++) {
    method = methods[i]
    if (abs.methods[method]) {
      methodsHave.push('<code>' + method + '</code>')
    }
  }
  if (methodsHave.length < 1) {
    return ''
  }
  methods = methodsHave.join(' and ')
  methods = methodsHave.length === 1
    ? 'a ' + methods + ' method'
    : methods + ' methods'
  return '<dd class="magic info">This object has ' + methods + '</dd>'
}