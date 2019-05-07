import $ from 'jquery';				// external global
import * as configModal from "./configModal.js";
import {updateCssProperty} from "./Css.js";

var classCollapsed = "glyphicon-chevron-right",
    classExpanded = "glyphicon-chevron-down",
    timeoutHandler,
    navbarHeight = $(".navbar-header").height();


export function init(config) {

    updateCssProperty("wampClientCss", ".debug", "font-size", "inherit");
    updateCssProperty("wampClientCss", "#body", "font-size", config.get("fontSize"));

	configModal.init(config)

    $(".clear").on("click", function() {
        $("#body > .panel").not(".working").remove();
    });

    $("body").on("mouseup", function(e){
        if (timeoutHandler) {
            e.preventDefault();
            clearInterval(timeoutHandler);
            timeoutHandler = null;
        }
    });

    $(".clear").on("mousedown", function(e){
        timeoutHandler = setTimeout(function(){
            // has been long pressed (3 seconds)
            // clear all (incl working)
            $("#body > .panel").remove();
        }, 2000);
    });

    $("body").on("shown.bs.collapse hidden.bs.collapse", ".panel-body", function(e) {
        var $icon = $(this).closest('.panel').find('.panel-heading .'+classCollapsed+', .panel-heading .'+classExpanded);
        $icon.toggleClass(classExpanded+' '+classCollapsed);
        if (e.type == "shown") {
            $(this).find(".m_groupSummary > .group-body, .debug-log").debugEnhance();
        }
    });

    $("body").on("click", ".btn-remove-session", function(e) {
        $(this).closest(".panel").remove();
    });

    /*
    var $sticker = $("#sticker");
    var pos = $sticker.position();
    var stickermax = $(document).outerHeight() - $("#footer").outerHeight() - $sticker.outerHeight() - 40; //40 value is the total of the top and bottom margin
    $(window).on('scroll', function() {
        var windowpos = $(window).scrollTop();
        // $sticker.html("Distance from top:" + pos.top + "<br />Scroll position: " + windowpos);
        if (windowpos >= pos.top && windowpos < stickermax) {
            $sticker.attr("style", ""); //kill absolute positioning
            $sticker.addClass("stick"); //stick it
        } else if (windowpos >= stickermax) {
            $sticker.removeClass(); //un-stick
            $sticker.css({
                position: "absolute",
                top: stickermax + "px"
            }); //set sticker right above the footer
        } else {
            $sticker.removeClass("stick"); //top of page
        }
    });
    */

    $(window).on("scroll", positionSidebar);

    $("body").on("open.debug.sidebar", function(){
        positionSidebar();
    });

    $("body").on("mouseenter", ".sidebar-trigger", function(){
        $(this).closest(".panel").debugEnhance("sidebar", "open");
        $(this).closest(".panel").find(".panel-body").css({
            minHeight: "200px"
        })
    });

    $("body").on("mouseleave", ".debug-sidebar", function(){
        $(this).closest(".panel").debugEnhance("sidebar", "close");
        $(this).closest(".panel").find(".panel-body").attr("style", "");
    });
}

function positionSidebar() {
    var scrollTop = $(window).scrollTop(),
        windowHeight = $(window).height(),
        $sidebar = $(".debug-sidebar.show"),
        $panelBody = $sidebar.closest(".panel-body"),
        panelOffset = $panelBody.length
            ? $panelBody.offset().top
            : 0,
        panelHeight = $panelBody.innerHeight(),
        heightAvail = panelOffset + panelHeight - scrollTop - navbarHeight,
        contentHeight = $sidebar.find(".debug-filters").height();
    // var sidebarTop = $sidebar.offset().top - navbarHeight;
    /*
    console.warn('scrollin', {
        navbarHeight: navbarHeight,
        scrollTop: scrollTop,
        panelHeight: panelHeight,
        panelOffset: panelOffset,
        panelBottomOffset: panelOffset + panelHeight,
        // sidebarTop: sidebarTop
    });
    */
    $sidebar.attr("style", "");
    if ($panelBody.length === 0) {
        return;
    }
    if (panelOffset < scrollTop + navbarHeight) {
        // console.log('top scrolled above view');
        $sidebar.css({
            position: "fixed",
            marginTop: 0,
            top: navbarHeight+"px"
        });
        if (panelOffset + panelHeight < scrollTop + windowHeight) {
            // console.log('bottom is vis');
            if (heightAvail < contentHeight) {
                // console.warn('not enough height');
                $sidebar.css({
                    position: "absolute",
                    top: "unset",
                    bottom: 0,
                    height: (contentHeight + 4) + "px"
                });
            } else {
                // console.warn('enough height');
                $sidebar.css({
                    height: heightAvail+"px"
                });
            }
        }
    }
}

/*
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};
*/
