import $ from 'jquery' // external global
import * as methods from './methods.js'

export function getNodeInfo (meta) {
  var $node
  var $container = $('#' + meta.requestId)
  var $debug
  var $tab
  var channelNameRoot = $container.data('channelNameRoot') || 'general'
  var channelName = meta.channel || channelNameRoot
  var channelSplit = channelName.split('.')
  var channelNameTop = channelSplit.shift()
  var info
  if ($container.length) {
    $debug = $container.find('.debug')
    $tab = getTabPane($container, channelNameTop, meta)
    $node = $tab.data('nodes').slice(-1)[0]
  } else {
    // create
    $container = $('' +
      '<div class="card mb-3 working">' +
        '<div class="card-header" data-toggle="collapse" data-target="#' + meta.requestId + ' &gt; .card-body.collapse">' +
          '<i class="fa fa-chevron-right"></i>' +
          '<i class="fa fa-times float-right btn-remove-session"></i>' +
          '<div class="card-header-body">' +
            '<h3 class="card-title">Building Request&hellip;</h3>' +
            '<i class="fa fa-spinner fa-pulse fa-lg"></i>' +
          '</div>' +
        '</div>' +
        '<div class="bg-white card-body collapse debug debug-enhanced-ui">' +
          '<header class="debug-menu-bar hide">' +
            '<nav role="tablist">' +
              '<a class="active nav-link" data-target=".' + nameToClassname(channelNameRoot) + '" data-toggle="tab" role="tab"><i class="fa fa-list-ul"></i>Log</a>' +
            '</nav>' +
          '</header>' +
          '<div class="debug-tabs">' +
            '<div class="active ' + nameToClassname(channelNameRoot) + ' tab-pane tab-primary" role="tabpanel">' +
              '<div class="sidebar-trigger"></div>' +
              '<div class="tab-body">' +
                '<ul class="debug-log-summary group-body"></ul>' +
                '<ul class="debug-log group-body"></ul>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<i class="fa fa-spinner fa-pulse"></i>' +
        '</div>' +
      '</div>'
    )
    $debug = $container.find('.debug')
    $debug.data('channels', [])
    $debug.data('channelNameRoot', channelNameRoot)
    $container.debugEnhance('sidebar', 'add')
    $container.debugEnhance('sidebar', 'close')
    $container.find('.debug-sidebar .sidebar-toggle').html('<i class="fa fa-lg fa-filter"></i>')
    $tab = $debug.find('.tab-primary')
    $node = $tab.find('.debug-log')
    $tab.data('nodes', [
      $node
    ])
    $tab.data('options', {
      sidebar: true
    })
    $container.attr('id', meta.requestId)
    $('#body').append($container)
  }
  info = {
    $container: $container,
    $node: $node,
    $tab: $tab,
    channelName: channelName,
    channelNameRoot: channelNameRoot,
    channelNameTop: channelNameTop, // ie channelName of tab
    channels: $debug.data('channels')
  }
  addChannel(info, meta)
  return info
}

function getTabPane ($container, channelNameTop, meta) {
  // console.log('getTabPane', channelNameTop, $container.data('channelNameRoot'));
  var classname = nameToClassname(channelNameTop)
  var $tabPane = $container.find('.debug-tabs > .' + classname)
  var $link
  if ($tabPane.length) {
    return $tabPane
  }
  // add tab
  $link = $('<a>', {
    class: 'nav-link',
    'data-target': '.' + classname,
    'data-toggle': 'tab',
    role: 'tab',
    html: channelNameTop
  })
  if (meta.channelIcon) {
    $link.prepend(meta.channelIcon)
  }
  $container.find('.debug-menu-bar').removeClass('hide').find('nav').append(
    $link
  )
  $tabPane = $('<div>', {
    class: 'tab-pane ' + classname,
    role: 'tabpanel'
  })
    .append($('<div>', {
      class: 'tab-body',
      html: '<ul class="debug-log-summary group-body"></ul>' +
        '<ul class="debug-log group-body"></ul>'
    }))
  $tabPane.data('nodes', [$tabPane.find('.debug-log')])
  $container.find('.debug-tabs').append($tabPane)
  return $tabPane
}

