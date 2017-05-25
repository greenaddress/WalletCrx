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

if [ -f /.dockerenv ]; then
    stashName=`git -c user.name='Builder' -c user.email='builder@email.org' stash create`
else
    stashName=`git stash create`
fi

function build_env() {
    ./prepare.sh -s -b master $1

    if [ -z "$stashName" ]
    then
        echo "Packaging HEAD $1"
        git archive -o WalletCrx$1_$epochTime.zip HEAD
        add_static WalletCrx$1_$epochTime.zip
    else
        echo "Packaging HEAD + localchanges $1"
        git archive -o WalletCrx$1_$epochTime.zip $stashName
        add_static WalletCrx$1_$epochTime.zip
    fi
}

build_env mainnet
build_env testnet
build_env liveregtest
