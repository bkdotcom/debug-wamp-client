import $ from 'jquery';		// external global
import {Table} from "./methodTable.js";
import {Dump} from "./Dump.js";

var connections = {};
var dump = new Dump();
var hasSubs = false;	// substitutions
var table = new Table(dump);
var detectFiles = false;
var foundFiles = [];

export function init(_connections) {
	connections = _connections;
}

export var methods = {
	alert: function (logEntry, info) {
		// console.log('logEntry', logEntry);
		var message = logEntry.args[0],
			level = logEntry.meta.level || logEntry.meta.class,
			dismissible = logEntry.meta.dismissible,
			$node = $('<div class="m_alert"></div>').addClass("alert-"+level)
				.html(message)
				.attr("data-channel", logEntry.meta.channel);	// using attr so can use [data-channel="xxx"] selector
		if (dismissible) {
			$node.prepend('<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
				+'<span aria-hidden="true">&times;</span>'
				+'</button>');
			$node.addClass("alert-dismissible");
		}
		if (logEntry.meta.icon) {
			$node.data("icon", logEntry.meta.icon);
		}
		info.$container.find(".debug-log-summary").before($node);
		$node.debugEnhance();
	},
	clear: function (logEntry, info) {
		var attribs = {
				class: 'm_clear',
				"data-file": logEntry.meta.file,
				"data-line": logEntry.meta.line
			},
			channelFilter = function() {
				return $(this).data('channel') == logEntry.meta.channel;
			},
			flags = logEntry.meta.flags,
			i,
			$container = info.$container,
			$curNodeLog,
			$curTreeSummary,
			$curTreeLog,
			$nestedError,
			$node,
			$remove,
			stackLen = connections[logEntry.meta.requestId].length;
		processSubstitutions(logEntry);
		for (i = stackLen - 1; i >= 0; i--) {
			$node = connections[logEntry.meta.requestId][i];
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
			return $('<li>', attribs).html(logEntry.args[0]);
		}
	},
	endOutput: function (logEntry, info) {
		var $container = info.$container,
			i,
			arg,
			responseCode = logEntry.meta.responseCode;
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
		setTimeout(function(){
			// There's no hurry... keep around.. as more entrys may follow php's onShutdown
			delete connections[logEntry.meta.requestId];
		}, 1000 * 30);
	},
	errorNotConsoled: function (logEntry, info) {
		var $container = info.$container,
			$node = $container.find('.alert.error-summary');
		if (!$node.length) {
			$node = $('<div class="alert alert-error error-summary">' +
				'<h3><i class="fa fa-lg fa-times-circle"></i> Error(s)</h3>' +
				'<ul class="list-unstyled">' +
				'</ul>' +
				'</div>');
			$container.find(".debug-body").prepend($node);
		}
		$node = $node.find('ul');
		$node.append($("<li></li>").text(logEntry.args[0]));
		if (logEntry.meta.class == "error") {
			$container
                .addClass("panel-danger")
			    .removeClass('panel-warning'); // could keep it.. but lets remove ambiguity
		} else if (!$container.hasClass("panel-danger")) {
			$container.addClass("panel-warning");
		}
		$container.removeClass('panel-default');
	},
	group: function (logEntry, info) {
		var $group = $("<li>", {
				"class": "m_group empty"
			}),
			$groupHeader = groupHeader(logEntry),
			$groupBody = $("<ul>", {
				"class": "group-body",
			});
		if (logEntry.meta.hideIfEmpty) {
			$group.addClass('hide-if-empty');
		}
		if (logEntry.meta.level) {
			$groupHeader.addClass("level-"+logEntry.meta.level);
			$groupBody.addClass("level-"+logEntry.meta.level);
		}
		$group
			.append($groupHeader)
			.append($groupBody);
		// info.$currentNode.append( $group );
		connections[logEntry.meta.requestId].push($groupBody);
		if ($group.is(":visible")) {
			$group.debugEnhance();
		}
		return $group;
	},
	groupCollapsed: function (logEntry, info) {
		return this.group(logEntry, info);
	},
	groupSummary: function (logEntry, info) {
		// see if priority already exists
		var priority = typeof logEntry.meta.priority !== "undefined"
				? logEntry.meta.priority // v2.1
				: logEntry.args[0],
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
		$node = $node.find("> ul");
		connections[logEntry.meta.requestId].push($node);
	},
	groupEnd: function (logEntry, info) {
		var isSummaryRoot = connections[logEntry.meta.requestId].length > 1
				&& info.$currentNode.hasClass("m_groupSummary"),
			$group,
			$toggle;
		connections[logEntry.meta.requestId].pop();
		if (!isSummaryRoot) {
			$toggle = info.$currentNode.prev();
			$group = $toggle.parent();
			if ($group.hasClass("empty") && $group.hasClass("hide-if-empty")) {
				// console.log('remove', $group);
				// $toggle.remove();
				// info.$currentNode.remove();
				$group.remove();
			} else if (!$group.is(":visible")) {
				// console.log('not vis');
				return;
			} else {
				// console.log('enhance');
				$group.debugEnhance();
			}
		}
	},
	groupUncollapse: function (logEntry, info) {
		var $toggleNodes = info.$currentNode.parentsUntil(".debug-log-summary, .debug-log").add(info.$currentNode).prev();
		$toggleNodes.removeClass("collapsed").addClass("expanded");
	},
	meta: function (logEntry, info) {
		/*
			The initial message/method
		*/
		var i, arg,
			$title = info.$container.find(".panel-heading .panel-heading-body .panel-title").html(''),
			metaVals = logEntry.args[0],
			meta = logEntry.meta;
		info.$container.data("channelRoot", meta.channelRoot);
		info.$container.data("options", {
			drawer: meta.drawer
		});
		// info.$container.find(".panel-heading .panel-heading-body .pull-right").remove();
		if (meta.interface) {
			info.$container.find(".panel-heading").attr("data-interface", meta.interface);
		}
		if (metaVals.HTTPS === "on") {
			$title.append('<i class="fa fa-lock fa-lg"></i> ');
		}
		if (metaVals.REQUEST_METHOD) {
			$title.append(metaVals.REQUEST_METHOD + ' ');
		}
		if (metaVals.HTTP_HOST) {
			$title.append('<span class="http-host">' + metaVals.HTTP_HOST + '</span>');
		}
		if (metaVals.REQUEST_URI) {
			$title.append('<span class="request-uri">' + metaVals.REQUEST_URI + '</span>');
		}
		if (metaVals.REQUEST_TIME) {
			var date = (new Date(metaVals.REQUEST_TIME * 1000)).toString().replace(/[A-Z]{3}-\d+/, '');
			info.$container
				.find(".panel-heading .panel-heading-body")
				.prepend('<span class="pull-right">'+date+'</span>');
		}
	},
	profileEnd: function (logEntry, info) {
		var $node = this.table(logEntry, info);
		return $node.removeClass("m_log").addClass("m_profileEnd");
	},
	table: function (logEntry, info) {
		var $table;
		// console.warn('table', logEntry.meta.caption, logEntry);
		if (typeof logEntry.args[0] == "object" && logEntry.args[0] !== null && Object.keys(logEntry.args[0]).length) {
			$table = table.build(logEntry.args[0], logEntry.meta, "table-bordered");
			if (logEntry.meta.sortable) {
				$table.addClass("sortable");
			}
			return $('<li>', {class:"m_"+logEntry.method}).append($table);
		} else {
			if (logEntry.meta.caption) {
				logEntry.args.unshift(logEntry.meta.caption);
			}
			return methods.default({
				method: "log",
				args: logEntry.args,
				meta: logEntry.meta
			}, info);
		}
	},
	trace: function (logEntry, info) {
		var $table;
		logEntry.meta = $.extend({
			caption: "trace",
			columns: ["file", "line", "function"]
		}, logEntry.meta);
		$table = table.build(
			logEntry.args[0],
			logEntry.meta,
			"table-bordered",
			logEntry.meta.inclContext
				? tableAddContextRow
				: null
		);
		if (logEntry.meta.inclContext) {
			$table.addClass("trace-context");
		}
		if (logEntry.meta.sortable) {
			$table.addClass("sortable");
		}
		return $('<li class="m_trace"></li>').append($table);
	},
	default: function (logEntry, info) {
		var arg,
			attribs = {
				"class" : "m_" + logEntry.method,
			},
			$container = info.$container,
			i,
			$node,
			method = logEntry.method,
			// args = logEntry.args,
			meta = logEntry.meta;
			// numArgs = args.length;
		hasSubs = false;
        if (meta.file && meta.channel !== "phpError") {
            attribs = $.extend({
                "data-file": meta.file,
                "data-line": meta.line,
            }, attribs);
        }
		/*
			update panel header to empasize error
		*/
		if (meta.errorCat) {
			// console.warn('errorCat', meta.errorCat);
			attribs.class += ' error-' + meta.errorCat;
			if (!meta.isSuppressed) {
				if (method == "error") {
					// if suppressed, don't update panel
					// console.log('panel-danger');
					$container
						.addClass("panel-danger")
						.removeClass('panel-warning'); // could keep it.. but lets remove ambiguity
				} else if (!$container.hasClass("panel-danger")) {
					// console.log('panel warning');
					$container.addClass("panel-warning");
				}
				$container.removeClass('panel-default');
			}
		}
		if (['assert','error','info','log','warn'].indexOf(method) > -1 && logEntry.args.length > 1) {
			processSubstitutions(logEntry);
		}
		$node = buildEntryNode(logEntry);
		$node.attr(attribs);
		if (method == "error" && meta.backtrace && meta.backtrace.length > 1) {
			// console.warn("have backtrace");
			$node.append(
				$('<ul>', { "class": "list-unstyled" }).append(
					methods.trace({
						args: [ meta.backtrace ],
						meta: {
							inclContext: true,
						}
					}).attr("data-detect-files", "true")
				)
			);
			$node.find(".m_trace").debugEnhance();
			if ($node.is(".error-fatal")) {
				this.endOutput(logEntry, info);
			}
		}
		return $node;
	}
};

