import $ from 'jquery' // external global
import { Table } from './methodTable.js'
import { Dump } from './Dump.js'

var dump = new Dump()
var table = new Table(dump)

export var methods = {
  alert: function (logEntry, info) {
    // console.log('logEntry', logEntry)
    var message = logEntry.args[0]
    var level = logEntry.meta.level || logEntry.meta.class
    var dismissible = logEntry.meta.dismissible
    var $node = $('<div class="m_alert"></div>').addClass('alert-' + level)
      .html(message)
      .attr('data-channel', logEntry.meta.channel) // using attr so can use [data-channel="xxx"] selector
    if (dismissible) {
      $node.prepend('<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
        '<span aria-hidden="true">&times;</span>' +
        '</button>')
      $node.addClass('alert-dismissible')
    }
    if (logEntry.meta.icon) {
      $node.data('icon', logEntry.meta.icon)
    }
    info.$tab.find('> .tab-body > .debug-log-summary').before($node)
    $node.debugEnhance()
  },
  clear: function (logEntry, info) {
    var attribs = {
      class: 'm_clear',
      'data-file': logEntry.meta.file,
      'data-line': logEntry.meta.line
    }
    var channelFilter = function () {
      return $(this).data('channel') === logEntry.meta.channel
    }
    var flags = logEntry.meta.flags
    var i
    var $tab = info.$tab
    var $curNodeLog
    var $curTreeSummary
    var $curTreeLog
    var $node
    var $remove
    var nodes = info.$node.closest('.tab-pane').data('nodes')
    var stackLen = nodes.length
    processSubstitutions(logEntry)
    for (i = stackLen - 1; i >= 0; i--) {
      $node = nodes[i]
      if ($node.closest('.debug-log-summary').length && !$curTreeSummary) {
        $curTreeSummary = $node.parentsUntil('.debug-log-summary')
          .addBack()
          .prev('.group-header')
          .addBack()
      } else if ($node.closest('.debug-log').length && !$curTreeLog) {
        $curNodeLog = $node
        $curTreeLog = $node.parentsUntil('.debug-log')
          .addBack()
          .prev('.group-header')
          .addBack()
      }
    }
    if (flags.alerts) {
      $tab.find('.alert').filter(channelFilter).remove()
    }
    if (flags.summary) {
      $tab.find('.debug-log-summary > .m_groupSummary').each(function () {
        $remove = $(this)
          .find('*')
          .not($curTreeSummary)
          .filter(channelFilter)
        if (!flags.summaryErrors) {
          $remove = $remove.not('.m_error, .m_warn')
        }
        $remove.filter('.group-header').not('.enhanced').debugEnhance('expand')
        $remove.remove()
      })
    } else if (flags.summaryErrors) {
      $tab.find('.debug-log-summary .m_error, .debug-log-summary .m_warn').filter(channelFilter).remove()
    }
    if (flags.log) {
      $remove = $tab
        .find('.debug-log > *, .debug-log .m_group > *')
        .not($curTreeLog)
        .filter(channelFilter)
      if (!flags.logErrors) {
        $remove = $remove.not('.m_error, .m_warn')
      }
      $remove.filter('.group-header').not('.enhanced').debugEnhance('expand')
      $remove.remove()
    } else if (flags.logErrors) {
      $tab.find('.debug-log .m_error, .debug-log .m_warn').filter(channelFilter).remove()
    }
    if (!flags.silent) {
      if (info.$node.closest('.debug-log-summary').length) {
        // we're in summary.. let's switch to content
        info.$node = info.$tab.find('.debug-log')
      }
      info.$node = $curNodeLog
      return $('<li>', attribs).html(logEntry.args[0])
    }
  },
  endOutput: function (logEntry, info) {
    var $container = info.$container
    var responseCode = logEntry.meta.responseCode
    $container.removeClass('working')
    $container.find('.card-header .fa-spinner').remove()
    $container.find('.card-body > .fa-spinner').remove()
    if (responseCode && responseCode !== '200') {
      $container.find('.card-title').append(' <span class="label label-default" title="Response Code">' + responseCode + '</span>')
      if (responseCode.toString().match(/^5/)) {
        $container.addClass('bg-danger')
      }
    }
  },
  errorNotConsoled: function (logEntry, info) {
    var $container = info.$container
    var $tab = info.$tab
    var $node = $tab.find('.alert.error-summary')
    if (!$node.length) {
      $node = $('<div class="alert alert-error error-summary">' +
        '<h3><i class="fa fa-lg fa-times-circle"></i> Error(s)</h3>' +
        '<ul class="list-unstyled">' +
        '</ul>' +
        '</div>')
      $tab.prepend($node)
    }
    $node = $node.find('ul')
    $node.append($('<li></li>').text(logEntry.args[0]))
    if (logEntry.meta.class === 'error') {
      $container
        .addClass('bg-danger')
        .removeClass('bg-warning') // could keep it.. but lets remove ambiguity
    } else if (!$container.hasClass('bg-danger')) {
      $container.addClass('bg-warning')
    }
    // $container.removeClass('bg-default')
  },
  group: function (logEntry, info) {
    var $group = $('<li>', {
      class: 'm_group empty'
    })
    var $groupHeader = groupHeader(logEntry)
    var $groupBody = $('<ul>', {
      class: 'group-body'
    })
    var nodes = info.$tab.data('nodes')
    if (logEntry.meta.hideIfEmpty) {
      $group.addClass('hide-if-empty')
    }
    if (logEntry.meta.level) {
      $groupHeader.addClass('level-' + logEntry.meta.level)
      $groupBody.addClass('level-' + logEntry.meta.level)
    }
    $group
      .append($groupHeader)
      .append($groupBody)
    nodes.push($groupBody)
    if ($group.is(':visible')) {
      $group.debugEnhance()
    }
    return $group
  },
  groupCollapsed: function (logEntry, info) {
    return this.group(logEntry, info)
  },
  groupSummary: function (logEntry, info) {
    // see if priority already exists
    var priority = typeof logEntry.meta.priority !== 'undefined'
      ? logEntry.meta.priority // v2.1
      : logEntry.args[0]
    var $node
    var $tab = info.$tab
    var nodes = $tab.data('nodes')
    $tab.find('.debug-log-summary .m_groupSummary').each(function () {
      var priorityCur = $(this).data('priority')
      if (priorityCur === priority) {
        $node = $(this)
        return false // break
      } else if (priority > priorityCur) {
        $node = $('<li>')
          .addClass('m_groupSummary')
          .data('priority', priority)
          .html('<ul class="group-body"></ul>')
        $(this).before($node)
        return false // break
      }
    })
    if (!$node) {
      $node = $('<li>')
        .addClass('m_groupSummary')
        .data('priority', priority)
        .html('<ul class="group-body"></ul>')
      info.$tab
        .find('.debug-log-summary')
        .append($node)
    }
    $node = $node.find('> ul')
    nodes.push($node)
  },
  groupEnd: function (logEntry, info) {
    var $tab = info.$tab
    var nodes = $tab.data('nodes')
    var isSummaryRoot = nodes.length > 1 &&
      info.$node.hasClass('m_groupSummary')
    var $group
    var $toggle
    nodes.pop()
    if (!isSummaryRoot) {
      $toggle = info.$node.prev()
      $group = $toggle.parent()
      if ($group.hasClass('empty') && $group.hasClass('hide-if-empty')) {
        // console.log('remove', $group)
        // $toggle.remove()
        // info.$currentNode.remove()
        $group.remove()
      } else if (!$group.is(':visible')) {
        // console.log('not vis')
        // return
      } else {
        // console.log('enhance')
        $group.debugEnhance()
      }
    }
  },
  groupUncollapse: function (logEntry, info) {
    var $toggleNodes = info.$node.parentsUntil('.debug-log-summary, .debug-log').add(info.$node).prev()
    $toggleNodes.removeClass('collapsed').addClass('expanded')
  },
  meta: function (logEntry, info) {
    /*
      The initial message/method
    */
    var $title = info.$container.find('.card-header .card-header-body .card-title').html('')
    var metaVals = logEntry.args[0]
    var meta = logEntry.meta
    // console.log('meta', meta)
    info.$container.data('channelNameRoot', meta.channelNameRoot)
    info.$container.data('options', {
      drawer: meta.drawer
    })
    // info.$container.find('.card-header .card-header-body .pull-right').remove()
    if (meta.interface) {
      info.$container.find('.card-header').attr('data-interface', meta.interface)
    }
    if (metaVals.HTTPS === 'on') {
      $title.append('<i class="fa fa-lock fa-lg"></i> ')
    }
    if (metaVals.REQUEST_METHOD) {
      $title.append(metaVals.REQUEST_METHOD + ' ')
    }
    if (metaVals.HTTP_HOST) {
      $title.append('<span class="http-host">' + metaVals.HTTP_HOST + '</span>')
    }
    if (metaVals.REQUEST_URI) {
      $title.append('<span class="request-uri">' + metaVals.REQUEST_URI + '</span>')
    }
    if (metaVals.REQUEST_TIME) {
      var date = (new Date(metaVals.REQUEST_TIME * 1000)).toString().replace(/[A-Z]{3}-\d+/, '')
      info.$container
        .find('.card-header .card-header-body')
        .prepend('<span class="pull-right">' + date + '</span>')
    }
  },
  profileEnd: function (logEntry, info) {
    var $node = this.table(logEntry, info)
    return $node.removeClass('m_log').addClass('m_profileEnd')
  },
  table: function (logEntry, info) {
    var $table
    // console.warn('table', logEntry.meta.caption, logEntry)
    if (typeof logEntry.args[0] === 'object' && logEntry.args[0] !== null && Object.keys(logEntry.args[0]).length) {
      $table = table.build(logEntry.args[0], logEntry.meta, 'table-bordered')
      if (logEntry.meta.sortable) {
        $table.addClass('sortable')
      }
      return $('<li>', { class: 'm_' + logEntry.method }).append($table)
    } else {
      if (logEntry.meta.caption) {
        logEntry.args.unshift(logEntry.meta.caption)
      }
      return methods.default({
        method: 'log',
        args: logEntry.args,
        meta: logEntry.meta
      }, info)
    }
  },
  trace: function (logEntry, info) {
    var $table
    logEntry.meta = $.extend({
      caption: 'trace',
      columns: ['file', 'line', 'function']
    }, logEntry.meta)
    $table = table.build(
      logEntry.args[0],
      logEntry.meta,
      'table-bordered',
      logEntry.meta.inclContext
        ? tableAddContextRow
        : null
    )
    if (logEntry.meta.inclContext) {
      $table.addClass('trace-context')
    }
    if (logEntry.meta.sortable) {
      $table.addClass('sortable')
    }
    return $('<li class="m_trace"></li>').append($table)
  },
  default: function (logEntry, info) {
    // var arg
    var attribs = {
      class: 'm_' + logEntry.method
    }
    var $container = info.$container
    // var i
    var $node
    var method = logEntry.method
    // var args = logEntry.args,
    var meta = logEntry.meta
    // var numArgs = args.length
    // var hasSubs = false
    if (meta.file && meta.channel !== 'general.phpError') {
      attribs = $.extend({
        'data-file': meta.file,
        'data-line': meta.line
      }, attribs)
    }
    /*
      update card header to empasize error
    */
    if (meta.errorCat) {
      // console.warn('errorCat', meta.errorCat)
      attribs.class += ' error-' + meta.errorCat
      if (!meta.isSuppressed) {
        if (method === 'error') {
          // if suppressed, don't update card
          // console.log('bg-danger')
          $container
            .addClass('bg-danger')
            .removeClass('bg-warning') // could keep it.. but lets remove ambiguity
        } else if (!$container.hasClass('bg-danger')) {
          // console.log('card warning')
          $container.addClass('bg-warning')
        }
        // $container.removeClass('bg-default')
      }
    }
    if (['assert', 'error', 'info', 'log', 'warn'].indexOf(method) > -1 && logEntry.args.length > 1) {
      processSubstitutions(logEntry)
    }
    $node = buildEntryNode(logEntry)
    $node.attr(attribs)
    if (method === 'error') {
      if (meta.backtrace && meta.backtrace.length > 1) {
        $node.append(
          $('<ul>', { class: 'list-unstyled' }).append(
            methods.trace({
              args: [meta.backtrace],
              meta: {
                inclContext: true
              }
            }).attr('data-detect-files', 'true')
          )
        )
        $node.find('.m_trace').debugEnhance()
        if ($node.is('.error-fatal')) {
          this.endOutput(logEntry, info)
        }
      } else if (meta.context) {
        console.log('context', meta.context);
        $node.append(
          buildContext(meta.context, meta.line)
        );
      }
    }
    return $node
  }
}

