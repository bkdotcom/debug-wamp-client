// importScripts("autobahn.min.js", "Queue.js");

var
	// config = {},
	connection,
	msgQueue = new Queue(),
	hasMsgQueue = false;

/*
onmessage = function(e) {
	var cmd = typeof e.data == "object"
		? e.data[0]
		: e.data;
}
*/

// sort of mimic web-worker onmessage

// console.info('subscribe to onmessage');
events.subscribe('onmessage', function(cmd) {
	// console.info('socketWorker: onmessage', cmd);
	// var workerResult = 'Result: ' + (e.data[0] * e.data[1]);
	// postMessage(workerResult);
	// console.log('data', e.data);
	// console.log("cmd", cmd);
	if (cmd == "setCfg") {
		config = e.data[1];
	} else if (cmd == "connectionClose") {
		connection.close();
	} else if (cmd == "connectionOpen") {
		connection = getConnection()
	} else if (cmd == "getMsg") {
		var msg = msgQueue.shift();
		// postMessage(['msg', msg]);
		events.publish('websocket', 'msg', msg);
		if (typeof msg == "undefined") {
			hasMsgQueue = false;
		}
	}
});

function getConnection() {
	var connection = new autobahn.Connection({
		url: config.get('url'),
		realm: config.get('realm')
	});
	connection.onopen = function (session, details) {
		// console.info("Connection opened");
		// postMessage("connectionOpened");
		events.publish('websocket', 'connectionOpened');
		// var myWorker = new Worker('socketWorker.js');
		// SUBSCRIBE to a topic and receive events
		session.subscribe('bdk.debug', function (row) {
			// console.log('recvd args', JSON.parse(JSON.stringify(row)));
			if (!hasMsgQueue) {
				hasMsgQueue = true;
				// postMessage(["msg", row]);
				events.publish('websocket', 'msg', row);
			} else {
				msgQueue.push(row);
			}
		}).then(
			function (sub) {
				// console.log('subscribed to topic');
			},
			function (err) {
				console.warn('failed to subscribe to topic', err);
			}
		);
	};
	connection.onclose = function(reason, details) {
		// console.warn("Connection closed: " + reason);
		// postMessage("connectionClosed");
		events.publish('websocket', 'connectionClosed');
	};
	connection.open();
	// console.log('connection', connection);
	return connection;
}
