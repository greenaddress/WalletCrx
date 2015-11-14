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

// FIXME: ssl unused currently
// since Chrome 38 we can use chrome.sockets.tcp.secure to enable ssl on tcp
// https://developer.chrome.com/apps/sockets_tcp#method-secure
// 
// possible future fix: attempt to use ssl server first
// if that fails then attempt clearnet
//

// addr, port
Electrum.SSL_SERVERS = [
  ["electrum.jdubya.info", 50002],
  ["vps.hsmiths.com", 50002],
  ["ecdsa.net", 110],
  ["eco-electrum.ddns.net", 50002],
  ["electrum.be", 50002],
  ["electrum.drollette.com", 50002],
  ["electrum.hsmiths.com", 50002],
  ["electrum.no-ip.org",50002],
  ["electrum.ofloo.net", 50002],
  ["electrum.petrkr.net", 50002],
  ["electrum.thwg.org", 50002],
  ["electrum0.electricnewyear.net", 50002],
  ["erbium1.sytes.net", 50002],
  ["kirsche.emzy.de", 50002],
  ["us.electrum.be", 50002]
];

// addr, port
Electrum.SERVERS = [
  ["electrum.jdubya.info", 50001],
  ["vps.hsmiths.com", 50001],
  ["ecdsa.net", 50001],
  ["electrum.be", 50001],
  ["electrum.drollette.com", 50001],
  ["electrum.no-ip.org", 50001],
  ["electrum.thwg.org", 50001],
  ["electrum0.electricnewyear.net", 50001],
  ["erbium1.sytes.net", 50001],
  ["kirsche.emzy.de", 50001],
  ["us.electrum.be", 50001]
];

Electrum.prototype.checkConnectionsAvailable = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    var tryServer = function (eserver) {
      return new Promise(function(resolve, reject) {
        var socketId, resolved;

        var onConnectComplete = function (result) {
          if (resolved) return;
          resolved = true;
          if (result != 0) {
            reject();
          } else {
            chrome.sockets.tcp.close(socketId);
            that.currentEserver = eserver;
            resolve();
          }
        }

        var onSocketCreate = function(socketInfo) {
          socketId = socketInfo.socketId;
          chrome.sockets.tcp.connect(socketInfo.socketId,
                                     eserver[0], eserver[1],
                                     onConnectComplete);
        };

        chrome.sockets.tcp.create({
          "name": "electrum_test"
        }, onSocketCreate);

        setTimeout(function() {
          if (resolved) return;
          resolved = true;
          chrome.sockets.tcp.close(socketId);
          reject();
        }, 1000)
      });
    };

    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/array/shuffle [v1.0]
    function shuffle(o){ //v1.0
        for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };
    var servers = shuffle(Electrum.SERVERS.slice(0));

    var d = Promise.reject();
    for (var i = 0; i < servers.length; i++) {
      d = d.then(resolve, (function(i) { return function() {
        return tryServer(servers[i]);
      }})(i));
    }
    d.then(resolve, reject);
  });
}

Electrum.prototype.issueAddressGetHistory = function(addr_b58) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.address.get_history", [addr_b58])
      .then(resolve, reject);
  }.bind(this));
};

Electrum.prototype.issueAddressSubscribe = function(addr_b58) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.address.subscribe", [addr_b58])
      .then(resolve, reject);
  }.bind(this));
};

Electrum.prototype.issueTransactionGet = function(tx_hash) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.transaction.get", [tx_hash])
      .then(resolve, reject);
  }.bind(this));
};

Electrum.prototype.issueTransactionBroadcast = function(tx) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.transaction.broadcast", [tx])
      .then(resolve, reject);
  }.bind(this));
};

Electrum.prototype.issueHeadersSubscribe = function() {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.headers.subscribe", [])
      .then(resolve, reject);
  }.bind(this));
};

Electrum.prototype.issueBlockGetHeader = function(block_num) {
  return new Promise(function(resolve, reject) {
    this._enqueueRpc("blockchain.block.get_header", [block_num])
      .then(resolve, reject);
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
  if (receiveInfo.socketId != this.socketId) return;
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
  if (receiveErrorInfo.socketId != this.socketId) return;
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
  var newEserver;
  do {
    newEserver =
      Electrum.SERVERS[Math.floor(Math.random() * Electrum.SERVERS.length)];
  } while (newEserver== this.currentEserver);
  this.currentEserver = newEserver;
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
                                           this.currentEserver[0] + ":" +
                                           this.currentEserver[1]);
        this.isSocketConnected = true;
        this.flushOutgoingQueue();
        resolve();
      }
    }

    function tryConnection() {
      this.pickRandomServer();
      this.connectionStateDescription = ("Attempting connection to " +
                                         this.currentEserver[0] + ":" +
                                         this.currentEserver[1]);
      chrome.sockets.tcp.connect(this.socketId,
                                 this.currentEserver[0],
                                 this.currentEserver[1],
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
    var resolved;
    var _resolve = function(arg) {
      if (!resolved) {
        resolved = true;
        resolve(arg);
      }
    }
    var _reject = function(arg) {
      if (!resolved) {
        resolved = true;
        reject(arg);
      }
    }
    this.callbacks[rpc["id"]] = {"resolve": _resolve, "reject": _reject};
    this.pendingRpcCount++;
    this.flushOutgoingQueue();
    setTimeout(function() {
      if (!resolved) {
        _reject('timeout');
      }
    }, 5000);
  }.bind(this));
};
