import $ from 'jquery';		// external global
import {Table} from "./methodTable.js";
import {Dump} from "./Dump.js";

var connections = {};
var dump = new Dump();
var hasSubs = false;	// substitutions
var table = new Table(dump);

export function init(_connections) {
	connections = _connections;
}

export var methods = {
	alert: function (method, args, meta, info) {
		var message = args[0],
			className = meta.class,
			dismissible = args.message
				? args.dismissible
				: meta.dismissible,
			$node = $('<div class="m_alert"></div>').addClass("alert-"+className)
				.html(message)
				.attr("data-channel", meta.channel);	// using attr so can use [data-channel="xxx"] selector
		if (dismissible) {
			$node.prepend('<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
				+'<span aria-hidden="true">&times;</span>'
				+'</button>');
			$node.addClass("alert-dismissible");
		}
		if (meta.icon) {
			$node.data("icon", meta.icon);
		}
		info.$container.find(".debug-log-summary").before($node);
		$node.debugEnhance();
	},
	clear: function (method, args, meta, info) {
		var attribs = {
				class: 'm_clear',
				title: meta.file + ': line ' + meta.line
			},
			channelFilter = function() {
				return $(this).data('channel') == meta.channel;
			},
			flags = meta.flags,
			i,
			$container = info.$container,
			$curNodeLog,
			$curTreeSummary,
			$curTreeLog,
			$nestedError,
			$node,
			$remove,
			stackLen = connections[meta.requestId].length;
		args = processSubstitutions(args)
		for (i = stackLen - 1; i >= 0; i--) {
			$node = connections[meta.requestId][i];
			if ($node.closest(".debug-log-summary").length && !$curTreeSummary) {
				$curTreeSummary = $node.parentsUntil(".debug-log-summary")
					.addBack()
					.prev(".group-header")
					.addBack();
			} else if ($node.closest(".debug-log").length && !$curTreeLog) {
				$curNodeLog = $node;
				$curTreeLog = $node.parentsUntil(".debug-log")
					.addBack()
					.prev(".group-header")
					.addBack();
			}
		}
		if (flags.alerts) {
			$container.find('.alert').filter(channelFilter).remove();
		}
		if (flags.summary) {
			$container.find(".debug-log-summary > .m_groupSummary").each(function(){
				$remove = $(this)
					.find('*')
					.not($curTreeSummary)
					.filter(channelFilter);
				if (!flags.summaryErrors) {
					$remove = $remove.not(".m_error, .m_warn");
				}
				$remove.filter(".group-header").not(".enhanced").debugEnhance("expand");
				$remove.remove();
			});
		} else if (flags.summaryErrors) {
			$container.find(".debug-log-summary .m_error, .debug-log-summary .m_warn").filter(channelFilter).remove();
		}
		if (flags.log) {
			$remove = $container
				.find('.debug-log > *, .debug-log .m_group > *')
				.not($curTreeLog)
				.filter(channelFilter);
			if (!flags.logErrors) {
				$remove = $remove.not(".m_error, .m_warn");
			}
			$remove.filter(".group-header").not(".enhanced").debugEnhance("expand");
			$remove.remove();
		} else if (flags.logErrors) {
			$container.find(".debug-log .m_error, .debug-log .m_warn").filter(channelFilter).remove();
		}
		if (!flags.silent) {
			if (info.$currentNode.closest(".debug-log-summary").length) {
				// we're in summary.. let's switch to content
				info.$currentNode = $container.find(".debug-log");
			}
			info.$currentNode = $curNodeLog;
			return $('<li>', attribs).html(args[0]);
		}
	},
	endOutput: function (method, args, meta, info) {
		var $container = info.$container,
			i,
			arg,
			responseCode = meta.responseCode || args.responseCode;
		$container.removeClass("working");
		$container.find(".panel-heading .fa-spinner").remove();
		$container.find(".panel-body > .fa-spinner").remove();
		if (responseCode && responseCode != "200") {
			$container.find(".panel-title").append(' <span class="label label-default" title="Response Code">' + responseCode + '</span>');
			if (responseCode.toString().match(/^5/)) {
				$container.addClass("panel-danger");
			}
		}
		$container.data('lastNode', info.$currentNode);
		delete connections[meta.requestId];
	},
	errorNotConsoled: function (method, args, meta, info) {
		var $container = info.$container,
			$node = $container.find('.alert.error-summary');
		if (!$node.length) {
			$node = $('<div class="alert alert-danger error-summary">' +
				'<h3><i class="fa fa-lg fa-times-circle"></i> Error(s)</h3>' +
				'<ul class="list-unstyled indent">' +
				'</ul>' +
				'</div>');
			$container.find(".panel-body").prepend($node);
		}
		$node = $node.find('ul');
		$node.append($("<li></li>").text(args[0]));
		if (meta.class == "danger") {
			// console.log('panel-danger');
			$container.addClass("panel-danger");
			$container.removeClass('panel-warning'); // could keep it.. but lets remove ambiguity
		} else if (!$container.hasClass("panel-danger")) {
			// console.log('panel warning');
			$container.addClass("panel-warning");
		}
		$container.removeClass('panel-default');
	},
	group: function (method, args, meta, info) {
		var $group = $("<li>", {
				"class": "m_group",
				"data-channel": meta.channel
			}),
			$groupHeader = groupHeader(method, args, meta),
			$groupBody = $("<ul>", {
				"class": "group-body",
			});
		if (meta.hideIfEmpty) {
			$group.addClass('hide-if-empty');
		}
		if (meta.icon) {
			$group.attr('data-icon', meta.icon);
		}
		if (meta.level) {
			$groupHeader.addClass("level-"+meta.level);
			$groupBody.addClass("level-"+meta.level);
		}
		$group
			.append($groupHeader)
			.append($groupBody);
		info.$currentNode.append( $group );
		connections[meta.requestId].push($groupBody)
		if ($group.is(":visible")) {
			$group.debugEnhance();
		}
	},
	groupCollapsed: function (method, args, meta, info) {
		return this.group(method, args, meta, info);
	},
	groupSummary: function (method, args, meta, info) {
		// see if priority already exists
		var priority = typeof meta.priority !== "undefined"
				? meta.priority // v2.1
				: args[0],
			$node;
		info.$container.find(".debug-log-summary .m_groupSummary").each(function(){
			var priorityCur = $(this).data("priority");
			if (priorityCur == priority) {
				$node = $(this);
				return false; // break
			} else if (priority > priorityCur) {
				$node = $("<li>")
					.addClass("m_groupSummary")
					.data("priority", priority)
					.html('<ul class="group-body"></ul>');
				$(this).before($node);
				return false; // break
			}
		});
		if (!$node) {
			$node = $("<li>")
				.addClass("m_groupSummary")
				.data("priority", priority)
				.html('<ul class="group-body"></ul>');
			info.$container
				.find(".debug-log-summary")
				.append( $node );
		}
		$node = $node.find("> ul")
		connections[meta.requestId].push($node);
	},
	groupEnd: function (method, args, meta, info) {
		var isSummaryRoot = connections[meta.requestId].length > 1
				&& info.$currentNode.hasClass("m_groupSummary"),
			$group,
			$toggle;
		connections[meta.requestId].pop();
		if (!isSummaryRoot) {
			$toggle = info.$currentNode.prev();
			$group = $toggle.parent().debugEnhance();
			if ($group.hasClass("empty") && $group.hasClass("hide-if-empty")) {
				// $toggle.remove();
				// info.$currentNode.remove();
				$group.remove();
			}
		}
	},
	groupUncollapse: function (method, args, meta, info) {
		var $toggleNodes = info.$currentNode.parentsUntil(".debug-log-summary, .debug-log").add(info.$currentNode).prev();
		$toggleNodes.removeClass("collapsed").addClass("expanded");
	},
	meta: function (method, args, meta, info) {
		/*
			The initial message/method
		*/
		var i, arg,
			$title = info.$container.find(".panel-heading .panel-heading-body .panel-title").html(''),
			meta = args[0] || args,
			opts = args[1] || {};
		info.$container.data("channelRoot", opts.channelRoot);
		info.$container.data("options", {
			drawer: opts.drawer
		});
		info.$container.find(".panel-heading .panel-heading-body .pull-right").remove();
		if (meta.HTTPS === "on") {
			$title.append('<i class="fa fa-lock fa-lg"></i> ');
		}
		if (meta.REQUEST_METHOD) {
			$title.append(meta.REQUEST_METHOD + ' ');
		}
		if (meta.HTTP_HOST) {
			$title.append('<span class="http-host">' + meta.HTTP_HOST + '</span>');
		}
		if (meta.REQUEST_URI) {
			$title.append('<span class="request-uri">' + meta.REQUEST_URI + '</span>');
		}
		if (meta.REQUEST_TIME) {
			var date = (new Date(meta.REQUEST_TIME * 1000)).toString().replace(/[A-Z]{3}-\d+/, '');
			info.$container
				.find(".panel-heading .panel-heading-body")
				.prepend('<span class="pull-right">'+date+'</span>');
		}
	},
	profileEnd: function (method, args, meta, info) {
		var $node = this.table(method, args, meta, info);
		return $node.removeClass("m_log").addClass("m_profileEnd");
	},
	table: function (method, args, meta, info) {
		var $table;
		if (typeof args[0] == "object" && args[0] !== null && Object.keys(args[0]).length) {
			$table = table.build(args[0], meta, "table-bordered");
			if (meta.sortable) {
				$table.addClass("sortable");
			}
			return $('<li>', {class:"m_"+method}).append($table);
		} else {
			if (meta["caption"]) {
				args.unshift(meta["caption"]);
			}
			return methods.default("log", args, meta, info);
		}
	},
	trace: function (method, args, meta, info) {
		var $table = table.build(args[0], meta, "table-bordered");
		if (meta.sortable) {
			$table.addClass("sortable");
		}
		return $('<li class="m_trace"></li>').append($table);
	},
	default: function (method, args, meta, info) {
		var arg,
			attribs = {
				"class" : "m_" + method,
				"title" : null
			},
			$container = info.$container,
			i,
			$node,
			numArgs = args.length;
		hasSubs = false;
		if (["error","warn"].indexOf(method) > -1) {
			// console.log('meta', meta);
			if (meta.file) {
				attribs.title = meta.file + ': line ' + meta.line;
			}
			/*
				update panel header to empasize error
			*/
			if (meta.errorCat) {
				// console.warn('errorCat', meta.errorCat);
				attribs.class += ' error-' + meta.errorCat;
				if (method == "error") {
					// console.log('panel-danger');
					$container.addClass("panel-danger");
					$container.removeClass('panel-warning'); // could keep it.. but lets remove ambiguity
				} else if (!$container.hasClass("panel-danger")) {
					// console.log('panel warning');
					$container.addClass("panel-warning");
				}
				$container.removeClass('panel-default');
			}
		}
		if (['assert','error','info','log','warn'].indexOf(method) > -1 && numArgs > 1) {
			args = processSubstitutions(args);
		}
		$node = buildEntryNode(args, meta.sanitize);
		$node.attr(attribs);
		if (method == "error" && meta.backtrace && meta.backtrace.length > 1) {
			// console.warn("have backtrace");
			$node.append(
				table.build(
					meta.backtrace,
					{
						caption: "trace",
						columns: ["file","line","function"]
					},
					"trace table-bordered"
				)
			);
		}
		return $node;
	}
};

