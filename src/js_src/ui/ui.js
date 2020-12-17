import $ from 'jquery' // external global
import * as configModal from './configModal.js'
import { updateCssProperty } from './Css.js'

var classCollapsed = 'fa-chevron-right'
var classExpanded = 'fa-chevron-down'
var timeoutHandler
var navbarHeight // = $('.navbar-collapse').outerHeight()

export function init (config) {
  updateCssProperty('wampClientCss', '.debug', 'font-size', 'inherit')
  updateCssProperty('wampClientCss', '#body', 'font-size', config.get('fontSize'))

  configModal.init(config)

  // note:  navbar may not yet be at final height
  navbarHeight = $('.navbar-collapse').outerHeight()

  $('.clear').on('click', function () {
    $('#body > .card').not('.working').remove()
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
      $('#body > .card').remove()
    }, 2000)
  })

  $('body').on('shown.bs.collapse hidden.bs.collapse', '.card-body', function (e) {
    var $icon = $(this).closest('.card').find('.card-header .' + classCollapsed + ', .card-header .' + classExpanded)
    $icon.toggleClass(classExpanded + ' ' + classCollapsed)
    if (e.type === 'shown') {
      // $(this).find('.m_alert, .m_groupSummary > .group-body, .debug-log').debugEnhance()
      console.group('card shown -> enhance')
      //  > *:not(.filter-hidden, .enhanced)
      $(this).find('.m_alert, .group-body:visible').debugEnhance()
      console.groupEnd()
    }
  })

  $('body').on('click', '.btn-remove-session', function (e) {
    $(this).closest('.card').remove()
  })

  $(window).on('scroll', positionSidebar)

  $('body').on('open.debug.sidebar', function (e) {
    // console.warn('open.debug.sidebar')
    positionSidebar(true)
    var sidebarContentHeight = $(e.target).find('.sidebar-content').height()
    var $card = $(e.target).closest('.card')
    var minHeight = Math.max(sidebarContentHeight + 8, 200)
    $card.find('.card-body .tab-pane.active').css({
      minHeight: minHeight + 'px'
    })
    $('body').on('click', onBodyClick)
  })

  $('body').on('close.debug.sidebar', function (e) {
    // remove minHeight
    positionSidebar(true)
    var $card = $(e.target).closest('.card')
    $card.find('.card-body .tab-pane.active').attr('style', '')
    $('body').off('click', onBodyClick)
  })

  $('body').on('click', '.card-header[data-toggle=collapse]', function () {
    // data-target selector doesn't seem to work like it did in bootstrap 3
    var $target = $($(this).data('target'))
    navbarHeight = $('.navbar-collapse').outerHeight()
    $target.collapse('toggle')
  })

  /*
  $('body').on('click', '.sidebar-tab', function (e){
    var $card = $(e.target).closest('.card'),
      sidebarIsOpen = $card.find('.debug-sidebar.show').length > 0
    $card.debugEnhance('sidebar', sidebarIsOpen ? 'close' : 'open')
  })
  */

  $('body').on('mouseenter', '.sidebar-trigger', function () {
    $(this).closest('.card').debugEnhance('sidebar', 'open')
  })

  $('body').on('mouseleave', '.debug-sidebar', function () {
    $(this).closest('.card').debugEnhance('sidebar', 'close')
  })
}

function onBodyClick (e) {
  if ($(e.target).closest('.debug-sidebar').length === 0) {
    $('.debug-sidebar.show').closest('.card').debugEnhance('sidebar', 'close')
  }
}

function positionSidebar (transition) {
  // var navbarHeight = $('.navbar-collapse').outerHeight()
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
    // no sidebar open... find first visible open card
    $('body').find('.card-body.in').each(function () {
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
    $panelBody = $sidebar.closest('.card-body')
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
