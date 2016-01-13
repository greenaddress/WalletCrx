#!/bin/bash

if [ $# -eq 0 ] || [ ! $1 = 'mainnet' ] && [ ! $1 = 'testnet' ] && [ ! $1 = 'regtest' ];
then
        echo "Invalid or no arguments provided."
        echo "Usage:"
        echo "./prepare.sh mainnet"
        echo "./prepare.sh testnet"
        echo "./prepare.sh regtest"
        exit 1
fi

if [ $1 = 'mainnet' ];
then
        echo "preparing for mainnet"
        if [ -f static/wallet/config_mainnet.js ];
        then
                cp static/wallet/config_mainnet.js static/wallet/config.js
                cp static/wallet/network_mainnet.js static/wallet/network.js
                cp manifest_mainnet.json manifest.json
        fi
        exit 0
fi

if [ ! -f static/wallet/config_mainnet.js ];
then
        cp static/wallet/config.js static/wallet/config_mainnet.js
        cp static/wallet/network.js static/wallet/network_mainnet.js
        cp manifest.json manifest_mainnet.json
fi

echo "preparing for $1"
cp static/wallet/config_$1.js static/wallet/config.js
cp static/wallet/network_$1.js static/wallet/network.js
cp manifest_$1.json manifest.json
exit 0