export function processEntry (logEntry) {
  // console.log(JSON.parse(JSON.stringify(logEntry)));
  var method = logEntry.method
  var meta = logEntry.meta
  var i
  var info = getNodeInfo(meta)
  var channelsTab = info.channels.filter(function (channelInfo) {
    return channelInfo.name === info.channelNameTop || channelInfo.name.indexOf(info.channelNameTop + '.') === 0
  })
  var $node

  try {
    if (meta.format === 'html') {
      if (typeof logEntry.args === 'object') {
        $node = $('<li />', { class: 'm_' + method })
        for (i = 0; i < logEntry.args.length; i++) {
          $node.append(logEntry.args[i])
        }
      } else {
        $node = $(logEntry.args)
        if (!$node.is('.m_' + method)) {
          $node = $('<li />', { class: 'm_' + method }).html(logEntry.args)
        }
      }
    } else if (methods.methods[method]) {
      $node = methods.methods[method](logEntry, info)
    } else {
      $node = methods.methods.default(logEntry, info)
    }
    updateSidebar(logEntry, info, $node !== false)
    if ($node) {
      if (meta.attribs && meta.attribs.class && meta.attribs.class === 'php-shutdown') {
        info.$node = info.$container.find('> .card-body > .debug-tabs > .tab-primary > .tab-body > .debug-log.group-body')
      }
      info.$node.append($node)
      $node.attr('data-channel', meta.channel) // using attr so can use [data-channel="xxx"] selector
      if (meta.attribs && Object.keys(meta.attribs).length) {
        if (meta.attribs.class) {
          $node.addClass(meta.attribs.class)
          delete meta.attribs.class
        }
        $node.attr(meta.attribs)
      }
      if (meta.icon) {
        $node.data('icon', meta.icon)
      }
      if (
        channelsTab.length > 1 &&
        info.channelName !== info.channelNameRoot + '.phpError' &&
        !info.$container.find('.channels input[value="' + info.channelName + '"]').prop('checked')
      ) {
        $node.addClass('filter-hidden')
      }
      if (meta.detectFiles) {
        // using attr so can find via css selector
        $node.attr('data-detect-files', meta.detectFiles)
        $node.attr('data-found-files', meta.foundFiles ? meta.foundFiles : [])
      }
      if ($node.is(':visible:not(.filter-hidden)')) {
        $node.debugEnhance()
      }
      if (!$node.is('.m_group')) {
        // don't remove from ourself
        // console.warn('remove empty from parent groups', $node[0])
        $node.parents('.m_group').removeClass('empty')
      }
    }
  } catch (err) {
    console.warn(err)
    console.log('logEntry', logEntry)
    /*
    processEntry({
      method: 'error',
      args: [
        '%cDebugWampClient: %cerror processing %c' + method + '()',
        'font-weight:bold;',
        '',
        'font-family:monospace;'
      ],
      meta: meta
    })
    */
  }
}

function updateSidebar (logEntry, info, haveNode) {
  var filterVal = null
  var method = logEntry.method
  var $filters = info.$container.find('.debug-sidebar .debug-filters')
  /*
    Update channel filter
  */
  if (['groupSummary', 'groupEnd'].indexOf(method) > -1) {
    return
  }
  /*
    Update error filters
  */
  if (['error', 'warn'].indexOf(method) > -1 && logEntry.meta.channel === info.channelNameRoot + '.phpError') {
    addError(logEntry, info)
    return
  }
  /*
    Update method filter
  */
  if (['alert', 'error', 'warn', 'info'].indexOf(method) > -1) {
    filterVal = method
  } else if (method === 'group' && logEntry.meta.level) {
    filterVal = logEntry.meta.level
  } else if (haveNode) {
    filterVal = 'other'
  }
  if (filterVal) {
    $filters.find('input[data-toggle=method][value=' + filterVal + ']')
      .closest('label')
      .removeClass('disabled')
  }
  /*
    Show "Expand All Groups" button
  */
  if (method === 'group' && info.$tab.find('.m_group').length > 2) {
    info.$container.find('.debug-sidebar .expand-all').show()
  }
}

