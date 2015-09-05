#!/bin/bash
if [ $1 = 'mainnet' ];
then
	if [ -f static/wallet/config_mainnet.js ];
	then
		cp static/wallet/config_mainnet.js static/wallet/config.js
		cp manifest_mainnet.json manifest.json
	fi
fi

if [ $1 = 'testnet' ];
then
	cp static/wallet/config.js static/wallet/config_mainnet.js
	cp static/wallet/config_testnet.js static/wallet/config.js
	cp manifest.json manifest_mainnet.json
	cp manifest_testnet.json manifest.json
fi