function buildEntryNode(args, sanitize) {
	var glue = ', ',
		glueAfterFirst = true,
		firstArgIsString = typeof args[0] == "string",
		i,
		arg,
		numArgs = args.length;
	if (sanitize === undefined) {
		sanitize = true;
	}
	for (i = 0; i < numArgs; i++) {
		arg = args[i];
		args[i] = i > 0
			? dump.dump(arg, sanitize)
			: dump.dump(arg, false);
	}
	if (firstArgIsString) {
		if (args[0].match(/[=:] ?$/)) {
			// first arg ends with "=" or ":"
			glueAfterFirst = false;
		} else if (numArgs == 2) {
			glue = ' = ';
		}
	}
	if (!glueAfterFirst) {
		return $("<li>").html(args[0] + args.slice(1).join(glue));
	} else {
		return $("<li>").html(args.join(glue));
	}
}

/**
 * Generates groupHeader HTML
 *
 * @param string method debug method
 * @param list   args   method's arguments
 * @param object meta   meta values
 *
 * @return jQuery obj
 */
function groupHeader(method, args, meta) {
	var i = 0,
		$header,
		argStr = '',
		argsAsParams = typeof meta.argsAsParams != "undefined"
			? meta.argsAsParams
			: true,
		collapsedClass = method == 'groupCollapsed'
			? 'collapsed'
			: 'expanded',
		label = args.shift();
	for (i = 0; i < args.length; i++) {
		args[i] = dump.dump(args[i]);
	}
	argStr = args.join(', ');
	if (argsAsParams) {
		if (meta.isMethodName) {
			label = dump.markupClassname(label);
		}
		argStr = '<span class="group-label">' + label + '(</span>' +
			argStr +
			'<span class="group-label">)</span>';
		argStr = argStr.replace('(</span><span class="group-label">)', '');
	} else {
		argStr = '<span class="group-label">'+label+':</span> ' +
			argStr;
		argStr = argStr.replace(/:<\/span> $/, "</span>");
	}
	$header = $('<div class="group-header ' + collapsedClass + '">' +
		argStr +
		'</div>');
	return $header;
}

