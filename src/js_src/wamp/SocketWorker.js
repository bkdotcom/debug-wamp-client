import {Queue} from "./Queue.js";
import autobahn from "autobahn-browser";

export function SocketWorker(pubSub, config) {
	this.pubSub = pubSub;
	this.config = config;
	this.connection = null;
	this.hasMsgQueue = false;
	this.msgQueue = new Queue();
	self = this;
	pubSub.subscribe("onmessage", function(cmd) {
		// console.info('socketWorker: onmessage', cmd);
		// var workerResult = 'Result: ' + (e.data[0] * e.data[1]);
		// postMessage(workerResult);
		// console.log('data', e.data);
		// console.log("cmd", cmd);
		// if (cmd == "setCfg") {
			// config = e.data[1];
		// } else
		if (cmd == "connectionClose") {
			self.connection.close();
		} else if (cmd == "connectionOpen") {
			self.connection = self.getConnection()
		} else if (cmd == "getMsg") {
			var msg = self.msgQueue.shift();
			// postMessage(['msg', msg]);
			pubSub.publish("websocket", 'msg', msg);
			if (typeof msg === "undefined") {
				self.hasMsgQueue = false;
			}
		}
	});
}

SocketWorker.prototype.getConnection = function() {
	var connection = new autobahn.Connection({
		url: this.config.get('url'),
		realm: this.config.get('realm')
	});
	var self = this;
	connection.onopen = function (session, details) {
		// console.info("Connection opened");
		// postMessage("connectionOpened");
		self.pubSub.publish("websocket", "connectionOpened");
		// var myWorker = new Worker('socketWorker.js');
		// SUBSCRIBE to a topic and receive events
		session.subscribe("bdk.debug", function (row) {
			// console.log('recvd args', Object.keys(row[1][1]));
			if (!self.hasMsgQueue) {
				self.hasMsgQueue = true;
				// postMessage(["msg", row]);
				self.pubSub.publish("websocket", "msg", row);
			} else {
				self.msgQueue.push(row);
			}
		}).then(
			function (sub) {
				// console.log("subscribed to topic");
			},
			function (err) {
				console.warn("failed to subscribe to topic", err);
			}
		);
	};
	connection.onclose = function(reason, details) {
		// console.warn("Connection closed: " + reason);
		// postMessage("connectionClosed");
		self.pubSub.publish("websocket", "connectionClosed");
	};
	connection.open();
	// console.log('connection', connection);
	return connection;
}
