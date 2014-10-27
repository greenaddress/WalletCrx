
  var SCAN_DELAY_MS = 500;
  var PAUSE_TIMEOUT_MS = 200;
  
  var STAGE_UNDEFINED = 0;
  var STAGE_RELOAD_BL_FROM_OS = 1;
  var STAGE_LOAD_BL_RELOADER = 2;
  var STAGE_LOAD_BL = 3;
  var STAGE_LOAD_OS = 4;
  var STAGE_INIT_OS = 5;

  var MODE_BOOTLOADER = 1;
  var MODE_OS = 2;

  var factoryDongleBootloader;
  var factoryDongleOS;

  var lastCardTerminal;
  var lastCard;
  var lastMode;
  var stage;
  var timerId;
  var powerCycle;
  var lastVersion;
  var extraTimeout;
  var osLoaded;
  var confirmBeta;

  function processStage() {
    console.log("Current stage : " + stage);
    if (lastMode == MODE_OS) {
      switch(stage) {
        case STAGE_UNDEFINED:
          processInitStageOS();
          break;
        case STAGE_RELOAD_BL_FROM_OS:
          processReloadBLConfirm();
          break;
        case STAGE_INIT_OS:
          processInitOS();
          break;
        default:
          console.log("Unexpected stage " + stage);
          break;
      }
    }
    else {
      switch(stage) {
        case STAGE_UNDEFINED:
          processInitStageBootloader();
          break;
        case STAGE_LOAD_BL_RELOADER:
          processLoadReloader();
          break;
        case STAGE_LOAD_BL:
          processLoadBL();
          break;
        case STAGE_LOAD_OS:
          processLoadOS();
          break;
        default:
          console.log("Unexpected stage " + stage);
          break;
      }
    }
  }

  function processInitStageOS() {    
    console.log("processInitStageOS");
    lastVersion = undefined;
    getVersion_async().then(function(result) {      
      lastVersion = result;
      if (result == CURRENT_OS) {
        if (!osLoaded && BETA) {
          confirmBeta = true;
          $("#confirmMessage").html("Confirm overwrite of beta firmware " + versionToString(lastVersion));
          $("#modalConfirm").modal('show');
        }
        else {
          stage = STAGE_INIT_OS;
          processStage();
        }
      }
      else
      if (result > CURRENT_OS) {
        stage = STAGE_UNDEFINED;
        $("#okMessage").html("Current version is more recent");
        $("#modalEndOK").modal('show');        
      }
      else {
        stage = STAGE_RELOAD_BL_FROM_OS;
        processStage();
      }
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Error getting current firmware version");
        $("#modalEndKO").modal('show');      
    });  
  }

  function findOriginalKey(loadingArray, offset) {
    console.log("findOriginalKey " + offset);
    if (typeof offset == "undefined") {
      offset = 0;
    }
    if (offset >= loadingArray.length) {
      throw "Key not found";
    }
    return lastCard.exchange_async(new ByteString(loadingArray[offset][0], HEX)).then(function(result) {
      if (lastCard.SW == 0x9000) {
        console.log("Match " + offset);
        return offset;
      }
      else {
        return findOriginalKey(loadingArray, offset + 1);
      }
    }).fail(function(e) {
      throw "Communication error";
    });
  }

  function processLoadReloader() {
    findOriginalKey(RELOADER_FROM_BL).then(function(result) {
        processLoadingScript(RELOADER_FROM_BL[result], "Loading bootloader (step 1/4)").then(function(result) {
            powerCycle = true;
            stage = STAGE_UNDEFINED;
            $("#modalDisconnect").modal('show');
            timerId = setInterval(waitRemoved, SCAN_DELAY_MS);
        }).fail(function(e) {
         stage = STAGE_UNDEFINED;
         $("#koMessage").html("Error loading reloader");
         $("#modalEndKO").modal('show');      
      });
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Unknown personalization (load reloader)");
        $("#modalEndKO").modal('show');      
    });  
  }

  function processLoadBL() {
    findOriginalKey(BL_LOADER).then(function(result) {
        processLoadingScript(BL_LOADER[result], "Loading bootloader (step 2/4)").then(function(result) {
            powerCycle = true;
            stage = STAGE_UNDEFINED;
            $("#modalDisconnect").modal('show');
            timerId = setInterval(waitRemoved, SCAN_DELAY_MS);
        }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Error loading bootloader");
        $("#modalEndKO").modal('show');      
      });
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Unknown personalization (load bootloader)");
        $("#modalEndKO").modal('show');      
    });  
  }

  function processLoadOS() {
    osLoaded = false;
    findOriginalKey(OS_LOADER).then(function(result) {
        processLoadingScript(OS_LOADER[result], "Loading application (step 3/4)").then(function(result) {
            osLoaded = true;
            powerCycle = true;
            stage = STAGE_UNDEFINED;
            $("#modalDisconnect").modal('show');
            timerId = setInterval(waitRemoved, SCAN_DELAY_MS);
        }).fail(function(e) {
         stage = STAGE_UNDEFINED;
         $("#koMessage").html("Error loading application");
         $("#modalEndKO").modal('show');      
      });
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Unknown personalization (load application)");
        $("#modalEndKO").modal('show');      
    });  
  }

  function processInitOS() {
        processLoadingScript(INIT_01411, "Initializing application (step 4/4)", true).then(function(result) {
          stage = STAGE_UNDEFINED;
          osLoaded = false;
          $("#okMessage").html("Firmware update " + versionToString(CURRENT_OS) + " successful");
          $("#modalEndOK").modal('show');
        }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Error initializing application");
        $("#modalEndKO").modal('show');      
    });
  }

  function versionToString(version) {
    return ((version >> 16) & 0xff) + "." + ((version >> 8) & 0xff) + "." + (version & 0xff);
  }

  function processReloadBLConfirm() {
    $("#confirmMessage").html("Confirm update of firmware " + versionToString(lastVersion) + " to " + versionToString(CURRENT_OS));
    $("#modalConfirm").modal('show');
  }

  function processReloadBL() {
    var index;
    for (index=0; index<BL_RELOADER.length; index++) {
      if (lastVersion == BL_RELOADER[index][0]) {
        break;
      }
    }
    if (index == BL_RELOADER.length) {
      stage = STAGE_UNDEFINED;
      $("#koMessage").html("This firmware version is not supported");
      $("#modalEndKO").modal('show');
      return;      
    }
    processLoadingScript(BL_RELOADER[index][1], "Loading bootloader (step 2/4)").then(function(result) {
        powerCycle = true;
        stage = STAGE_UNDEFINED;
        $("#modalDisconnect").modal('show');
        timerId = setInterval(waitRemoved, SCAN_DELAY_MS);
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        if (lastCard.SW == 0x6985) {
          $("#koMessage").html("Error loading reloader. If the dongle is set up, make sure to erase the seed before updating the firmware");
        }
        else
        if (lastCard.SW == 0x6faa) {
          $("#koMessage").html("Error loading reloader. You might not have the right personalization on your card - make sure you're not using a pre-release or test card");          
        }
        else {
          $("#koMessage").html("Error loading reloader - status " + Convert.toHexShort(lastCard.SW));          
        }
        $("#modalEndKO").modal('show');      
    });
  }

  function processLoadingScript(apdus, title, ignoreSW, offset) {
    if (typeof offset == "undefined") {
      offset = 0;
    }
    if (offset == 0) {
      $("#currentOperation").html(title);      
      $("#modalStage").modal('show');      
    }
    var currentProgress = (offset * 100) / apdus.length;
    $("#stageBar").attr('aria-valuenow', currentProgress);
    $("#stageBar").css('width', currentProgress + '%');
    if (offset >= apdus.length) {
      extraTimeout = false;
      $("#modalStage").modal('hide');      
      return;
    }
    return lastCard.exchange_async(new ByteString(apdus[offset], HEX)).then(function(result) {
      if (ignoreSW || (lastCard.SW == 0x9000)) {
        if (extraTimeout) {
          deferred = Q.defer();
          setTimeout(function() {
            deferred.resolve(processLoadingScript(apdus, title, ignoreSW, offset + 1));
          }, PAUSE_TIMEOUT_MS);
          return deferred.promise;
        }
        else {
          return processLoadingScript(apdus, title, ignoreSW, offset + 1);
        }
      }
      else {
        extraTimeout = false;
        console.log("UNEXPECTED STATUS");
        console.log(lastCard.SW);
        $("#modalStage").modal('hide');      
        throw "Unexpected status " + lastCard.SW;
      }
    }).fail(function(e) {
      console.log("SEND FAIL");
      console.log(e);
      if (offset == apdus.length - 1) {
        console.log("Accepted fail");
        return processLoadingScript(apdus, title, ignoreSW, offset + 1);
      }
      extraTimeout = false;
      $("#modalStage").modal('hide');      
      throw "APDU sending fail " + e;
    });
  }

  function getVersion_async(forceBL) {
    var apdu;
    if ((lastMode == MODE_OS) && !forceBL) {
      apdu = new ByteString("E0C4000000", HEX);
    }
    else {
      apdu = new ByteString("F001000000", HEX);
    }
    return lastCard.exchange_async(apdu).then(function(result) {

      if ((lastMode == MODE_OS) && !forceBL) {        
        if (lastCard.SW == 0x9000) {
          return (result.byteAt(2) << 16) + (result.byteAt(3) << 8) + result.byteAt(4);
        }
        else 
        if ((lastCard.SW == 0x6d00) || (lastCard.SW == 0x6e00)) {
          // Not initialized yet
          return getVersion_async(true);
        }
        else {
          throw "Failed to get version - SW " + lastCard.SW;                    
        }
      }
      else {
        if (lastCard.SW == 0x9000) {
          return (result.byteAt(5) << 16) + (result.byteAt(6) << 8) + result.byteAt(7);
        }
        else
        if ((lastMode == MODE_OS) && ((lastCard.SW == 0x6d00) || (lastCard.SW == 0x6e00))) {
            // Unexpected - let's say it's 1.4.3
            return (1 << 16) + (4 << 8) + (3);
        }
        else {
          throw "Failed to get version - SW " + lastCard.SW;                    
        }
      }
    }).fail(function(e) {
      console.log("failed to get version");
      console.log(e);
      throw "Failed to get version";
    });
  }

  function processInitStageBootloader() {    
    console.log("processInitStageBootloader");
    lastVersion = undefined;
    getVersion_async().then(function(result) {      
      lastVersion = result;
      if (result == CURRENT_BL) {
        stage = STAGE_LOAD_OS;
        processStage();
      }
      else
      if (result == CURRENT_RELOADER) {
        stage = STAGE_LOAD_BL;
        processStage();
      }
      else {
        var SEND_RACE_BL = (1 << 16) + (3 << 8) + (11);                
        extraTimeout = (result < SEND_RACE_BL);
        stage = STAGE_LOAD_BL_RELOADER;
        processStage();
      }
    }).fail(function(e) {
        stage = STAGE_UNDEFINED;
        $("#koMessage").html("Error getting current version");
        $("#modalEndKO").modal('show');      
    });
  }

  function scanDongle() {
    console.log(factoryDongleOS);
    return factoryDongleOS.list_async().then(function(result) {
        
        console.log("os");
        console.log(result);
        if (result.length != 0) {
          lastMode = MODE_OS;
          lastCardTerminal = factoryDongleOS.getCardTerminal(result[0]);
          return result;
        }

        return factoryDongleBootloader.list_async().then(function(result) {

          console.log("bootloader");
          console.log(result);
          if (result.length != 0) {
            lastMode = MODE_BOOTLOADER;
            lastCardTerminal = factoryDongleBootloader.getCardTerminal(result[0]);
            return result;
          }
        });
    });
  }

  function waitInserted() {
    if (typeof lastCard != "undefined") {
      lastCard.disconnect();
      lastCard = undefined;
    }
    scanDongle().then(function(result) {
      if (typeof result != "undefined") {
        clearInterval(timerId);
        $("#modalConnect").modal('hide');
        lastCardTerminal.getCard_async().then(function(result) {
            lastCard = result;
            processStage();
        }).fail(function(e) {
         stage = STAGE_UNDEFINED;
         $("#koMessage").html("Error acquiring dongle communication");
         $("#modalEndKO").modal('show');      
        });
      }
    });
  }

  function waitRemoved() {
    if (typeof lastCard != "undefined") {
      lastCard.disconnect();
      lastCard = undefined;
    }    
    scanDongle().then(function(result) {
      if (typeof result == "undefined") {
        clearInterval(timerId);
        $("#modalDisconnect").modal('hide');
        if (!powerCycle) {
          processStage();
        }
        else {
          powerCycle = false;
          $("#modalConnect").modal('show');
          timerId = setInterval(waitInserted, SCAN_DELAY_MS);      
        }
      }
    });
  }


  $("#startButton").click(function() {    
    $("#modalConnect").modal('show');
    timerId = setInterval(waitInserted, SCAN_DELAY_MS);
  });

  $("#reloadButton").click(function() {    
    location.reload();
  });

  $("#confirmButton").click(function() {
    confirmBeta = false;
    $("#modalConfirm").modal('hide');
    processReloadBL();
  });

  $("#cancelButton").click(function() {
    $("#modalConfirm").modal('hide');
    if (confirmBeta) {
      confirmBeta = false;
      stage = STAGE_INIT_OS;
      processStage();
    }
  });
