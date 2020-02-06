import $ from 'jquery' // external global
import * as configModal from './configModal.js'
import { updateCssProperty } from './Css.js'

var classCollapsed = 'glyphicon-chevron-right'
var classExpanded = 'glyphicon-chevron-down'
var timeoutHandler
var navbarHeight = $('.navbar-collapse').outerHeight()

export function init (config) {
  updateCssProperty('wampClientCss', '.debug', 'font-size', 'inherit')
  updateCssProperty('wampClientCss', '#body', 'font-size', config.get('fontSize'))

  configModal.init(config)

  $('.clear').on('click', function () {
    $('#body > .panel').not('.working').remove()
  })

  $('body').on('mouseup', function (e) {
    if (timeoutHandler) {
      e.preventDefault()
      clearInterval(timeoutHandler)
      timeoutHandler = null
    }
  })

  $('.clear').on('mousedown', function (e) {
    timeoutHandler = setTimeout(function () {
      // has been long pressed (3 seconds)
      // clear all (incl working)
      $('#body > .panel').remove()
    }, 2000)
  })

  $('body').on('shown.bs.collapse hidden.bs.collapse', '.panel-body', function (e) {
    var $icon = $(this).closest('.panel').find('.panel-heading .' + classCollapsed + ', .panel-heading .' + classExpanded)
    $icon.toggleClass(classExpanded + ' ' + classCollapsed)
    if (e.type === 'shown') {
      $(this).find('.m_groupSummary > .group-body, .debug-log').debugEnhance()
    }
  })

  $('body').on('click', '.btn-remove-session', function (e) {
    $(this).closest('.panel').remove()
  })

  $(window).on('scroll', positionSidebar)

  $('body').on('open.debug.sidebar', function (e) {
    // console.warn('open.debug.sidebar')
    positionSidebar(true)
    var sidebarContentHeight = $(e.target).find('.sidebar-content').height()
    var $panel = $(e.target).closest('.panel')
    $panel.find('.panel-body').css({
      minHeight: sidebarContentHeight + 8 + 'px'
    })
    $('body').on('click', onBodyClick)
  })

  $('body').on('close.debug.sidebar', function (e) {
    // remove minHeight
    positionSidebar(true)
    var $panel = $(e.target).closest('.panel')
    $panel.find('.panel-body').attr('style', '')
    $('body').off('click', onBodyClick)
  })

  /*
  $('body').on('click', '.sidebar-tab', function (e){
    var $panel = $(e.target).closest('.panel'),
      sidebarIsOpen = $panel.find('.debug-sidebar.show').length > 0
    $panel.debugEnhance('sidebar', sidebarIsOpen ? 'close' : 'open')
  })
  */

  $('body').on('mouseenter', '.sidebar-trigger', function () {
    $(this).closest('.panel').debugEnhance('sidebar', 'open')
  })

  $('body').on('mouseleave', '.debug-sidebar', function () {
    $(this).closest('.panel').debugEnhance('sidebar', 'close')
  })
}

function onBodyClick (e) {
  if ($(e.target).closest('.debug-sidebar').length === 0) {
    $('.debug-sidebar.show').closest('.panel').debugEnhance('sidebar', 'close')
  }
}

function positionSidebar (transition) {
  var scrollTop = $(window).scrollTop() + navbarHeight
  var windowHeight = $(window).height()
  var $sidebar = $('.debug-sidebar.show')
  var $panelBody
  var panelOffset = 0
  var panelHeight = 0
  // var sidebarX = 0
  var heightAvail = 0
  var contentHeight = 0
  transition = typeof transition === 'boolean' ? transition : false
  if ($sidebar.length === 0) {
    // no sidebar open... find first visible open panel
    $('body').find('.panel-body.in').each(function () {
      // var rect = this.getBoundingClientRect()
      $panelBody = $(this)
      panelOffset = $panelBody.offset().top
      panelHeight = $panelBody.innerHeight()
      if (panelOffset < scrollTop || panelOffset + panelHeight > scrollTop) {
        $sidebar = $panelBody.find('.debug-sidebar')
        panelOffset = $panelBody.offset().top
        return false // break
      }
    })
    if ($sidebar.length === 0) {
      return
    }
  } else {
    $panelBody = $sidebar.closest('.panel-body')
    panelOffset = $panelBody.offset().top
    panelHeight = $panelBody.innerHeight()
    heightAvail = panelOffset + panelHeight - scrollTop
    contentHeight = $sidebar.find('.sidebar-content').height()
  }
  // $sidebarTab = $panelBody.find('.sidebar-tab')
  // sidebarTabStyleWas = $sidebarTab.attr('style')
  // console.log('sidebarTabStyleWas', sidebarTabStyleWas)
  $sidebar.attr('style', '')
  // $sidebarTab.attr('style', '')
  if (panelOffset < scrollTop) {
    // console.log('top scrolled above view', $sidebar.is('.show'))
    // if ($sidebar.is('.show')) {
    $sidebar.css({
      position: 'fixed',
      marginTop: 0,
      top: navbarHeight + 'px'
    })
    // }
    if (panelOffset + panelHeight < scrollTop + windowHeight) {
      // console.log('bottom is vis')
      if (heightAvail < contentHeight) {
        // console.warn('not enough height')
        $sidebar.css({
          position: 'absolute',
          top: 'unset',
          bottom: 0,
          height: (contentHeight + 4) + 'px'
        })
      } else {
        // console.warn('enough height')
        $sidebar.css({
          height: heightAvail + 'px'
        })
      }
    }
    /*
    $sidebarTab.css({
      position: 'fixed',
      top: navbarHeight+'px'
    })
    sidebarX = $sidebar.is('.show')
      ? '134px'
      : '16px'
    */
  }
  /*
  else if ($sidebar.is('.show')) {
    sidebarX = '119px'
  }
  if (sidebarX) {
    if (transition || sidebarTabStyleWas.match('translateX('+sidebarX+')')) {
      $sidebarTab.css({ transform: 'translateX('+sidebarX+')' })
    } else {
      $sidebarTab.css({ left: sidebarX })
    }
  }
  */
}
