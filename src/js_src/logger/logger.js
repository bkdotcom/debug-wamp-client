import $ from 'jquery';				// external global
import * as methods from "./methods.js";

var connections = {
	/*
	requestId : [ $node, ... ]
	*/
};

methods.init(connections);

export function getNode(requestId) {
	var $panel,
		$node;
	if (typeof connections[requestId] !== "undefined") {
		$node = connections[requestId].slice(-1)[0];
	} else if ($("#"+requestId).length) {
		// "session alrleady closed?"  do our best to continue where we left off
		$node = $("#"+requestId).data("lastNode");
	} else {
		// create
		$panel = $('' +
			'<div class="panel panel-default working">' +
				'<div class="panel-heading" data-toggle="collapse" data-target="#'+requestId+' &gt; .panel-body.collapse">' +
					'<i class="glyphicon glyphicon-chevron-right"></i>' +
					'<i class="glyphicon glyphicon-remove pull-right btn-remove-session"></i>' +
					'<div class="panel-heading-body">' +
						'<h3 class="panel-title">Building Request&hellip;</h3>' +
						'<i class="fa fa-spinner fa-pulse fa-lg"></i>' +
					'</div>' +
				'</div>' +
				'<div class="panel-body collapse debug">' +
					'<div class="sidebar-trigger"></div>' +
					'<div class="debug-body">' +
						'<ul class="debug-log-summary group-body"></ul>' +
						'<ul class="debug-log group-body"></ul>' +
					'</div>' +
					'<i class="fa fa-spinner fa-pulse"></i>' +
				'</div>' +
			'</div>'
		);
		$panel.debugEnhance("sidebar", "add");
		$panel.debugEnhance("sidebar", "close");
		$panel.find(".debug-sidebar .sidebar-toggle").html('<i class="fa fa-lg fa-filter"></i>');
		$node = $panel.find(".debug-log");
		connections[requestId] = [ $node ];
		$panel.attr("id", requestId);
		$("#body").append($panel);
	}
	return $node;
};

export function processEntry(logEntry) {
	var method = logEntry.method,
		meta = logEntry.meta,
		requestId = meta.requestId,
		i,
		info = {
			$currentNode: getNode(requestId),
			$container: $("#"+requestId)
		},
		channels = info.$container.data('channels') || [],
		channel = meta.channel || info.$container.data("channelRoot"),
		$channelCheckbox,
		$node;
	// console.log('processEntry', logEntry);
	try {
		if (meta.format == "html") {
			if (typeof logEntry.args == "object") {
				$node = $('<li />', {class:"m_"+method});
				for (i = 0; i < logEntry.args.length; i++) {
					$node.append(logEntry.args[i]);
				}
			} else {
				$node = $(logEntry.args);
				if (!$node.is(".m_"+method)) {
					$node = $("<li />", {class:"m_"+method}).html(logEntry.args);
				}
			}
		} else if (methods.methods[method]) {
			$node = methods.methods[method](logEntry, info);
		} else {
			$node = methods.methods.default(logEntry, info);
		}
		updateSidebar(logEntry, info, $node != false);
		if ($node) {
			if (meta.attribs && meta.attribs.class && meta.attribs.class == "php-shutdown") {
				info.$currentNode = info.$container.find("> .panel-body > .debug-body > .debug-log");
				connections[requestId] = [ info.$currentNode ];
			}
			info.$currentNode.append($node);
			$node.attr("data-channel", meta.channel);	// using attr so can use [data-channel="xxx"] selector
			if (meta.attribs && Object.keys(meta.attribs).length) {
				if (meta.attribs.class) {
					$node.addClass(meta.attribs.class);
					delete meta.attribs.class;
				}
				$node.attr(meta.attribs);
			}
			if (meta.icon) {
				$node.data("icon", meta.icon);
			}
			if (channels.length > 1 && channel !== "phpError" && !info.$container.find('.channels input[value="'+channel+'"]').prop("checked")) {
				$node.addClass("filter-hidden");
			}
			if (meta.detectFiles) {
				// using attr so can find via css selector
				$node.attr('data-detect-files', meta.detectFiles);
				$node.attr('data-found-files', meta.foundFiles ? meta.foundFiles : []);
			}
			if ($node.is(":visible:not(.filter-hidden)")) {
				$node.debugEnhance();
			}
			if (!$node.is(".m_group")) {
				// don't remove from ourself
				// console.warn('remove empty?');
				$node.parents(".m_group").removeClass("empty");
			}
		}
	} catch (err) {
		console.warn(err);
		console.log('logEntry', logEntry);
		/*
		processEntry({
			method: 'error',
			args: [
				"%cDebugWampClient: %cerror processing %c"+method+"()",
				"font-weight:bold;",
				"",
				"font-family:monospace;"
			],
			meta: meta
		});
		*/
	}
};

