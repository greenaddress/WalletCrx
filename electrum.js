// Copyright 2014 Mike Tsao <mike@sowbug.com>

// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

// Many thanks to Dennis for his StackOverflow answer:
// http://goo.gl/UDanx Since amended to handle BlobBuilder
// deprecation.
function string2ArrayBuffer(string, callback) {
  var blob = new Blob([string]);
  var f = new FileReader();
  f.onload = function(e) {
    callback(e.target.result);
  };
  f.readAsArrayBuffer(blob);
}

function arrayBuffer2String(buf, callback) {
  var blob = new Blob([new Uint8Array(buf)]);
  var f = new FileReader();
  f.onload = function(e) {
    callback(e.target.result);
  };
  f.readAsText(blob);
}

function logInfo() {
  // console.log.apply(console, arguments);
};

function logFatal() {
  // console.log.apply(console, arguments);
};

/**
 * @constructor
 */
function Electrum() {
  this.callbacks = {};
  this.callbackId = 1;
  this.isSocketConnected = false;
  this.connecting = false;
  this.socketId = undefined;
  this.stringBuffer = "";
  this.outgoingQueue = [];
  this.connectionStateDescription = "";

  // TODO(miket): there's just no way this will work
  this.pendingRpcCount = 0;

  chrome.sockets.tcp.onReceive.addListener(
    this.onSocketReceive.bind(this));
  chrome.sockets.tcp.onReceiveError.addListener(
    this.onSocketReceiveError.bind(this));
};

Electrum.SERVERS = [
  "b.1209k.com",
  "cube.l0g.in",
  "ecdsa.org",
  "electrum.be",
  "electrum.no-ip.org",
  "electrum.novit.ro",
  "electrum.stepkrav.pw",
  "electrum.stupidfoot.com",
  "sspc1000.homeip.net",
];

Electrum.prototype.issueAddressGetHistory = function(addr_b58) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.address.get_history", [addr_b58])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.issueAddressSubscribe = function(addr_b58) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.address.subscribe", [addr_b58])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.issueTransactionGet = function(tx_hash) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.transaction.get", [tx_hash])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.issueTransactionBroadcast = function(tx) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.transaction.broadcast", [tx])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.issueHeadersSubscribe = function() {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.headers.subscribe", [])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.issueBlockGetHeader = function(block_num) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.block.get_header", [block_num])
      .then(resolve);
  }.bind(this));
};

Electrum.prototype.handleResponse = function(o) {
  var id = o["id"];
  if (this.callbacks[id]) {
    this.callbacks[id].resolve(o["result"]);
    delete this.callbacks[id];
    this.pendingRpcCount--;
  } else {
    logInfo("notification from electrum", o);
  }
};

Electrum.prototype.getConnectionStateDescription = function() {
  return this.connectionStateDescription;
};

Electrum.prototype.setConnectionStateDescription = function(d) {
  this.connectionStateDescription = d;
};

Electrum.prototype.isConnected = function() {
  return this.isSocketConnected;
};

Electrum.prototype.onSocketReceive = function(receiveInfo) {
  arrayBuffer2String(receiveInfo.data, function(str) {
    this.stringBuffer += str;
    var isLastComplete = (this.stringBuffer.substr(-1) == "\n");
    var parts = this.stringBuffer.split("\n");
    for (var i = 0; i < parts.length; ++i) {
      var part = parts[i];
      if (part.length == 0) {
        continue;
      }
      if (i == parts.length - 1 && !isLastComplete) {
        logInfo("received partial", part);
        continue;
      }
      logInfo("received & processing", part);
      this.handleResponse(JSON.parse(part));
    }
    if (isLastComplete) {
      this.stringBuffer = "";
    } else {
      this.stringBuffer = parts[parts.length - 1];
    }
  }.bind(this));
};

Electrum.prototype.onSocketReceiveError = function(receiveErrorInfo) {
  logFatal("receive error", receiveErrorInfo);
  this.isSocketConnected = false;
  this.connectionStateDescription = "Not connected";
  chrome.sockets.tcp.disconnect(this.socketId, function() {
    this.connectToServer();
  }.bind(this));
};

Electrum.prototype.onSendComplete = function(sendInfo) {
  logInfo(sendInfo);
};

Electrum.prototype.pickRandomServer = function() {
  var newHostname;
  do {
    newHostname =
      Electrum.SERVERS[Math.floor(Math.random() * Electrum.SERVERS.length)];
  } while (newHostname == this.currentServerHostname);
  this.currentServerHostname = newHostname;
};

Electrum.prototype.connectToServer = function() {
  this.connecting = true;
  return new Promise(function(resolve, reject) {
    var retryDelay = 100;

    function onConnectComplete(result) {
      if (result != 0) {
        this.connectionStateDescription = ("Waiting to reconnect (" +
                                           result + ")");
        retryDelay *= 2;
        if (retryDelay > 3200) {
          retryDelay = 3200;
        }
        window.setTimeout(tryConnection.bind(this), retryDelay);
      } else {
        this.connectionStateDescription = ("Connected to " +
                                           this.currentServerHostname);
        this.isSocketConnected = true;
        this.flushOutgoingQueue();
        resolve();
      }
    }

    function tryConnection() {
      this.pickRandomServer();
      this.connectionStateDescription = ("Attempting connection to " +
                                         this.currentServerHostname);
      chrome.sockets.tcp.connect(this.socketId,
                                 this.currentServerHostname,
                                 50001,
                                 onConnectComplete.bind(this));
    }

    function onSocketCreate(socketInfo) {
      this.socketId = socketInfo.socketId;
      tryConnection.call(this);
    }

    if (this.socketId) {
      tryConnection.call(this);
    } else {
      chrome.sockets.tcp.create({
        "name": "electrum",
        "persistent": true,
        "bufferSize": 16384
      }, onSocketCreate.bind(this));
    }
  }.bind(this));
}

Electrum.prototype.areRequestsPending = function() {
  return this.pendingRpcCount > 0;
};

Electrum.prototype.flushOutgoingQueue = function() {
  if (this.outgoingQueue.length == 0) {
    return;
  }
  
  if (!this.isSocketConnected) {
    if (!self.connecting)
      this.connectToServer();  // onConnectComplete calls flushOutgoingQueue again  
    return;
  }
  
  while (this.outgoingQueue.length != 0) {
    string2ArrayBuffer(
      this.outgoingQueue.shift(),
      function(arrayBuffer) {
        chrome.sockets.tcp.send(this.socketId,
                                arrayBuffer,
                                this.onSendComplete.bind(this));
      }.bind(this));
  }
};

Electrum.prototype._enqueueRpc = function(method, params) {
  return new Promise(function(resolve, reject) {
    var rpc = {
      "id": this.callbackId++,
      "method": method,
      "params": params
    };
    this.outgoingQueue.push(JSON.stringify(rpc) + "\n");
    this.callbacks[rpc["id"]] = {"resolve": resolve, "reject": reject};
    this.pendingRpcCount++;
    this.flushOutgoingQueue();
  }.bind(this));
};
