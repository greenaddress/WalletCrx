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

if (typeof winusbDevice == "undefined") {

var DEBUG = true;
function debug(message) {
  if (DEBUG) {
    console.log(message);
  }
}

function dump(array) {
  var hexchars = '0123456789ABCDEF';
  var hexrep = new Array(array.length * 2);

  for (var i = 0; i < array.length; i++) {
    hexrep[2 * i] = hexchars.charAt((array[i] >> 4) & 0x0f);
    hexrep[2 * i + 1] = hexchars.charAt(array[i] & 0x0f);
  }
  return hexrep.join('');  
}

function hexToArrayBuffer(h) {
  var result = new ArrayBuffer(h.length / 2);
  var hexchars = '0123456789ABCDEFabcdef';
  var res = new Uint8Array(result);
  for (var i = 0; i < h.length; i += 2) {
    if (hexchars.indexOf(h.substring(i, i + 1)) == -1) break;
    res[i / 2] = parseInt(h.substring(i, i + 2), 16);
  }
  return result;
}

function winUSBInterface(hardwareId) {
    this.hardwareId = hardwareId;
    this.closedDevice = false;
    this.claimed = false;    
    this.device = hardwareId.device;
    // Locate the interface to open, the in/out endpoints and their sizes
    for (var i=0; i<hardwareId.interfaces.length; i++) {
      if (hardwareId.interfaces[i].interfaceClass == 0xff) {
          this.interfaceId = i;
          var currentInterface = hardwareId.interfaces[i];
          for (var j=0; j<currentInterface.endpoints.length; j++) {
              var currentEndpoint = currentInterface.endpoints[j];
              if (currentEndpoint.direction == "in") {
                  this.inEndpoint = 0x80 + currentEndpoint.address;
              }
              else
              if (currentEndpoint.direction == "out") {
                  this.outEndpoint = currentEndpoint.address;
              }
          }
      }
    }
}

winUSBInterface.prototype.open = function(callback) {
    debug("Open winUSBInterface " + this.interfaceId);
    debug(this.device);
    var currentDevice = this;
    chrome.usb.claimInterface(this.device, this.interfaceId, function() {
        currentDevice.claimed = true;
        chrome.runtime.sendMessage({usbClaimed: currentDevice});
        if (callback) callback();
    });
}

winUSBInterface.prototype.bulkSend = function(data, callback) {
      debug("=> " + data);
      chrome.usb.bulkTransfer(this.device,
        {
          direction: "out",
          endpoint: this.outEndpoint,
          data: hexToArrayBuffer(data)
        },        
        function(result) {                  
          if (callback) {
            var exception = (result.resultCode != 0 ? "error " + result.resultCode : undefined);            
            callback({
              resultCode: result.resultCode,            
              exception: exception
            });
          }
        });
}

winUSBInterface.prototype.bulkRead = function(size, callback) {
      chrome.usb.bulkTransfer(this.device,
        {
          direction: "in",
          endpoint: this.inEndpoint,
          length: size
        },
        function(result) {
            var data;
            if (result.resultCode == 0) {
              data = dump(new Uint8Array(result.data));
            }
            debug("<= " + data);
            if (callback) {
                var exception = (result.resultCode != 0 ? "error " + result.resultCode : undefined);
                callback({
                  resultCode: result.resultCode,
                  data: data,
                  exception: exception
              });
            }
        });
}

winUSBInterface.prototype.close = function(callback) {
    var currentDevice = this;  
    if (this.claimed) {
      chrome.usb.releaseInterface(this.device, this.interfaceId, function() {
        currentDevice.claimed = false;
        chrome.usb.closeDevice(currentDevice.device, function() {
          currentDevice.closedDevice = true;
          chrome.runtime.sendMessage({usbClosed: currentDevice});
          if (callback) callback();
        });        
      });
    }
    else
    if (!this.closedDevice) {
        chrome.usb.closeDevice(currentDevice.device, function() {
          currentDevice.closedDevice = true;
          chrome.runtime.sendMessage({usbClosed: currentDevice});
          if (callback) callback();
        });        
    }
}

var winusbDevice = function(enumeratedDevice) {
	this.device = enumeratedDevice;
}

var boundDevices = [];
var unclaimedDevices = [];

winusbDevice.prototype.open_async = function() {
  var currentDevice = this;
  var msg = { 
    parameters: {
      device: this.device
    }
  };

  var deferred = Q.defer();
  var parameters = msg.parameters;
  var device = new winUSBInterface(parameters.device);      
  boundDevices.push(device);
  for (var i=0; i<unclaimedDevices.length; i++) {
      if (unclaimedDevices.handle == parameters.device.handle) {
          unclaimedDevices[i] = undefined;
          break;
      }
  }
  var id = boundDevices.length - 1;
  device.open(function(result) {
    deferred.resolve({
      deviceId: id
    });
  });

  return deferred.promise.then(function(result) {
    currentDevice.id = result.deviceId;
  });
}

winusbDevice.prototype.send_async = function(data) {
  var msg = { 
    parameters: {
      deviceId: this.id,
      data: data
    }
  };
  var deferred = Q.defer();
  var parameters = msg.parameters;
  var device = boundDevices[msg.parameters.deviceId]
  device.bulkSend(parameters.data, function(result) {
    deferred.resolve(result);
  });         
  return deferred.promise;
}

winusbDevice.prototype.recv_async = function(size) {
  var msg = { 
    parameters: {
      deviceId: this.id,
      size: size
    }
  };   
  var deferred = Q.defer();
  var parameters = msg.parameters;
  var device = boundDevices[msg.parameters.deviceId]
  device.bulkRead(parameters.size, function(result) {
    deferred.resolve(result);
  });
  return deferred.promise;
}

winusbDevice.prototype.close_async = function() {
  var msg = {
    parameters: {
      deviceId: this.id
    }
  };  
  var deferred = Q.defer();

  var device = boundDevices[msg.parameters.deviceId];
  device.close(function() {
    deferred.resolve({});
  });         
  return deferred.promise;
}


winusbDevice.enumerateDongles_async = function() {
  var msg = { 
    parameters: {
      vid: 0x2581,
      pid: 0x1b7c
    }
  };

  var deferred = Q.defer();

  var vid = 0x2581;
  var pid = 0x1808;
  var parameters = msg.parameters;
  if (typeof parameters.vid != "undefined") {
    vid = parameters.vid;
  }
  if (typeof parameters.pid != "undefined") {
    pid = parameters.pid;
  }
  debug("Looking up " + vid +  " " + pid);

  // First close all unclaimed devices to avoid leaking
  for (var i=0; i<unclaimedDevices.length; i++) {
      if (typeof unclaimedDevices[i] != "undefined") {
        debug("Closing");
        debug(unclaimedDevices[i]);
        chrome.usb.closeDevice(unclaimedDevices[i]);
      }
  }
  unclaimedDevices = [];

  chrome.usb.findDevices({
    vendorId: vid,
    productId: pid
  },
    function(devices) {

      debug(devices);

      var probedDevicesWithInterfaces = [];
      var probedDevices = 0;

      if (devices.length == 0) {
        deferred.resolve({
          deviceList: probedDevicesWithInterfaces
        });
      }          

      // Locate suitable interfaces
                          
      for (var currentDevice=0; currentDevice<devices.length; currentDevice++) {
        (function(currentDevice) { 
          chrome.usb.listInterfaces(devices[currentDevice], function(interfaceList) {
            probedDevices++;
            // If the device has at least one WinUSB interface, it can be probed
            var hasWinUSB = false;
            for (var i=0; i<interfaceList.length; i++) {
              if (interfaceList[i].interfaceClass == 0xff) {
                hasWinUSB = true;
                break;
              }
            }
            if (hasWinUSB) {
              unclaimedDevices.push(devices[currentDevice]);
              probedDevicesWithInterfaces.push({
                device: devices[currentDevice],
                interfaces: interfaceList
              });
            }
            else {
              debug("Closing");
              debug(devices[currentDevice]);
              chrome.usb.closeDevice(devices[currentDevice]);
            }
            if (probedDevices == devices.length) {
              deferred.resolve({
                deviceList: probedDevicesWithInterfaces
              })
            }
          }); // chrome.usb.listInterfaces
        })(currentDevice); // per device closure
      }
    }); // chrome.usb.findDevices 

  return deferred.promise;
}

}