function buildContext(context, lineNumber) {
  var keys = Object.keys(context || {}) // .map(function(val){return parseInt(val)}),
  var start = Math.min.apply(null, keys)
  return $('<pre>', {
    class: 'highlight line-numbers',
    'data-line': lineNumber,
    'data-start': start
  }).append(
    $('<code>', {
      class: 'language-php'
    }).text(Object.values(context).join(''))
  )
}

function tableAddContextRow ($tr, row, i) {
  // var keys = Object.keys(row.context || {}) // .map(function(val){return parseInt(val)}),
  // var start = Math.min.apply(null, keys)
  if (!row.context) {
    return $tr
  }
  i = parseInt(i, 10)
  $tr.attr('data-toggle', 'next')
  if (i === 0) {
    $tr.addClass('expanded')
  }
  return [
    $tr,
    $('<tr>', {
      class: 'context',
      style: i === 0
        ? 'display:table-row;'
        : null
    }).append(
      $('<td>', {
        colspan: 4
      }).append(
        [
          buildContext(row.context, row.line),
          row.args.length
            ? '<hr />Arguments = ' + dump.dump(row.args)
            : ''
        ]
      )
    )
  ]
}

function buildEntryNode (logEntry) {
  var i
  var glue = ', '
  var glueAfterFirst = true
  var args = logEntry.args
  var numArgs = args.length
  var meta = $.extend({
    sanitize: true,
    sanitizeFirst: null
  }, logEntry.meta)
  if (meta.sanitizeFirst === null) {
    meta.sanitizeFirst = meta.sanitize
  }
  if (typeof args[0] === 'string') {
    if (args[0].match(/[=:]\s*$/)) {
      // first arg ends with '=' or ':'
      glueAfterFirst = false
      args[0] = $.trim(args[0]) + ' '
    } else if (numArgs === 2) {
      glue = ' = '
    }
  }
  for (i = 0; i < numArgs; i++) {
    args[i] = dump.dump(args[i], {
      sanitize: i === 0
        ? meta.sanitizeFirst
        : meta.sanitize,
      addQuotes: i !== 0,
      visualWhiteSpace: i !== 0
    })
  }
  if (!glueAfterFirst) {
    return $('<li>').html(args[0] + ' ' + args.slice(1).join(glue))
  } else {
    return $('<li>').html(args.join(glue))
  }
}