function processSubstitutions(args) {
	var subRegex = '%' +
		'(?:' +
		'[coO]|' +			// c: css, o: obj with max info, O: obj w generic info
		'[+-]?' +			// sign specifier
		'(?:[ 0]|\'.)?' +	// padding specifier
		'-?' +				// alignment specifier
		'\\d*' +			// width specifier
		'(?:\\.\\d+)?' +	// precision specifier
		'[difs]' +
		')';
	var i;
	var index = 0;
	var indexes = {
		c: []
		// o: []
	};
	var segments = [];
	var segment = '';
	var argsNew = [];
	if (typeof args[0] != "string" || args.length < 2) {
		return args;
	}
	subRegex = new RegExp(subRegex, 'g');
	var arg0 = args[0].replace(subRegex, function (match) {
		var replacement = match;
		var type = match.substr(-1);
		hasSubs = true;
		index++;
		if ("di".indexOf(type) > -1) {
			replacement = parseInt(args[index], 10);
		} else if (type == "f") {
			replacement = parseFloat(args[index], 10);
		} else if (type == "s") {
			replacement = substitutionAsString(args[index]);
		} else if (type === 'c') {
			replacement = '';
			if (indexes['c'].length) {
				// close prev
				replacement = '</span>';
			}
			replacement += '<span style="'+args[index].escapeHtml()+'">';
			indexes['c'].push(index);
		} else if ("oO".indexOf(type) > -1) {
			replacement = dump.dump(args[index]);
		}
		// console.log('replacement', replacement);
		return replacement;
	});
	if (indexes['c'].length) {
		arg0 += '</span>';
	}
	if (hasSubs) {
		args = [ arg0 ];
	}
	return args;
}

/**
 * Cooerce value to string
 *
 * @param mixed $val value
 *
 * @return string
 */
function substitutionAsString(val) {
	var type = dump.getType(val);
	if (type == 'string') {
		val = dump.dump(val, true, false);
	} else if (type == 'array') {
		delete val['__debug_key_order__'];
		val = '<span class="t_keyword">array</span>' +
			'<span class="t_punct">(</span>' + Object.keys(val).length + '<span class="t_punct">)</span>';
	} else if (type == 'object') {
		val = dump.markupClassname(val['className']);
	} else {
		val = dump.dump(val);
	}
	return val;
}
