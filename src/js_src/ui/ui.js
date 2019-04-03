import $ from 'jquery';				// external global
import * as configModal from "./configModal.js";
import {updateCssProperty} from "./Css.js";

var classCollapsed = "glyphicon-chevron-down",
    classExpanded = "glyphicon-chevron-up",
    timeoutHandler;

export function init(config) {

    updateCssProperty("wampClientCss", ".debug", "font-size", "inherit");
    updateCssProperty("wampClientCss", "#body", "font-size", config.get("font-size"));

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
        $(this).find(".m_groupSummary, .debug-log").find("> *").not(".enhanced").debugEnhance();
    });

    $("body").on("click", ".btn-remove-session", function(e) {
        $(this).closest(".panel").remove();
    });
}