/**
 * Generates groupHeader HTML
 *
 * @param string method debug method
 * @param list   args   method's arguments
 * @param object meta   meta values
 *
 * @return jQuery obj
 */
function groupHeader (logEntry) {
  var i = 0
  var $header
  var argStr = ''
  var argsAsParams = typeof logEntry.meta.argsAsParams !== 'undefined'
    ? logEntry.meta.argsAsParams
    : true
  var collapsedClass = logEntry.method === 'groupCollapsed'
    ? 'collapsed'
    : 'expanded'
  var label = logEntry.args.shift()
  for (i = 0; i < logEntry.args.length; i++) {
    logEntry.args[i] = dump.dump(logEntry.args[i])
  }
  argStr = logEntry.args.join(', ')
  if (argsAsParams) {
    if (logEntry.meta.isFuncName) {
      label = dump.markupIdentifier(label)
    }
    argStr = '<span class="group-label">' + label + '(</span>' +
      argStr +
      '<span class="group-label">)</span>'
    argStr = argStr.replace('(</span><span class="group-label">)', '')
  } else {
    argStr = '<span class="group-label">' + label + ':</span> ' +
      argStr
    argStr = argStr.replace(/:<\/span> $/, '</span>')
  }
  $header = $('<div class="group-header ' + collapsedClass + '">' +
    argStr +
    '</div>')
  if (typeof logEntry.meta.boldLabel === 'undefined' || logEntry.meta.boldLabel) {
    $header.find('.group-label').addClass('group-label-bold')
  }
  return $header
}