function updateSidebar(logEntry, info, haveNode) {
	var filterVal = null,
		// channel = logEntry.meta.channel || info.$container.data("channelRoot"),
		method = logEntry.method,
		$filters = info.$container.find(".debug-sidebar .debug-filters");
	/*
		Update channel filter
	*/
	addChannel(logEntry, info);
	if (['groupSummary','groupEnd'].indexOf(method) > -1) {
		return;
	}
	/*
		Update error filters
	*/
	if (["error","warn"].indexOf(method) > -1 && logEntry.meta.channel == "phpError") {
		addError(logEntry, info);
	}
	/*
		Update method filter
	*/
	if (["alert","error","warn","info"].indexOf(method) > -1) {
		filterVal = method
	} else if (method == "group" && logEntry.meta.level) {
		filterVal = logEntry.meta.level;
	} else if (haveNode) {
		filterVal = "other";
	}
	if (filterVal) {
		$filters.find("input[data-toggle=method][value="+filterVal+"]")
			.closest("label")
			.removeClass("disabled");
	}
	/*
		Expand all groups
	*/
	if (method == "group" && info.$container.find(".debug-body .m_group").length > 2) {
		info.$container.find(".debug-sidebar .expand-all").show();
	}
}

function addChannel(logEntry, info) {
	var $container = info.$container,
		$channels = $container.find(".channels"),
		channelName = logEntry.meta.channel || info.$container.data("channelRoot"),
		channelRoot = $container.data("channelRoot") || "general",
		channels = $container.data("channels") || [],
		checkedChannels = [],
		$ul;
	if (channelName == "phpError" || haveChannel(channelName, channels)) {
		return false;
	}
	channels.push({
		name: channelName,
		icon: logEntry.meta.channelIcon,
		show: logEntry.meta.channelShow
	});
	/*
	console.log({
		name: channelName,
		icon: logEntry.meta.channelIcon,
		show: logEntry.meta.channelShow
	});
	*/
	$container.data("channels", channels);
	if (channels.length > 1) {
		if (channels.length === 2) {
			// checkboxes weren't added when there was only one...
			checkedChannels.push(channels[0].name);
		}
		if (logEntry.meta.channelShow) {
			checkedChannels.push(channelName);
		}
		$channels.find("input:checked").each(function(){
			checkedChannels.push($(this).val());
		});
		$ul = $().debugEnhance("buildChannelList", channels, channelRoot, checkedChannels);
		if ($channels.length) {
			$channels.find("> ul").replaceWith($ul);
			$channels.show();
		} else {
			$channels = $("<fieldset />", {
					class: "channels",
				})
				.append('<legend>Channels</legend>')
				.append($ul);
			$container.find(".debug-body").prepend($channels);
		}
		$container.find(".debug").trigger("channelAdded.debug");
	}
	return true;
}

function haveChannel(channelName, channels)
{
	// channels.indexOf(channelName) > -1
	var i,
		len = channels.length,
		channel;
	for (i = 0; i < len; i++) {
		channel = channels[i];
		if (channel.name === channelName) {
			return true;
		}
	}
	return false;
}

function addError(logEntry, info) {
	// console.log('addError', logEntry);
	var $filters = info.$container.find(".debug-sidebar .debug-filters"),
		$ul = $filters.find(".php-errors").show().find("> ul"),
		$input = $ul.find("input[value="+logEntry.meta.errorCat+"]"),
		$label = $input.closest("label"),
		$badge = $label.find(".badge"),
		order = ["fatal", "warning", "deprecated", "notice", "strict"],
		count = 1,
		i = 0,
		rows = [];
	if ($input.length) {
		count = $input.data("count") + 1;
		$input.data("count", count);
		$badge.text(count);
	} else {
		$ul.append(
			$("<li>"
			).append(
				$("<label>", {
					"class": "toggle active"
				}).append(
					$("<input>", {
						type: "checkbox",
						checked: true,
						"data-toggle": "error",
						"data-count": 1,
						value: logEntry.meta.errorCat
					})
				).append(
					logEntry.meta.errorCat + ' <span class="badge">'+1+'</span>'
				)
			)
		);
		rows = $ul.find("> li");
		rows.sort(function(liA, liB){
			var liAindex = order.indexOf($(liA).find("input").val()),
				liBindex = order.indexOf($(liB).find("input").val());
			return liAindex > liBindex ? 1 : -1;
		});
		for (i = 0; i < rows.length; ++i) {
			$ul.append(rows[i]); // append each row in order (which moves)
		}
	}
}
