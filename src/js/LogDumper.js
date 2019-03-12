var logDumper = (function($, module) {

	var RECURSION = "\x00recursion\x00".parseHex();
	var ABSTRACTION = "\x00debug\x00".parseHex()
	var UNDEFINED = "\x00undefined\x00".parseHex();
	var strDump = new StrDump();
	var hasSubs = false;

	var connections = {
		/*
		requestId : [ $node, ... ]
		*/
	};

	var methods = {
		alert: function (method, args, meta, info) {
			var message = args[0];
			var className = meta.class;
			var dismissible = args.message
				? args.dismissible
				: meta.dismissible;
			var $node = $('<div class="alert"></div>').addClass("alert-"+className)
				.html(message)
				.attr("data-channel", meta.channel);	// using attr so can use [data-channel="xxx"] selector
			if (dismissible) {
				$node.prepend('<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
					+'<span aria-hidden="true">&times;</span>'
					+'</button>');
				$node.addClass("alert-dismissible");
			}
			info.$container.find(".debug-log-summary").before($node);
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
			var $groupHeader = groupHeader(method, args, meta);
			var $node = $("<div>").addClass("m_group");
			if (meta.level) {
				$groupHeader.addClass("level-"+meta.level);
				$node.addClass("level-"+meta.level);
			}
			info.$currentNode.append( $groupHeader );
			info.$currentNode.append( $node );
			connections[meta.requestId].push($node)
			if ($groupHeader.is(":visible")) {
				$groupHeader.debugEnhance();
			}
		},
		groupSummary: function (method, args, meta, info) {
			// see if priority already exists
			var priority = typeof meta.priority !== "undefined"
				? meta.priority // v2.1
				: args[0];
			var $node;
			info.$container.find(".debug-log-summary .m_groupSummary").each(function(){
				var priorityCur = $(this).data("priority");
				if (priorityCur == priority) {
					$node = $(this);
					return false; // break
				} else if (priorityCur < priority) {
					$node = $("<div>").addClass("m_groupSummary").data("priority", priority);
					$(this).before($node);
					return false; // break
				}
			});
			if (!$node) {
				$node = $("<div>").addClass("m_groupSummary").data("priority", priority);
				info.$container
					.find(".debug-log-summary")
					.append( $node );
			}
			connections[meta.requestId].push($node);
		},
		groupEnd: function (method, args, meta, info) {
			var $toggle;
			var isSummaryRoot = connections[meta.requestId].length > 1
					&& info.$currentNode.hasClass("m_groupSummary");
			connections[meta.requestId].pop();
			if (!isSummaryRoot) {
				$toggle = info.$currentNode.prev();
				$toggle.debugEnhance();
				if ($toggle.hasClass("empty") && $toggle.hasClass("hide-if-empty")) {
					$toggle.remove();
					info.$currentNode.remove();
				}
			}
		},
		groupUncollapse: function (method, args, meta, info) {
			var $toggleNodes = info.$currentNode.parentsUntil(".debug-log-summary, .debug-log").add(info.$currentNode).prev();
			$toggleNodes.removeClass("collapsed").addClass("expanded");
		},
		meta: function (method, args, meta, info) {
			var i, arg,
				$title = info.$container.find(".panel-heading .panel-heading-body .panel-title").html('')
				meta = args[0] || args;
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
			var $table = module.methodTable(args[0], meta, "table-bordered");
			if (meta.sortable) {
				$table.addClass("sortable");
			}
			return $('<div class="m_profileEnd"></div>').append($table);
		},
		table: function (method, args, meta, info) {
			var $table;
			if (typeof args[0] == "object" && args[0] !== null && Object.keys(args[0]).length) {
				$table = module.methodTable(args[0], meta, "table-bordered");
				if (meta.sortable) {
					$table.addClass("sortable");
				}
				return $('<div class="m_table"></div>').append($table);
			} else {
				if (meta["caption"]) {
					args.unshift(meta["caption"]);
				}
				return methods.default("log", args, meta, info);
			}
		},
		trace: function (method, args, meta, info) {
			var $table = module.methodTable(args[0], meta, "table-bordered");
			if (meta.sortable) {
				$table.addClass("sortable");
			}
			return $('<div class="m_trace"></div>').append($table);
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
					module.methodTable(
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
	methods.groupCollapsed = methods.group;

	module.UNDEFINED = UNDEFINED;
	module.ABSTRACTION = ABSTRACTION;

	module.dump = function (val, sanitize, wrap, decodeString) {
		// console.log('dump', JSON.stringify(val));
		var $span = $('<span></span>'),
			type,
			date;
		if (typeof sanitize == "undefined") {
			sanitize = true;
		}
		if (typeof wrap == "undefined") {
			wrap = true;
		}
		type = module.getType(val);
		if (val === null) {
			val = "null";
		} else if (type == "array") {
			val = dumpArray(val);
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
			val = module.dumpObject(val);
		} else if (type === "resource") {
			val = val.value;
		} else if (type === "callable") {
			val = '<span class="t_type">callable</span> ' +
					module.markupClassname(val.values[0] + '::' + val.values[1]);
		}
		return wrap
			? $span.addClass("t_"+type).html(val)[0].outerHTML
			: val;
	}

	module.getNode = function(requestId) {
		var $nodeWrapper,
			$node;
		if (typeof connections[requestId] !== "undefined") {
			$node = connections[requestId].slice(-1)[0];
		} else if ($("#"+requestId).length) {
			// "session alrleady closed?"  do our best to continue where we left off
			$node = $("#"+requestId).data("lastNode");
		} else {
			// create
			$nodeWrapper = $(''
				+'<div class="panel panel-default working">'
					+'<div class="panel-heading" data-toggle="collapse" data-target="#'+requestId+' > .panel-body.collapse">'
						+'<i class="glyphicon glyphicon-chevron-down"></i>'
						+'<i class="glyphicon glyphicon-remove pull-right btn-remove-session"></i>'
						+'<div class="panel-heading-body">'
							+'<h3 class="panel-title">Building Request...</h3>'
							+'<i class="fa fa-spinner fa-pulse fa-lg"></i>'
						+'</div>'
					+'</div>'
					+'<div class="panel-body collapse debug">'
						+'<fieldset class="channels" style="display:none;">'
							+'<legend>Channels</legend>'
							+'<ul class="list-unstyled">'
							+'</ul>'
						+'</fieldset>'
						+'<ul class="debug-log-summary"></ul>'
						+'<ul class="debug-log"></ul>'
						+'<i class="fa fa-spinner fa-pulse"></i>'
					+'</div>'
				+'</div>'
			);
			$node = $nodeWrapper.find(".debug-log");
			connections[requestId] = [ $node ];
			$nodeWrapper.attr("id", requestId);
			$("#body").append($nodeWrapper);
		}
		return $node;
	};

	module.getType = function(val) {
		var type;
		if (val === null) {
			return "null";
		}
		if (typeof val == "boolean") {
			return "bool";
		}
		if (typeof val == "string") {
			if (val === UNDEFINED) {
				return "undefined";
			}
			if (val === RECURSION) {
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
				if (val.debug === ABSTRACTION) {
					type = val.type;
				} else if (val.debug == ABSTRACTION) {
					type = val.type;
				}
			}
			return type;
		}
		if (typeof val == "undefined") {
			return "undefined";
		}
	};

	module.outputLogEntry = function(method, args, meta) {
		var info = {
				$currentNode: module.getNode(meta.requestId),
				$container: $("#"+meta.requestId)
			},
			channels = info.$container.data('channels') || [],
			i,
			$channelCheckbox,
			$node;
		try {
			/*
			console.log({
				method: method,
				args: args,
				meta: meta
			});
			*/
			if (meta.format == "html") {
				if (typeof args == "object") {
					$node = $('<li />', {class:"m_"+method});
					for (i = 0; i < args.length; i++) {
						$node.append(args[i]);
					}
				} else {
					$node = $(args);
					if ($node.find("> .m_"+method).length == 0) {
						$node = $('<li />', {class:"m_"+method}).html(args);	// $node.wrap('<div />').addClass("m_"+method);
					}
				}
			} else if (methods[method]) {
				$node = methods[method](method, args, meta, info);
			} else {
				$node = methods.default(method, args, meta, info);
			}
			if (meta.channel !== undefined && channels.indexOf(meta.channel) < 0) {
				addChannel(info.$container, meta.channel);
			}
			if ($node) {
				info.$currentNode.append($node);
				$node.attr("data-channel", meta.channel);	// using attr so can use [data-channel="xxx"] selector
				if (channels.length > 1 && !info.$container.find('.channels input[value="'+meta.channel+'"]').prop("checked")) {
					$node.addClass("hidden-channel");
				}
				if ($node.is(':visible')) {
					$node.debugEnhance();
				}
				$node.closest(".m_group").prev().removeClass("empty");
			}
		} catch (err) {
			console.warn(err);
			module.outputLogEntry('error', [
				"%cDebugWampClient: %cerror processing %c"+method+"()",
				"font-weight:bold;",
				"",
				"font-family:monospace;"
			], meta);
		}
	};

	function addChannel($container, channel, info) {
		var channels = $container.data("channels") || [],
			$li = $('<li><label>'
				+'<input checked data-is-root="false" data-toggle="channel" type="checkbox" value="" /> '
				+channel
				+'</label></li>');
		channels.push(channel);
		$container.data("channels", channels);
		$li.find("input").val(channel);
		$container.find(".channels ul").append($li);
		if (channels.length > 1) {
			$container.find(".channels").show();
		}
	}

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
				? module.dump(arg, sanitize)
				: module.dump(arg, false);
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
			return $("<div>").html(args[0] + args.slice(1).join(glue));
		} else {
			return $("<div>").html(args.join(glue));
		}
	}

	function checkTimestamp(val) {
		var secs = 86400 * 90; // 90 days worth o seconds
		var tsNow = Date.now() / 1000;
		val = parseFloat(val, 10);
		if (val > tsNow - secs && val < tsNow + secs) {
			return (new Date(val*1000)).toString();
		}
		return false;
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
			label = args.shift(),
			collapsedClass = method == 'groupCollapsed'
				? 'collapsed'
				: 'expanded';
		if (meta.isMethodName) {
			label = module.markupClassname(label);
		}
		for (i = 0; i < args.length; i++) {
			args[i] = module.dump(args[i]);
		}
		argStr = args.join(', ');
		$header = $('<div class="group-header ' + collapsedClass + '">' +
				'<span class="group-label">' +
					label +
					( argStr.length
						? '(</span>' + argStr + '<span class="group-label">)'
						: '' ) +
				'</span>' +
			'</div>');
		$header.attr("data-channel", meta.channel);	// using attr, so can use [data-channel=xxx] selector
		if (meta['hideIfEmpty']) {
			$header.addClass('hide-if-empty');
		}
		return $header;
	}

	function dumpArray(array) {
		var html = '';
		var keys = array['__debug_key_order__'] || Object.keys(array);
		var length = keys.length;
		var key;
		var i;
		/*
		if (array['__debug_key_order__']) {
			console.log('array keys specified', keys);
		} else {
			console.log('array keys', keys);
		}
		*/
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
						module.dump(array[key], true) +
					'</span>' + "\n";
			}
			html += '</span>' +
				'<span class="t_punct">)</span>';
		}
		return html;
	}

	function processSubstitutions(args) {
		var subRegex = '%' +
			'(?:' +
			'[coO]|' +				// c: css, o: obj with max info, O: obj w generic info
			'[+-]?' +               // sign specifier
			'(?:[ 0]|\'.)?' +    // padding specifier
			'-?' +                  // alignment specifier
			'\\d*' +                 // width specifier
			'(?:\\.\\d+)?' +          // precision specifier
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
				replacement = module.dump(args[index]);
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
		var type = module.getType(val);
		// var count;
		if (type == 'string') {
			val = module.dump(val, true, false);
		} else if (type == 'array') {
			delete val['__debug_key_order__'];
			val = '<span class="t_keyword">array</span>' +
				'<span class="t_punct">(</span>' + Object.keys(val).length + '<span class="t_punct">)</span>';
		} else if (type == 'object') {
			val = module.markupClassname(val['className']);
		} else {
			val = module.dump(val);
		}
		return val;
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
		var strBr = '';
		var searchReplacePairs = [
			[/\r/g, '<span class="ws_r"></span>'],
			[/\n/g, '<span class="ws_n"></span>'+strBr+"\n"]
		];
		var i = 0;
		var length = searchReplacePairs.length;
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

	return module;

}(jQuery, logDumper || {}));