/**
 * @param logEntry
 *
 * @return void
 */
function processSubstitutions (logEntry, opts) {
  var subRegex = '%' +
    '(?:' +
    '[coO]|' + // c: css, o: obj with max info, O: obj w generic info
    '[+-]?' + // sign specifier
    '(?:[ 0]|\'.)?' + // padding specifier
    '-?' + // alignment specifier
    '\\d*' + // width specifier
    '(?:\\.\\d+)?' + // precision specifier
    '[difs]' +
    ')'
  var args = logEntry.args
  var argLen = args.length
  var hasSubs = false
  var index = 0
  var typeCounts = {
    c: 0
  }
  if (typeof args[0] !== 'string' || argLen < 2) {
    return
  }
  subRegex = new RegExp(subRegex, 'g')
  args[0] = args[0].replace(subRegex, function (match) {
    var replacement = match
    var type = match.substr(-1)
    index++
    if (index > argLen - 1) {
      return replacement
    }
    if ('di'.indexOf(type) > -1) {
      replacement = parseInt(args[index], 10)
    } else if (type === 'f') {
      replacement = parseFloat(args[index], 10)
    } else if (type === 's') {
      replacement = substitutionAsString(args[index], opts)
    } else if (type === 'c') {
      replacement = ''
      if (typeCounts.c) {
        // close prev
        replacement = '</span>'
      }
      replacement += '<span style="' + args[index].escapeHtml() + '">'
    } else if ('oO'.indexOf(type) > -1) {
      replacement = dump.dump(args[index])
    }
    typeCounts[type] = typeCounts[type]
      ? typeCounts[type] + 1
      : 1
    delete args[index] // sets to undefined
    return replacement
  })
  // using reduce to perform an array_sum
  hasSubs = Object.values(typeCounts).reduce(function (acc, val) { return acc + val }, 0) > 0
  if (hasSubs) {
    if (typeCounts.c) {
      args[0] += '</span>'
    }
    logEntry.args = args.filter(function (val) {
      return val !== undefined
    })
    logEntry.meta.sanitizeFirst = false
  }
}

/**
 * Cooerce value to string
 *
 * @param mixed $val value
 *
 * @return string
 */
function substitutionAsString (val) {
  var type = dump.getType(val)
  if (type === 'string') {
    val = dump.dump(val, true, false)
  } else if (type === 'array') {
    delete val.__debug_key_order__
    val = '<span class="t_keyword">array</span>' +
      '<span class="t_punct">(</span>' + Object.keys(val).length + '<span class="t_punct">)</span>'
  } else if (type === 'object') {
    val = dump.markupIdentifier(val.className)
  } else {
    val = dump.dump(val)
  }
  return val
}