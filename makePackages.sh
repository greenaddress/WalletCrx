#!/bin/bash

set -e

function add_static {
        LANGS="de en es fr it pl ru uk sv nl el th"
        for LANG in $LANGS; do
                zip -r $1 $LANG
        done
        zip -r $1 static/{css,fonts,img,js,sound}
}

epochTime=`date +%s`

./prepare.sh -s testnet
stashName=`git stash create`;
if [ -z "$stashName" ]
then
        echo "Packaging HEAD"
        git archive -o ../WalletCrxTestNet_$epochTime.zip HEAD
        add_static ../WalletCrxTestNet_$epochTime.zip
else
        echo "Packaging HEAD + localchanges"
        git archive -o ../WalletCrxTestNet_$epochTime.zip $stashName
        add_static ../WalletCrxTestNet_$epochTime.zip
fi

./prepare.sh -s mainnet
stashName=`git stash create`;
if [ -z "$stashName" ]
then
        echo "Packaging HEAD"
        git archive -o ../WalletCrxMainNet_$epochTime.zip HEAD
        add_static ../WalletCrxMainNet_$epochTime.zip
else
        echo "Packaging HEAD + localchanges"
        git archive -o ../WalletCrxMainNet_$epochTime.zip $stashName
        add_static ../WalletCrxMainNet_$epochTime.zip
fi
