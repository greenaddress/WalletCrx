#!/bin/bash

epochTime=`date +%s`

./prepare.sh testnet
stashName=`git stash create`;
if [ -z "$stashName" ]
then
        echo "Packaging HEAD"
        git archive -o ../WalletCrxTestNet_$epochTime.zip HEAD
else
        echo "Packaging HEAD + localchanges"
        git archive -o ../WalletCrxTestNet_$epochTime.zip $stashName
fi

./prepare.sh -s mainnet
stashName=`git stash create`;
if [ -z "$stashName" ]
then
        echo "Packaging HEAD"
        git archive -o ../WalletCrxMainNet_$epochTime.zip HEAD
else
        echo "Packaging HEAD + localchanges"
        git archive -o ../WalletCrxMainNet_$epochTime.zip $stashName
fi
