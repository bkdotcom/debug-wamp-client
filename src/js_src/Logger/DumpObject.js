import $ from 'jquery' // external global

export function DumpObject (dump) {
  this.dump = dump
  this.OUTPUT_CONSTANTS = 4
  this.OUTPUT_METHODS = 8
  this.OUTPUT_METHOD_DESC = 16
  this.OUTPUT_ATTRIBUTES_OBJ = 64
  this.OUTPUT_ATTRIBUTES_CONST = 256
  this.OUTPUT_ATTRIBUTES_PROP = 1024
  this.OUTPUT_ATTRIBUTES_METHOD = 4096
  this.OUTPUT_ATTRIBUTES_PARAM = 16384
}

DumpObject.prototype.dumpObject = function (abs) {
  // console.info('dumpObject', abs)
  var html = ''
  var title = ((abs.phpDoc.summary || '') + '\n\n' + (abs.phpDoc.description || '')).trim()
  var strClassName = this.dump.markupIdentifier(abs.className, {
    title: title.length ? title : null
  })

  if (abs.isRecursion) {
    return strClassName +
      ' <span class="t_recursion">*RECURSION*</span>'
  } else if (abs.isExcluded) {
    return strClassName +
      ' <span class="excluded">(not inspected)</span>'
  }
  try {
    html = this.dumpToString(abs) +
      strClassName +
      '<dl class="object-inner">' +
        (abs.isFinal
          ? '<dt class="t_modifier_final">final</dt>'
          : ''
        ) +
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
        this.dumpAttributes(abs) +
        this.dumpConstants(abs) +
        this.dumpProperties(abs, { viaDebugInfo: abs.viaDebugInfo }) +
        (abs.flags & this.OUTPUT_METHODS
          ? this.dumpMethods(abs)
          : ''
        ) +
        this.dumpPhpDoc(abs) +
      '</dl>'
  } catch (e) {
    console.warn('e', e)
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

DumpObject.prototype.dumpAttributes = function (abs) {
  var html = ''
  var self = this
  var args = []
  if (abs.attributes === undefined) {
    return ''
  }
  if ((abs.flags & this.OUTPUT_ATTRIBUTES_OBJ) !== this.OUTPUT_ATTRIBUTES_OBJ) {
    return ''
  }
  // var $dd
  $.each(abs.attributes, function (key, attribute) {
    args = []
    html += '<dd class="attribute">'
    html += self.dump.markupIdentifier(attribute.name)
    if (Object.keys(attribute.arguments).length) {
      $.each(attribute.arguments, function (i, val) {
        args.push(
          (i.match(/^\d+$/) === null
            ? '<span class="t_parameter-name">' + i + '</span><span class="t_punct">:</span>'
            : '') +
          self.dump.dump(val)
        )
      })
      html += '<span class="t_punct">(</span>' +
        args.join('<span class="t_punct">,</span> ') +
        '<span class="t_punct">)</span>'
    }
    html += '</dd>'
  })
  return html.length
    ? '<dt class="attributes">attributes</dt>' + html
    : ''
}

DumpObject.prototype.dumpConstants = function (abs) {
  var html = Object.keys(abs.constants).length
    ? '<dt class="constants">constants</dt>'
    : ''
  var self = this
  var $dd
  if ((abs.flags & this.OUTPUT_CONSTANTS) !== this.OUTPUT_CONSTANTS) {
    return ''
  }
  $.each(abs.constants, function (key, info) {
    $dd = $('<dd class="constant ' + info.visibility + '">' +
      '<span class="t_modifier_' + info.visibility + '">' + info.visibility + '</span> ' +
      '<span class="t_identifier">' + key + '</span> ' +
      '<span class="t_operator">=</span> ' +
      self.dump.dump(info.value) +
      '</dd>')
    if ((abs.flags & this.OUTPUT_ATTRIBUTES_CONST) && info.attributes && info.attributes.length) {
      $dd.attr('data-attributes', JSON.stringify(info.attributes))
    }
    html += $dd[0].outerHTML
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
  $.each(properties, function (name, info) {
    // console.info('property info', info)
    var $dd
    var isPrivateAncestor = $.inArray('private', info.visibility) >= 0 && info.inheritedFrom
    var modifiers = ''
    var classes = {
      'debuginfo-value': info.valueFrom === 'debugInfo',
      'debug-value': info.valueFrom === 'debug',
      excluded: info.isExcluded,
      forceShow: info.forceShow,
      inherited: typeof info.inheritedFrom === 'string',
      'private-ancestor': info.isPrivateAncestor
    }
    name = name.replace('debug.', '')
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
        '>' + name + '</span>' +
      (info.value !== self.dump.UNDEFINED
        ? ' <span class="t_operator">=</span> ' +
          self.dump.dump(info.value)
        : ''
      ) +
      '</dd>'
    )
    if ((abs.flags & this.OUTPUT_ATTRIBUTES_PROP) && info.attributes && info.attributes.length) {
      $dd.attr('data-attributes', JSON.stringify(info.attributes))
    }
    if (info.inheritedFrom) {
      $dd.attr('data-inherited-from', info.inheritedFrom)
    }
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
  var html = '<dt class="methods">' + label + '</dt>' +
    magicMethodInfo(abs, ['__call', '__callStatic'])
  var self = this
  $.each(abs.methods, function (k, info) {
    var $dd = $('<dd class="method"></dd>').addClass(info.visibility)
    var modifiers = []
    var paramStr = self.dumpMethodParams(info.params, {
      outputAttributes: abs.flags & this.OUTPUT_ATTRIBUTES_PARAM
    })
    var returnType = ''
    if (info.isFinal) {
      $dd.addClass('final')
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
    $dd.html(
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
        ? '<br />' + self.dump.dump(info.returnValue)
        : ''
      ) +
      '</dd>'
    )
    if ((abs.flags & this.OUTPUT_ATTRIBUTES_METHOD) && info.attributes && info.attributes.length) {
      $dd.attr('data-attributes', JSON.stringify(info.attributes))
    }
    if (info.implements && info.implements.length) {
      $dd.attr('data-implements', info.implements)
    }
    if (info.inheritedFrom) {
      $dd.attr('data-inherited-from', info.inheritedFrom)
    }
    if (info.phpDoc.deprecated) {
      $dd.attr('data-deprecated-desc', info.phpDoc.deprecated[0].desc)
    }
    if (info.inheritedFrom) {
      $dd.addClass('inherited')
    }
    if (info.isDeprecated) {
      $dd.addClass('deprecated')
    }
    html += $dd[0].outerHTML
  })
  return html
}

DumpObject.prototype.dumpMethodParams = function (params, opts) {
  var $param
  var defaultValue
  // var html = ''
  var self = this
  $.each(params, function (i, info) {
    $param = $('<span />', {
      class: 'parameter'
    })
    if (info.isPromoted) {
      $param.addClass('isPromoted')
    }
    if (opts.outputAttributes && info.attributes && info.attributes.length) {
      $param.attr('data-attributes', JSON.stringify(info.attributes))
    }
    if (typeof info.type === 'string') {
      $param.append('<span class="t_type">' + info.type + '</span> ')
    }
    $param.append('<span class="t_parameter-name"' +
      (info.desc !== null
        ? ' title="' + info.desc.escapeHtml().replace('\n', ' ') + '"'
        : ''
      ) + '>' + info.name.escapeHtml() + '</span>')
    if (info.defaultValue !== self.dump.UNDEFINED) {
      defaultValue = info.defaultValue
      if (typeof defaultValue === 'string') {
        defaultValue = defaultValue.replace('\n', ' ')
      }
      $param.append(' <span class="t_operator">=</span> ' +
        $(self.dump.dump(defaultValue))
          .addClass('t_parameter-default')[0].outerHTML
      )
    }
    params[i] = $param[0].outerHTML
  })
  /*
  if (html.length) {
    html = html.substr(0, html.length - 2) // remove ', '
  }
  */
  return params.join('<span class="t_punct">,</span> ')
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
