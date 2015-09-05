#!/bin/bash

if [ $# -eq 0 ]; then
	echo "No arguments provided."
	echo "Usage:"
	echo "./prepare.sh mainnet"
	echo "./prepare.sh testnet"
	exit 1
fi

if [ $1 = 'mainnet' ];
then
	echo "preparing for mainnet"
	if [ -f static/wallet/config_mainnet.js ];
	then
		cp static/wallet/config_mainnet.js static/wallet/config.js
		cp manifest_mainnet.json manifest.json
	fi
fi

if [ $1 = 'testnet' ];
then
	echo "preparing for testnet"
	if [ ! -f static/wallet/config_mainnet.js ];
	then
		cp static/wallet/config.js static/wallet/config_mainnet.js
		cp manifest.json manifest_mainnet.json
	fi
	cp static/wallet/config_testnet.js static/wallet/config.js
	cp manifest_testnet.json manifest.json
fi

