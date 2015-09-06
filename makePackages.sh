#!/bin/bash

epochTime=`date +%s`

./prepare.sh testnet
stashName=`git stash create`;
git archive -o ../WalletCrxTestNet_$epochTime.zip $stashName

./prepare.sh mainnet
stashName=`git stash create`;
git archive -o ../WalletCrxMainNet_$epochTime.zip $stashName
