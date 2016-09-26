#!/bin/bash

set -e

WEBFILES_REPO="https://github.com/greenaddress/GreenAddressWebFiles.git"
WEBFILES_BRANCH=$(git symbolic-ref HEAD)
WEBFILES_BRANCH=${WEBFILES_BRANCH##refs/heads/}

while [ $# -gt 0 ]; do
key="$1"

case $key in
    -h|--help)
    HELP=1
    ;;
    -s|--silent)
    SILENT=1
    ;;
    -r|--webfiles-repo)
    WEBFILES_REPO="$2"
    shift # past argument
    ;;
    -b|--webfile-branch)
    WEBFILES_BRANCH="$2"
    shift # past argument
    ;;
    *)
        # unknown option
    ;;
esac
if [ $# -gt 1 ]; then
    shift # past argument or value
else
    break # last (positional) argument
fi
done

if [ "$HELP" == "1" ] || [ $# -eq 0 ] || ( [ ! $1 = 'mainnet' ] && [ ! $1 = 'testnet' ] && [ ! $1 = 'regtest' ] );
then
    if [ "$HELP" != "1" ]; then
        echo "Invalid or no arguments provided."
    fi
    cat <<EOF
Usage: ./prepare.sh [-h] [--webfiles-repo WEBFILES_REPO]
                         [--webfiles-branch WEBFILES_BRANCH]
                         [--silent]
                         (mainnet | testnet | regtest)

Prepares the Chrome extension. Requires npm and Python 2.x with virtualenv.

positional arguments:
  (mainnet | testnet | regtest)    The Bitcoin network to use

optional arguments:
  -h, --help                       show this help message and exit
  --webfiles-repo WEBFILES_REPO, -r WEBFILES_REPO
                                   Optional non-default git URL to clone web
                                   files from. (Default:
                                     $WEBFILES_REPO)
  --webfiles-branch WEBFILES_BRANCH, -b WEBFILES_BRANCH
                                   Optional non-default git URL to clone web
                                   files from. (Default: $WEBFILES_BRANCH)
  --silent, -s                     Silently ignore already existing webfiles
                                   directory. When not passed, the script will
                                   ask if it should remove it.
EOF
    exit 1
fi

if [ -e webfiles ] && [ "$SILENT" != "1" ]; then
    echo -n "webfiles exists. do you want to remove it? (y/n) "
    read REMOVE
    if [ "$REMOVE" == "y" ]; then
        rm -rf webfiles
    else
        echo "Exiting. Pass the --silent option if you want to ignore existing webfiles."
        exit 1
    fi
fi

if [ \! -e webfiles ]; then
    git clone $WEBFILES_REPO -b $WEBFILES_BRANCH webfiles
fi

if [ \! -e venv ]; then
    virtualenv venv
    venv/bin/pip install jinja2
fi

cd webfiles

# 1. Build *.js:
npm i
npm run build
rm -rf node_modules

# 2. Render *.html:
../venv/bin/python render_templates.py ..


TMPDIR=`mktemp -d`
# 3. Copy *.js:
cp ../static/wallet/config*.js $TMPDIR
cp ../static/wallet/network*.js $TMPDIR
rm -rf ../static
cp -r build/static ../static
rm -rf ../static/fonts/*.svg  # .woff are enough for crx
rm -rf ../static/sound/*.wav  # .mp3 are enough for crx
rm ../static/js/cdv-plugin-fb-connect.js  # cordova only
rm ../static/js/facebook-js-sdk.js  # cordova only
rm ../static/js/{greenaddress,instant}.js  # web only
mkdir -p ../static/wallet >/dev/null
mv $TMPDIR/config*.js ../static/wallet/
mv $TMPDIR/network*.js ../static/wallet/
rm -rf $TMPDIR

cd ..

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
