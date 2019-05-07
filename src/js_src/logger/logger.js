import $ from 'jquery';				// external global
import * as methods from "./methods.js";

var connections = {
	/*
	requestId : [ $node, ... ]
	*/
};

methods.init(connections);

export function getNode(requestId) {
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
					+'<i class="glyphicon glyphicon-chevron-right"></i>'
					+'<i class="glyphicon glyphicon-remove pull-right btn-remove-session"></i>'
					+'<div class="panel-heading-body">'
						+'<h3 class="panel-title">Building Request...</h3>'
						+'<i class="fa fa-spinner fa-pulse fa-lg"></i>'
					+'</div>'
				+'</div>'
				+'<div class="panel-body collapse debug">'
					+'<div class="sidebar-trigger"></div>'
					+'<div class="debug-body">'
						+'<ul class="debug-log-summary group-body"></ul>'
						+'<ul class="debug-log group-body"></ul>'
					+'</div>'
					+'<i class="fa fa-spinner fa-pulse"></i>'
				+'</div>'
			+'</div>'
		);
		$nodeWrapper.debugEnhance("sidebar", "add");
		$nodeWrapper.debugEnhance("sidebar", "close");
		$node = $nodeWrapper.find(".debug-log");
		connections[requestId] = [ $node ];
		$nodeWrapper.attr("id", requestId);
		$("#body").append($nodeWrapper);
	}
	return $node;
};

export function processEntry(logEntry) {
	var info = {
			$currentNode: getNode(logEntry.meta.requestId),
			$container: $("#"+logEntry.meta.requestId)
		},
		channels = info.$container.data('channels') || [],
		method = logEntry.method,
		meta = logEntry.meta,
		channel = meta.channel || info.$container.data("channelRoot"),
		i,
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
		if ($node) {
			info.$currentNode.append($node);
			$node.attr("data-channel", meta.channel);	// using attr so can use [data-channel="xxx"] selector
			if (meta.class) {
				$node.addClass(meta.class);
			}
			if (meta.icon) {
				$node.data("icon", meta.icon);
			}
			if (meta.style) {
				$node.attr("style", meta.style);
			}
			if (channels.length > 1 && channel !== "phpError" && !info.$container.find('.channels input[value="'+channel+'"]').prop("checked")) {
				$node.addClass("filter-hidden");
			}
			if (meta.detectFiles) {
				// using attr so can find via css selector
				$node.attr('data-detect-files', meta.detectFiles);
				$node.attr('data-found-files', meta.foundFiles ? meta.foundFiles : []);
			}
			if ($node.is(':visible')) {
				$node.debugEnhance();
			}
			$node.closest(".m_group").removeClass("empty");
		}
		updateSidebar(logEntry, info, $node != false);
	} catch (err) {
		console.warn(err);
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
		channel = logEntry.meta.channel || info.$container.data("channelRoot"),
		method = logEntry.method,
		$filters = info.$container.find(".debug-sidebar .debug-filters");
	if (['groupSummary','groupEnd'].indexOf(method) > -1) {
		return;
	}
	/*
		Update error filters
	*/
	if (["error","warn"].indexOf(method) > -1 && logEntry.meta.channel == "phpError") {
		console.log('updateSidebar phpError', logEntry);
		var $ul = $filters.find(".php-errors").show().find("> ul");
		var $input = $ul.find("input[value=error-"+logEntry.meta.errorCat+"]");
		var $label = $input.closest("label");
		var $badge = $label.find(".badge");
		var count = 1;
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
							value: "error-"+logEntry.meta.errorCat
						})
					).append(
						logEntry.meta.errorCat + ' <span class="badge">'+1+'</span>'
					)
				)
			);
		}
	}
	/*
		Update channel filter
	*/
	addChannel(channel, info);
	/*
		Update method filter
	*/
	if (["alert","error","warn","info"].indexOf(method) > -1) {
		filterVal = method
	} else if (haveNode) {
		filterVal = "other";
	}
	if (filterVal) {
		$filters.find("input[data-toggle=method][value="+filterVal+"]")
			.closest("label")
			.removeClass("disabled");
		}

}

function addChannel(channel, info) {
	var $container = info.$container,
		$channels = $container.find(".channels"),
		channels = $container.data("channels") || [],
		checkedChannels = [],
		channelRoot = $container.data("channelRoot") || "general",
		$ul;
	channel = channel || channelRoot;
	if (channel == "phpError" || channels.indexOf(channel) > -1) {
		return false;
	}
	channels.push(channel);
	$container.data("channels", channels);
	$channels.find("input:checked").each(function(){
		checkedChannels.push($(this).val());
	});
	$ul = $().debugEnhance("buildChannelList", channels, channelRoot, checkedChannels);
	if (channels.length > 1) {
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
	}
	return true;
}
