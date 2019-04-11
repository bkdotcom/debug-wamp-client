import $ from 'jquery';				// external global
import base64 from "base64-arraybuffer";
import {StrDump} from "./StrDump.js";
import {DumpObject} from "./dumpObject.js";

var strDump = new StrDump();

export var Dump = function() {
	// this.RECURSION = "\x00recursion\x00".parseHex();
	// this.ABSTRACTION = "\x00debug\x00".parseHex();
	// this.UNDEFINED = "\x00undefined\x00".parseHex();
	this.dumpObject = new DumpObject(this);
}

Dump.prototype.RECURSION = "\x00recursion\x00".parseHex();
Dump.prototype.ABSTRACTION = "\x00debug\x00".parseHex();
Dump.prototype.UNDEFINED = "\x00undefined\x00".parseHex();

Dump.prototype.dump = function(val, sanitize, wrap, decodeString) {
	// console.log('dump', JSON.stringify(val));
	var $span = $('<span></span>'),
		bytes,
		date,
		type;
	if (typeof sanitize == "undefined") {
		sanitize = true;
	}
	if (typeof wrap == "undefined") {
		wrap = true;
	}
	type = this.getType(val);
	if (val === null) {
		val = "null";
	} else if (type == "array") {
		val = this.dumpArray(val);
	} else if (type == "bool") {
		val = val ? "true" : "false";
		$span.addClass(val);
	} else if (type == "float" || type == "int") {
		date = checkTimestamp(val);
		if (date) {
			$span.addClass("timestamp").attr("title", date);
		}
	} else if (type == "string") {
		if ($.isNumeric(val)) {
			$span.addClass("numeric");
			date = checkTimestamp(val);
			if (date) {
				$span.addClass("timestamp").attr("title", date);
			}
		} else {
			bytes = val.indexOf("_b64_:") == 0
				? new Uint8Array(base64.decode(val.substr(6)))
				: strDump.encodeUTF16toUTF8(val);
			// console.log('bytes', bytes);
			if (!sanitize) {
				$span.addClass("no-pseudo");
				val = strDump.dump(bytes, false);
			} else {
				val = strDump.dump(bytes, true);
			}
			if (sanitize) {
				val = visualWhiteSpace(val);
			}
		}
	} else if (type == "recursion") {
		val = '<span class="t_keyword">array</span> <span class="t_recursion">*RECURSION*</span>';
		wrap = false;
	} else if (type == "undefined") {
		val = '';
	} else if (type === "object") {	// already checked for null
		// not using data() as we're using outerhtml
		$span.attr("data-accessible", val.scopeClass == val.className
			? 'private'
			: 'public'
		);
		val = this.dumpObject.dumpObject(val);
	} else if (type === "resource") {
		val = val.value;
	} else if (type === "callable") {
		val = '<span class="t_type">callable</span> ' +
				this.markupClassname(val.values[0] + '::' + val.values[1]);
	}
	return wrap
		? $span.addClass("t_"+type).html(val)[0].outerHTML
		: val;
}

Dump.prototype.dumpArray = function(array) {
	var html = '',
		keys = array['__debug_key_order__'] || Object.keys(array),
		length = keys.length,
		key,
		i;
	if (length == 0) {
		html = '<span class="t_keyword">array</span>' +
				'<span class="t_punct">(</span>' + "\n" +
				'<span class="t_punct">)</span>';
	} else {
		delete array['__debug_key_order__'];
		html = '<span class="t_keyword">array</span>' +
			'<span class="t_punct">(</span>' + "\n" +
			'<span class="array-inner">' + "\n";
		for (i = 0; i < length; i++) {
			key = keys[i];
			html += "\t" + '<span class="key-value">' +
					'<span class="t_key' + (/^\d+$/.test(key) ? ' t_int' : '') + '">' + key + '</span> ' +
					'<span class="t_operator">=&gt;</span> ' +
					this.dump(array[key], true) +
				'</span>' + "\n";
		}
		html += '</span>' +
			'<span class="t_punct">)</span>';
	}
	return html;
}

Dump.prototype.getType = function(val) {
	var type;
	if (val === null) {
		return "null";
	}
	if (typeof val == "boolean") {
		return "bool";
	}
	if (typeof val == "string") {
		if (val === this.UNDEFINED) {
			return "undefined";
		}
		if (val === this.RECURSION) {
			return "recursion";
		}
		return "string";
	}
	if (typeof val == "number") {
		if (Number.isInteger(val)) {
			return "int"
		}
		return "float";
	}
	if (typeof val == "object") { // already checked for null
		// console.log('val', val);
		type = "array";
		if (typeof val.debug == "string") {
			if (val.debug === this.ABSTRACTION) {
				type = val.type;
			}
			/*
			else if (val.debug == this.ABSTRACTION) {
				type = val.type;
			}
			*/
		}
		return type;
	}
	if (typeof val == "undefined") {
		return "undefined";
	}
};

Dump.prototype.markupClassname = function(str, tag, attribs) {
    var classname = str,
    	matches = str.match(/^(.+)(::|->)(.+)$/),
        opMethod = '',
        split = [];
    tag = tag || 'span';
    attribs = attribs || {};
    if (matches) {
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

function checkTimestamp(val) {
	var secs = 86400 * 90, // 90 days worth o seconds
		tsNow = Date.now() / 1000;
	val = parseFloat(val, 10);
	if (val > tsNow - secs && val < tsNow + secs) {
		return (new Date(val*1000)).toString();
	}
	return false;
}

/**
 * Add whitespace markup
 *
 * @param string str string which to add whitespace html markup
 *
 * @return string
 */
function visualWhiteSpace(str) {
	// display \r, \n, & \t
	var strBr = '',
		searchReplacePairs = [
			[/\r/g, '<span class="ws_r"></span>'],
			[/\n/g, '<span class="ws_n"></span>'+strBr+"\n"]
		],
		i = 0,
		length = searchReplacePairs.length;
	str = str.replace(/(\r\n|\r|\n)/g, function (match) {
		for (i = 0; i < length; i++) {
			match = match.replace(searchReplacePairs[i][0], searchReplacePairs[i][1]);
		}
		return match;
	})
		.replace(/(<br \/>)?\n$/g, '')
		.replace(/\t/g, '<span class="ws_t">\t</span>');
	return str;
}
