import $ from 'jquery'; // external global
import {updateCssProperty} from "./Css.js";

export function init(config) {
    $("#wsUrl").val(config.get("url"));
    $("#realm").val(config.get("realm"));
    $("#font-size").val(config.get("fontSize"));
    $("#link-files").prop("checked", config.get("linkFiles"));
    $("#link-files-template").val(config.get("linkFilesTemplate"));
    /*
    $('#modal-settings').on("show.bs.modal", function (e) {
    });
    */
    $("#font-size").on("change", function(){
        updateCssProperty("wampClientCss", "#body", "font-size", $("#font-size").val());
    });
    $("#link-files").on("change", function(){
        var isChecked = $(this).prop("checked"),
            $templateGroup = $("#link-files-template").closest(".form-group");
        isChecked
            ? $templateGroup.slideDown()
            : $templateGroup.slideUp();
    }).trigger("change");
    $('#modal-settings').on("submit", function(e) {
        e.preventDefault();
        // var configWas = config.get(),
            // configNew = {};
        if ($("#wsUrl").val() != config.get("url") || $("#realm").val() != config.get("realm")) {
            // connection options changed
            config.set("url", $("#wsUrl").val());
            config.set("realm", $("#realm").val());
            PubSub.publish('onmessage', 'connectionClose');
            PUbSub.publish('onmessage', 'connectionOpen');
        }
        config.set({
            fontSize: $("#font-size").val(),
            linkFiles: $("#link-files").prop("checked"),
            linkFilesTemplate: $("#link-files-template").val()
        });
        // var configNew = config.get();
        $(this).modal("hide");
        /*
        console.log('configWas', configWas);
        console.log('configNew', configNew);
        if (configNew.linkFiles != configWas.linkFiles || configNew.linkFilesTemplate != configWas.linkFilesTemplate) {
            console.warn('linkFiles changed');
        }
        */
    });
    $('#modal-settings').on("hide.bs.modal", function (e) {
        updateCssProperty("wampClientCss", "#body", "font-size", config.get("fontSize"));
    });
}