function tableAddContextRow($tr, row, i) {
	var keys = Object.keys(row.context),	// .map(function(val){return parseInt(val)}),
		start = Math.min.apply(null, keys);
	if (!row.context) {
		return
	}
	$tr.attr("data-toggle", "next");
	if (i == 0) {
		$tr.addClass("expanded");
	}
	return [
		$tr,
		$("<tr>", {
			"class" : "context",
			"style" : i == 0
				? "display:table-row;"
				: null
		}).append(
			$('<td>', {
				colspan: 4
			}).append(
				[
					$("<pre>", {
						"class": "line-numbers prism",
						"data-line": row.line,
						"data-start": start
					}).append(
						$("<code>", {
							"class": "language-php"
						}).append(Object.values(row.context).join(""))
					),
					row.args.length
						? '<hr />Arguments = ' + dump.dump(row.args	)
						: ''
				]
			)
		)
	];
}

function buildEntryNode(logEntry) {
	var i,
		glue = ', ',
		glueAfterFirst = true,
		args = logEntry.args,
		numArgs = args.length,
		meta = $.extend({
			sanitize: true,
			sanitizeFirst: null,
		}, logEntry.meta);
	if (meta.sanitizeFirst === null) {
		meta.sanitizeFirst = meta.sanitize;
	}
	if (typeof args[0] == "string") {
		if (args[0].match(/[=:]\s*$/)) {
			// first arg ends with "=" or ":"
			glueAfterFirst = false;
			args[0] = $.trim(args[0]) + " ";
		} else if (numArgs == 2) {
			glue = ' = ';
		}
	}
	for (i = 0; i < numArgs; i++) {
		args[i] = dump.dump(args[i], {
            sanitize : i === 0
                ? meta.sanitizeFirst
                : meta.sanitize,
            addQuotes : i !== 0,
            visualWhiteSpace : i !== 0
        });
	}
	if (!glueAfterFirst) {
		return $("<li>").html(args[0] + " " + args.slice(1).join(glue));
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
function groupHeader(logEntry) {
	var i = 0,
		$header,
		argStr = '',
		argsAsParams = typeof logEntry.meta.argsAsParams != "undefined"
			? logEntry.meta.argsAsParams
			: true,
		collapsedClass = logEntry.method == 'groupCollapsed'
			? 'collapsed'
			: 'expanded',
		label = logEntry.args.shift();
	for (i = 0; i < logEntry.args.length; i++) {
		logEntry.args[i] = dump.dump(logEntry.args[i]);
	}
	argStr = logEntry.args.join(', ');
	if (argsAsParams) {
		if (logEntry.meta.isFuncName) {
			label = dump.markupIdentifier(label);
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
	if (typeof logEntry.meta.boldLabel === "undefined" || logEntry.meta.boldLabel) {
		$header.find(".group-label").addClass("group-label-bold");
	}
	return $header;
}

/**
 * @param logEntry
 *
 * @return void
 */
function processSubstitutions(logEntry, opts) {
	var subRegex = '%' +
			'(?:' +
			'[coO]|' +			// c: css, o: obj with max info, O: obj w generic info
			'[+-]?' +			// sign specifier
			'(?:[ 0]|\'.)?' +	// padding specifier
			'-?' +				// alignment specifier
			'\\d*' +			// width specifier
			'(?:\\.\\d+)?' +	// precision specifier
			'[difs]' +
			')',
		args = logEntry.args,
		argLen = args.length,
		hasSubs = false,
		index = 0,
		typeCounts = {
			c: 0
		};
	if (typeof args[0] != "string" || argLen < 2) {
		return;
	}
	subRegex = new RegExp(subRegex, 'g');
	args[0] = args[0].replace(subRegex, function (match) {
		var replacement = match,
			type = match.substr(-1);
		index++;
		if (index > argLen - 1) {
			return replacement;
		}
		if ("di".indexOf(type) > -1) {
			replacement = parseInt(args[index], 10);
		} else if (type == "f") {
			replacement = parseFloat(args[index], 10);
		} else if (type == "s") {
			replacement = substitutionAsString(args[index], opts);
		} else if (type === 'c') {
			replacement = '';
			if (typeCounts.c) {
				// close prev
				replacement = '</span>';
			}
			replacement += '<span style="'+args[index].escapeHtml()+'">';
		} else if ("oO".indexOf(type) > -1) {
			replacement = dump.dump(args[index]);
		}
		typeCounts[type] = typeCounts[type]
			? typeCounts[type] + 1
			: 1;
		delete args[index]; // sets to undefined
		return replacement;
	});
	// using reduce to perform an array_sum
	hasSubs = Object.values(typeCounts).reduce(function(acc, val) { return acc + val; }, 0) > 0;
	if (hasSubs) {
		if (typeCounts.c) {
			args[0] += '</span>';
		}
		logEntry.args = args.filter(function(val){
			return val !== undefined;
		});
		logEntry.meta.sanitizeFirst = false;
	}
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
		val = dump.markupIdentifier(val.className);
	} else {
		val = dump.dump(val);
	}
	return val;
}
