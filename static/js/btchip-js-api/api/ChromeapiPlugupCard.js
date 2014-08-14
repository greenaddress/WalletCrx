/*
************************************************************************
Copyright (c) 2013 UBINITY SAS

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*************************************************************************
*/

require('Sandbox');
require('ByteString');
require('Card');

var ChromeapiPlugupCard = Class.extend(Card, {
	/** @lends ChromeapiPlugupCard.prototype */
	
	/**
	 *  @class In browser implementation of the {@link Card} interface using the Chrome API
	 *  @param {PPACardTerminal} terminal Terminal linked to this card
	 *  @constructs
	 *  @augments Card
	 */
	initialize:function(terminal, device) {		
		//console.log(device);
		this.device = new winusbDevice(device);
		this.terminal = terminal;
                this.exchangeStack = [];
	},
	
	connect_async:function() {
		var currentObject = this;
		return this.device.open_async().then(function(result) {
			currentObject.connection = true;
			return currentObject;
		});
	},
	
	getTerminal : function() {
		return this.terminal;
	},
	
	getAtr : function() {
		return new ByteString("", HEX);
	},
	
	beginExclusive : function() {
	},
	
	endExclusive : function() {
	},
	
	openLogicalChannel: function(channel) {
		throw "Not supported";
	},
	
	exchange_async : function(apdu, returnLength) {
		var currentObject = this;
		if (!(apdu instanceof ByteString)) {
			throw "Invalid parameter";
		}
		if (!this.connection) {
			throw "Connection is not open";
		}

		var deferred = Q.defer();
		deferred.promise.apdu = apdu;
                deferred.promise.returnLength = returnLength;
                
                // enter the exchange wait list
		currentObject.exchangeStack.push(deferred);
                
                if (currentObject.exchangeStack.length == 1) {
                  var processNextExchange = function() {
                    
                    // don't pop it now, to avoid multiple at once
                    var deferred = currentObject.exchangeStack[0];
                    
                    // notify graphical listener
                    if (typeof currentObject.listener != "undefined") {
                      currentObject.listener.begin();
                    }
                    
                    currentObject.device.send_async(deferred.promise.apdu.toString(HEX)).then(
                            function(result) {                      
                                    return currentObject.device.recv_async(512);
                            }
                    )
                    .then(function(result) {
                            var resultBin = new ByteString(result.data, HEX);
                            if (resultBin.length == 2 || resultBin.byteAt(0) != 0x61) {
                                    deferred.promise.SW1 = resultBin.byteAt(0);
                                    deferred.promise.SW2 = resultBin.byteAt(1);
                                    deferred.promise.response = new ByteString("", HEX);
                            }
                            else {
                                    var size = resultBin.byteAt(1);
                                    // fake T0 
                                    if (size == 0) { size = 256; }
                                    deferred.promise.response = resultBin.bytes(2, size);
                                    deferred.promise.SW1 = resultBin.byteAt(2 + size);
                                    deferred.promise.SW2 = resultBin.byteAt(2 + size + 1);
                            }
                            deferred.promise.SW = ((deferred.promise.SW1 << 8) + (deferred.promise.SW2));
                            if (typeof currentObject.logger != "undefined") {
                                    currentObject.logger.log(currentObject.terminal.getName(), 0, deferred.promise.apdu, deferred.promise.response, deferred.promise.SW);
                            }
                            // build the response
                            deferred.resolve(deferred.promise.response);
                    })
                    .fail(function(err) { 
                      deferred.reject(err);
                    })
                    .finally(function () { 
                      // notify graphical listener
                      if (typeof currentObject.listener != "undefined") {
                        currentObject.listener.end();
                      }

                      // consume current promise
                      currentObject.exchangeStack.shift();
                      
                      // schedule next exchange
                      if (currentObject.exchangeStack.length > 0) {
                        processNextExchange();
                      }
                    });                    
                  };
                  
                  // schedule next exchange
                  processNextExchange();
                }
                
                // the exchangeStack will process the promise when possible
                return deferred.promise;
	},

	reset:function(mode) {
	},	
	
	disconnect_async:function(mode) {
		var currentObject = this;		
		if (!this.connection) {
			return;
		}
		return this.device.close_async().then(function(result) {
			currentObject.connection = false;
		});
	},	
	
        /*
	getSW : function() {
		return this.SW;
	},
	
	getSW1 : function() {
		return this.SW1;
	},

	getSW2 : function() {
		return this.SW2;
	},
        */
	
	setCommandDelay : function(delay) {
		// unsupported - use options
	},
	
	setReportDelay : function(delay) {
		// unsupported - use options
	},
	
	getCommandDelay : function() {
		// unsupported - use options
		return 0;
	},
	
	getReportDelay : function() {
		// unsupported - use options
		return 0;
	}
		
	
});
