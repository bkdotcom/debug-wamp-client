import $ from 'jquery'; // external global
import {updateCssProperty} from "./Css.js";

export function init(config) {
    $('#modal-settings').on("show.bs.modal", function (e) {
        $("#wsUrl").val(config.get("url"));
        $("#realm").val(config.get("realm"));
        $("#font-size").val(config.get("font-size"));
    });
    $("#font-size").on("change", function(){
        updateCssProperty("wampClientCss", "#body", "font-size", $("#font-size").val());
    });
    $('#modal-settings').on("submit", function(e) {
        e.preventDefault();
        if ($("#wsUrl").val() != config.get("url") || $("#realm").val() != config.get("realm")) {
            // connection options changed
            config.set("url", $("#wsUrl").val());
            config.set("realm", $("#realm").val());
            PUbSub.publish('onmessage', 'connectionClose');
            PUbSub.publish('onmessage', 'connectionOpen');
        }
        config.set("font-size", $("#font-size").val());
        $(this).modal("hide");
    });
    $('#modal-settings').on("hide.bs.modal", function (e) {
        updateCssProperty("wampClientCss", "#body", "font-size", config.get("font-size"));
    });
}