function addChannel (info, meta) {
  var $container = info.$container
  var $channels = $container.find('.channels')
  var channelsChecked = []
  var channelsTab
  var $ul
  if (info.channelName === info.channelNameRoot + '.phpError' || haveChannel(info.channelName, info.channels)) {
    return false
  }
  info.channels.push({
    name: info.channelName,
    icon: meta.channelIcon,
    show: meta.channelShow
  })
  if (info.channelName !== info.channelNameRoot && info.channelName.indexOf(info.channelNameRoot + '.') !== 0) {
    // not main tab
    return true
  }

  /*
    only interested in main tab's channels
  */
  channelsTab = info.channels.filter(function (channel) {
    return channel.name === info.channelNameRoot || channel.name.indexOf(info.channelNameRoot + '.') === 0
  })
  if (channelsTab.length < 2) {
    return true
  }
  /*
    Two or more channels
  */
  if (channelsTab.length === 2) {
    // checkboxes weren't added when there was only one...
    channelsChecked.push(channelsTab[0].name)
  }
  if (meta.channelShow) {
    channelsChecked.push(info.channelName)
  }
  $channels.find('input:checked').each(function () {
    channelsChecked.push($(this).val())
  })
  $ul = $().debugEnhance('buildChannelList', channelsTab, info.channelNameRoot, channelsChecked)

  $channels.find('> ul').replaceWith($ul)
  $channels.show()
  $container.find('.debug').trigger('channelAdded.debug')
  return true
}

function nameToClassname (name) {
  return 'debug-tab-' + name.toLowerCase().replace(/\W+/g, '-')
}

function haveChannel (channelName, channels) {
  // channels.indexOf(channelName) > -1
  var i
  var len = channels.length
  var channel
  for (i = 0; i < len; i++) {
    channel = channels[i]
    if (channel.name === channelName) {
      return true
    }
  }
  return false
}

function addError (logEntry, info) {
  // console.log('addError', logEntry)
  var $filters = info.$container.find('.debug-sidebar .debug-filters')
  var $ul = $filters.find('.php-errors').show().find('> ul')
  var $input = $ul.find('input[value=' + logEntry.meta.errorCat + ']')
  var $label = $input.closest('label')
  var $badge = $label.find('.badge')
  var order = ['fatal', 'warning', 'deprecated', 'notice', 'strict']
  var count = 1
  var i = 0
  var rows = []
  if ($input.length) {
    count = $input.data('count') + 1
    $input.data('count', count)
    $badge.text(count)
  } else {
    $ul.append(
      $('<li>'
      ).append(
        $('<label>', {
          class: 'toggle active'
        }).append(
          $('<input>', {
            type: 'checkbox',
            checked: true,
            'data-toggle': 'error',
            'data-count': 1,
            value: logEntry.meta.errorCat
          })
        ).append(
          logEntry.meta.errorCat + ' <span class="badge">' + 1 + '</span>'
        )
      )
    )
    rows = $ul.find('> li')
    rows.sort(function (liA, liB) {
      var liAindex = order.indexOf($(liA).find('input').val())
      var liBindex = order.indexOf($(liB).find('input').val())
      return liAindex > liBindex ? 1 : -1
    })
    for (i = 0; i < rows.length; ++i) {
      $ul.append(rows[i]) // append each row in order (which moves)
    }
  }
}
