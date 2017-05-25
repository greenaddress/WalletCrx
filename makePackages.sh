#!/bin/bash

set -e

if [ "$(uname)" == "Darwin" ]; then
    if ! which gsed; then
        echo gsed missing
        exit 1
    fi
    SED=gsed
else
    SED=sed
fi

function build_env {
    ENV_ZIP=${1}-${BASE_ZIP}
    echo "Packaging HEAD ${ENV_ZIP}"
    cp ${BASE_ZIP} ${ENV_ZIP}
    sed -e "s|TEMPLATE_URL|$2|g" -e "s/TEMPLATE_NAME/$3/g" manifest_template.json > manifest.json
    sed -e "s/TEMPLATE_COIN/$4/g" network_template.js > static/wallet/network.js
    sed -e "s/TEMPLATE_CHAINCODE/$5/g" -e "s/TEMPLATE_PUBKEY/$6/g" -e "s|TEMPLATE_WS|$7|g" \
        -e "s|TEMPLATE_ROOT|$8|g" config_template.js > static/wallet/config.js
    echo "var deposit_confs_required = $9;" >> static/wallet/config.js
    zip -q -9 -r ${ENV_ZIP} static/wallet/{network,config}.js manifest.json
}

epochTime=`date +%s`

MAINNET_CHAINCODE=e9a563d68686999af372a33157209c6860fe79197a4dafd9ec1dbaa49523351d
MAINNET_PUBKEY=0322c5f5c9c4b9d1c3e22ca995e200d724c2d7d8b6953f7b38fddf9296053c961f
TESTNET_CHAINCODE=b60befcc619bb1c212732770fe181f2f1aa824ab89f8aab49f2e13e3a56f0f04
TESTNET_PUBKEY=036307e560072ed6ce0aa5465534fb5c258a2ccfbc257f369e8e7a181b16d897b3


BASE_ZIP=WalletCrx_$epochTime.zip

# prepare base release valid for all envs
./prepare.sh "$@"
git archive -9 -o ${BASE_ZIP} HEAD
LANGS="de en es fr it pl ru uk sv nl el th"
for LANG in $LANGS; do
    zip -q -9 -r ${BASE_ZIP} $LANG
done
zip -q -9 -r ${BASE_ZIP} static/{css,fonts,img,js,sound}
mkdir -p static/wallet

# create separate zips for each env
build_env mainnet https://greenaddress.it "GreenAddress" bitcoin ${MAINNET_CHAINCODE} ${MAINNET_PUBKEY} wss://prodwss.greenaddress.it https://greenaddress.it 1
build_env testnet https://test.greenaddress.it "GreenAddress Testnet" testnet ${TESTNET_CHAINCODE} ${TESTNET_PUBKEY} wss://testwss.greenaddress.it https://test.greenaddress.it 0

# uncomment these for dev/testing

#build_env liveregtest https://regtestwss.greenaddress.it "GreenAddress Live Regtest" testnet ${TESTNET_CHAINCODE} ${TESTNET_PUBKEY} wss://regtestwss.greenaddress.it https://regtestwss.greenaddress.it 0
#build_env regtest http://localhost:8080 "GreenAddress Local Regtest" testnet ${TESTNET_CHAINCODE} ${TESTNET_PUBKEY} ws://localhost:8080 http://localhost:9908 0
rm ${BASE_ZIP}
