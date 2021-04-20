import $ from 'jquery' // external global
import * as configModal from './configModal.js'
import { updateCssProperty } from './Css.js'

var classCollapsed = 'fa-chevron-right'
var classExpanded = 'fa-chevron-down'
var timeoutHandler
var navbarHeight // = $('.navbar-collapse').outerHeight()
var $cardsInViewport = $()

export function init (config) {
  var io = new IntersectionObserver(
    function (entries) {
      // console.log('IntersectionObserver update', entries)
      var i
      var len = entries.length
      var entry
      for (i = 0; i < len; i++) {
        entry = entries[i]
        if (entry.isIntersecting === false) {
          // console.log('no longer visible', entry.target)
          $cardsInViewport = $cardsInViewport.not(entry.target)
          continue
        }
        // console.log('now visible', entry.target)
        $cardsInViewport = $cardsInViewport.add(entry.target)
      }
      // console.log('open cardsInViewport', $cardsInViewport.filter('.expanded').length, $cardsInViewport.filter('.expanded'))
    },
    {
      // options
      rootMargin: '-39px 0px 0px 0px'
    }
  )

  $('.navbar .clear').on('click', function () {
    $('#debug-cards > .card').not('.working').trigger('removed.debug.card').remove()
  })

  $('#debug-cards').on('added.debug.card', function (e) {
    // console.warn('card added', e.target, e)
    io.observe(e.target)
  })
  $('#debug-cards').on('removed.debug.card', function (e) {
    // console.warn('card removed', e.target, e)
    io.unobserve(e.target)
    $cardsInViewport = $cardsInViewport.not(e.target)
  })

  $('body').on('mouseup', function (e) {
    if (timeoutHandler) {
      e.preventDefault()
      clearInterval(timeoutHandler)
      timeoutHandler = null
    }
  })

  // test for long-press of main clear button
  $('.clear').on('mousedown', function (e) {
    timeoutHandler = setTimeout(function () {
      // has been long pressed (3 seconds)
      // clear all (incl working)
      $('#debug-cards > .card.working').each(function () {
        console.warn('removed working session:' + $(this).prop('id'))
      })
      $('#debug-cards > .card').trigger('removed.debug.card').remove()
    }, 2000)
  })

  $('body').on('shown.bs.collapse hidden.bs.collapse', '.card-body', function (e) {
    var $cardBody = $(this)
    var $card = $cardBody.closest('.card')
    var $icon = $card.find('.card-header .' + classCollapsed + ', .card-header .' + classExpanded)
    $icon.toggleClass(classExpanded + ' ' + classCollapsed)
    $card.toggleClass('expanded')
    if (e.type === 'shown') {
      $cardBody.find('> .debug-menu-bar').css('top', (navbarHeight + $card.find('> .card-header').outerHeight()) + 'px')
      $cardBody.find('.m_alert, .group-body:visible').debugEnhance()
    }
  })

  // close btn on card-header clicked
  $('body').on('click', '.btn-remove-session', function (e) {
    var $card = $(this).closest('.card')
    if ($card.hasClass('working')) {
      console.warn('removed working session:' + $card.prop('id'))
    }
    $card.trigger('removed.debug.card').remove()
  })

  $(window).on('scroll', debounce(function () {
    // console.group('scroll')
    $cardsInViewport.filter('.expanded').each(function () {
      positionSidebar($(this))
    })
    // console.groupEnd()
  }, 50))

  $('body').on('open.debug.sidebar', function (e) {
    // console.warn('open.debug.sidebar')
    var $sidebar = $(e.target)
    var $card = $sidebar.closest('.card')
    var sidebarContentHeight = $sidebar.find('.sidebar-content').height()
    // var minHeight = Math.max(sidebarContentHeight + 8, 200)
    $card.find('.card-body > .tab-panes > .tab-pane').css({
      minHeight: sidebarContentHeight + 'px'
    })
    positionSidebar($card)
    $('body').on('click', onBodyClick)
  })

  $('body').on('close.debug.sidebar', function (e) {
    // remove minHeight
    var $card = $(e.target).closest('.card')
    positionSidebar($card)
    // $card.find('.card-body .tab-pane').attr('style', '')
    $('body').off('click', onBodyClick)
  })

  $('body').on('click', '.card-header[data-toggle=collapse]', function () {
    var $target = $($(this).data('target'))
    navbarHeight = $('.navbar-collapse').outerHeight()
    $target.collapse('toggle')
  })

  /*
  $('body').on('click', '.sidebar-tab', function (e){
    var $card = $(e.target).closest('.card')
    var sidebarIsOpen = $card.find('.debug-sidebar.show').length > 0
    $card.debugEnhance('sidebar', sidebarIsOpen ? 'close' : 'open')
  })
  */

  $('body').on('mouseenter', '.sidebar-trigger', function () {
    $(this).closest('.card').debugEnhance('sidebar', 'open')
  })

  $('body').on('mouseleave', '.debug-sidebar', function () {
    $(this).closest('.card').debugEnhance('sidebar', 'close')
  })

  updateCssProperty('wampClientCss', '.debug', 'font-size', 'inherit')
  updateCssProperty('wampClientCss', '#debug-cards', 'font-size', config.get('fontSize'))

  configModal.init(config)

  // note:  navbar may not yet be at final height
  navbarHeight = $('.navbar-collapse').outerHeight()
}

function debounce (fn, ms) {
  // Avoid wrapping in `setTimeout` if ms is 0 anyway
  if (ms === 0) {
    return fn
  }

  var timeout
  return function (arg) {
    clearTimeout(timeout)
    timeout = setTimeout(function () {
      fn(arg)
    }, ms)
  }
}

function onBodyClick (e) {
  if ($(e.target).closest('.debug-sidebar').length === 0) {
    $('.debug-sidebar.show').closest('.card').debugEnhance('sidebar', 'close')
  }
}

function positionSidebar ($card) {
  var $cardBody = $card.find('.card-body')
  var $sidebar = $card.find('.debug-sidebar')
  // var scrollTop = $(window).scrollTop()
  var cardOffset = $card[0].getBoundingClientRect().top
  var isSticky = cardOffset <= navbarHeight
  // for height calculations, we will consider menubar as part of header vs body
  var menubarHeight = $cardBody.find('> .debug-menu-bar').outerHeight()
  var bodyHeight = $cardBody.outerHeight() - menubarHeight
  var bodyOffset = $cardBody[0].getBoundingClientRect().top + menubarHeight
  var headerHeight = bodyOffset - cardOffset + menubarHeight
  // var headerHeight = $card.find('> .card-header').outerHeight() + menubarHeight
  var heightVis = bodyOffset + bodyHeight - headerHeight
  var heightHidden = bodyHeight - heightVis
  var contentHeight = $sidebar.find('.sidebar-content').height()
  // var sidebarTopFixed = navbarHeight + headerHeight
  var sidebarTop = heightHidden + (parseInt($('body').css('paddingTop')) - navbarHeight)

  $sidebar.attr('style', '')
  if (isSticky) {
    if (contentHeight > heightVis && $sidebar.hasClass('show')) {
      sidebarTop -= contentHeight - heightVis + 8
    }
    $sidebar.css({
      // position: 'fixed', // sticky would be nice, but still visible when
                            //  docked off to the left
      // top: topSidebarFixed + 'px', // position: fixed
      top: sidebarTop + 'px' // position absolute
      // height: heightVis + 'px'
    })
  }
}
