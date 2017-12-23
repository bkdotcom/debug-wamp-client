var logDumper = (function($, module){

    module.dumpObject = function(abs) {
        module.base64DecodeObj(abs);
        // console.info('dumpObject', abs);
        var html = '';
        var title = (abs.phpDoc.summary + "\n\n" + abs.phpDoc.description).trim();
        var strClassName = module.markupClassname(abs.className, "span", {
            title : title.length ? title : null
        })
        // var misc = '';
        var objToString = '';
        var toStringVal = '';
        var toStringLen;
        var toStringValAppend;
        var $toStringDump;
        if (abs.isRecursion) {
            html = strClassName +
                ' <span class="t_recursion">*RECURSION*</span>';

        } else if (abs.isExcluded) {
            html = strClassName +
                ' <span class="excluded">(not inspected)</span>';
        } else {
            if (typeof abs.methods.__toString !== "undefined" && abs.methods.__toString.returnValue) {
                toStringVal = abs.methods.__toString.returnValue;
                toStringLen = toStringVal.length;
                toStringValAppend = '';
                if (toStringLen > 100) {
                    toStringVal = toStringVal.substring(0, 100);
                    toStringValAppend = '&hellip; <i>(' + (toStringLen - 100) + ' more chars)</i>';
                }
                // console.warn('dump(toStringVal)', module.dump(toStringVal));
                $toStringDump = $( module.dump(toStringVal) );
                // console.log('$toStringDump', $toStringDump);
                // var classAndValue = $this->debug->utilities->parseAttribString($toStringDump);
                objToString = '<span class="' + $toStringDump.prop('class') + ' t_toStringValue" title="__toString()">' +
                    $toStringDump.html() +
                    toStringValAppend +
                    '</span> ';
            }
            /*
            $.each(abs.misc, function(k, v) {
                misc += k + ': ' + v + '<br />';
            });
            */
            try {
                html = objToString +
                    strClassName +
                    '<dl class="object-inner">' +
                        (abs.extends.length
                            ? '<dt>extends</dt><dd>' + abs.extends.join('<br />') + '</dd>'
                            : ''
                        ) +
                        (abs.implements.length
                            ? '<dt>implements</dt><dd>' + abs.implements.join('<br />') + '</dd>'
                            : ''
                        ) +
                        /*
                        (misc.length
                            ? '<dt>misc</dt><dd>' + misc +'</dd>'
                            : ''
                        ) +
                        */
                        (true // outputConstants
                            ? dumpObjectConstants(abs.constants)
                            : ''
                        ) +
                        dumpObjectProperties(abs, {'viaDebugInfo': abs.viaDebugInfo}) +
                        (abs.collectMethods // outputMethods
                            ? dumpObjectMethods(abs)
                            : ''
                        ) +
                    '</dl>';
            } catch (e) {
                console.warn('e', e);
            }
        }
        return html;
    }

    module.markupClassname = function(str, tag, attribs) {
        var classname = str;
        var opMethod = '';
        var split = [];
        tag = tag || 'span';
        attribs = attribs || {};
        if (matches = str.match(/^(.+)(::|->)(.+)$/)) {
            classname = matches[1];
            opMethod = '<span class="t_operator">' + matches[2] + '</span>'
                    + '<span class="method-name">' + matches[3] + '</span>';
        }
        split = classname.split('\\');
        if (split.length > 1) {
            classname = split.pop();
            classname = '<span class="namespace">' + split.join('\\') + '\\</span>'
                + classname;
        }
        attribs.class = 't_classname';
        return  $('<'+tag+'/>', attribs).html(classname)[0].outerHTML
            + opMethod;
    }

    module.base64DecodeObj = function(abs) {
        var props = ["className","debug","extends","implements","type"],
            prop,
            i;
        for (i = 0; i < props.length; i++) {
            prop = props[i];
            if (typeof abs[prop] == "string") {
                abs[prop] = atob(abs[prop]);
            } else if (typeof abs[prop] == "object" && abs[prop] !== null) {
                abs[prop] = abs[prop].map(atob);
            }
        }
        /*
        if (abs.extends) {
        }
        abs.implements = abs.implements.map(atob);
        */
        $.each(abs.properties, function(k, info) {
            info.visibility = atob(info.visibility);
            info.type = info.type ? atob(info.type) : null;
            info.desc = info.desc ? atob(info.desc) : null;
        });
        $.each(abs.phpDoc, function(k, str) {
            if (typeof str == "string") {
                abs.phpDoc[k] = atob(str);
            } else if (str === null) {
                abs.phpDoc[k] = "";
            }
        });
        $.each(abs.methods, function(k, info) {
            if (typeof info.visibility == "string") {
                info.visibility = atob(info.visibility);
            }
            if (info.phpDoc) {
                if (typeof info.phpDoc.return != "undefined") {
                    info.phpDoc.return.desc = atob(info.phpDoc.return.desc);
                    info.phpDoc.return.type = atob(info.phpDoc.return.type);
                }
                info.phpDoc.summary = info.phpDoc.summary
                    ? atob(info.phpDoc.summary) : null;
            }
            $.each(info.params, function(i,info) {
                if (typeof info.type == "string") {
                    info.type = atob(info.type);
                }
                if (info.desc) {
                    info.desc = atob(info.desc);
                }
                info.name = atob(info.name);
                if (typeof info.defaultValue == "string" && info.defaultValue.length) {
                    info.defaultValue = atob(info.defaultValue);
                }
            });
        });
    }

    function dumpObjectConstants(constants) {
        var html = Object.keys(constants).length
            ? '<dt class="constants">constants</dt>'
            : '';
        $.each(constants, function(key, value) {
            html += '<dd class="constant">' +
                '<span class="constant-name">' + key + '</span>' +
                ' <span class="t_operator">=</span> ' +
                module.dump(value, true)
                '</dd>';
        })
        return html;
    }

    function dumpObjectProperties(abs, meta) {
        var html = '';
        var properties = abs.properties;
        var label = Object.keys(properties).length
            ? 'properties'
            : 'no properties';
        if (meta.viaDebugInfo) {
            label += ' <span class="text-muted">(via __debugInfo)</span>';
        }
        html = '<dt class="properties">' + label + '</dt>';
        html += magicMethodInfo(abs, ['__get', '__set']);
        $.each(properties, function(k, info) {
            // console.info('property info', info);
            var viaDebugInfo = info.viaDebugInfo;
            var isPrivateAncestor = info['visibility'] == 'private' && info['inheritedFrom'];
            var $dd = $('<dd class="property">' +
                '<span class="t_modifier_'+info.visibility+'">' + info.visibility + '</span>' +
                (info.type
                    ? ' <span class="t_type">' + info.type + '</span>'
                    : ''
                ) +
                ' <span class="property-name"' +
                    (info.desc
                        ? ' title="' + info.desc.escapeHtml() + '"'
                        : ''
                    ) +
                    '>' + k + '</span>' +
                ' <span class="t_operator">=</span> ' +
                module.dump(info.value) +
                '</dd>'
            );
            if (info.visibility != "debug") {
                $dd.addClass(info.visibility);
            }
            if (viaDebugInfo) {
                $dd.addClass("debug-value");
            }
            if (isPrivateAncestor) {
                $dd.addClass("private-ancestor");
            }
            html += $dd[0].outerHTML;
        });
        return html;
    }

    function dumpObjectMethods(abs) {
        var label = Object.keys(abs.methods).length
            ? 'methods'
            : 'no methods';
        var html = '<dt class="methods">' + label + '</dt>';
        html += magicMethodInfo(abs, ['__call', '__callStatic']);
        $.each(abs.methods, function(k, info) {
            // console.info('method info', info);
            var paramStr = dumpMethodParams(info.params);
            var modifiers = [];
            var returnType = '';
            var $dd;
            if (info.isFinal) {
                modifiers.push('<span class="t_modifier_final">final</span>');
            }
            modifiers.push('<span class="t_modifier_'+info.visibility+'">' + info.visibility + '</span>');
            if (info.isStatic) {
                modifiers.push('<span class="t_modifier_static">static</span>');
            }
            if (typeof info.phpDoc.return != "undefined") {
                returnType = ' <span class="t_type"' +
                    (info.phpDoc.return.desc !== null
                        ? ' title="' + info.phpDoc.return.desc.escapeHtml() + '"'
                        : ''
                    ) +
                    '>' + info.phpDoc.return.type + '</span>';
            }
            $dd = $('<dd class="method">' +
                modifiers.join(' ') +
                returnType +
                ' <span class="method-name"' +
                    (info.phpDoc.summary != null
                        ? ' title="' + info.phpDoc.summary.escapeHtml() + '"'
                        : ''
                    ) +
                    '>' + k + '</span>' +
                '<span class="t_punct">(</span>' + paramStr + '<span class="t_punct">)</span>' +
                (k == '__toString'
                    ? '<br /><span class="indent">' + module.dump(info.returnValue, true) + '</span>'
                    : ''
                ) +
                '</dd>'
            );
            $dd.addClass(info.visibility);
            if (info.isDeprecated) {
                $dd.addClass("deprecated");
            }
            html += $dd[0].outerHTML;
        });
        return html;
    }

    function dumpMethodParams(params) {
        var html = '',
            defaultValue;
        $.each(params, function(i,info) {
            html += '<span class="parameter">';
            if (typeof info.type === "string") {
                html += '<span class="t_type">' + info.type + '</span> ';
            }
            html += '<span class="t_parameter-name"' +
                (info.desc !== null
                    ? ' title="' + info.desc.escapeHtml().replace("\n", " ") + '"'
                    : ''
                ) + '>' + info.name.escapeHtml() + '</span>';
            if (info.defaultValue !== logDumper.UNDEFINED) {
                var defaultValue = info.defaultValue;
                if (typeof defaultValue == "string") {
                    defaultValue = defaultValue.replace("\n", " ");
                }
                html += ' <span class="t_operator">=</span> ';
                html += $(module.dump(defaultValue, true, true, false))
                    .addClass('t_parameter-default')[0].outerHTML;
            }
            html += '</span>, '; // end .parameter
        });
        if (html.length) {
            html = html.substr(0, html.length-2);   // remove ', '
        }
        return html;
    }

    function magicMethodInfo(abs, methods) {
        var methodsHave = [],
            method;
        for (i = 0; i < methods.length; i++) {
            method = methods[i];
            if (abs.methods[method]) {
                methodsHave.push('<code>'+method+'</code>');
            }
        }
        if (methodsHave.length < 1) {
            return '';
        }
        methods = methodsHave.join(' and ');
        methods = methodsHave.length == 1
            ? 'a ' + methods + ' method'
            : methods + ' methods';
        return '<dd class="magic info">This object has ' + methods + '</dd>';
    }

    return module;

}(jQuery, logDumper || {}));
