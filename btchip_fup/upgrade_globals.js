

      var RELOADER_FROM_BL = [
        BL_RELOADER_0143,
        BL_RELOADER_0144,
        BL_RELOADER_0146,
        BL_RELOADER_0147,
        BL_RELOADER_0148,
        BL_RELOADER_0149,
        BL_RELOADER_01410,
	BL_RELOADER_01411
      ];

      var BL_LOADER = [
        BL_LOADER_0143,
        BL_LOADER_0144,
        BL_LOADER_0146,
        BL_LOADER_0147,
        BL_LOADER_0148,
        BL_LOADER_0149,
        BL_LOADER_01410,
	BL_LOADER_01411
      ];

      var OS_LOADER = [
        LOADER_0143,
        LOADER_0144,
        LOADER_0146,
        LOADER_0147,
        LOADER_0148,
        LOADER_0149,
        LOADER_01410,
	LOADER_01411
      ];

      var BL_RELOADER = [
        [ (1 << 16) + (4 << 8) + (3), RELOADER_0143],
        [ (1 << 16) + (4 << 8) + (4), RELOADER_0144],
        [ (1 << 16) + (4 << 8) + (5), RELOADER_0145],
        [ (1 << 16) + (4 << 8) + (6), RELOADER_0146],
        [ (1 << 16) + (4 << 8) + (7), RELOADER_0147],
        [ (1 << 16) + (4 << 8) + (8), RELOADER_0148],
        [ (1 << 16) + (4 << 8) + (9), RELOADER_0149],
        [ (1 << 16) + (4 << 8) + (10), RELOADER_01410],
	[ (1 << 16) + (4 << 8) + (11), RELOADER_01411]
      ];

    Q.longStackSupport = true;

    $("#modalConfirm").modal( { show:false, backdrop: "static", keyboard:false });
    $("#modalConnect").modal( { show:false, backdrop: "static", keyboard:false });
    $("#modalDisconnect").modal( { show:false, backdrop: "static", keyboard:false });
    $("#modalStage").modal( { show:false, backdrop: "static", keyboard:false });
    $("#modalEndOK").modal( { show:false, backdrop: true, keyboard:true });
    $("#modalEndKO").modal( { show:false, backdrop: true, keyboard:true });

    factoryDongleBootloader = new ChromeapiPlugupCardTerminalFactory(0x1808);
    factoryDongleOS = new ChromeapiPlugupCardTerminalFactory(0x1b7c);

    var stage = STAGE_UNDEFINED;

    if (BETA) {
      $("#beta").removeClass("hidden");
    }
