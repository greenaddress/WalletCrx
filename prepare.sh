#!/bin/bash

set -e

if [ "$(uname)" == "Darwin" ]; then
    SHASUM="shasum -a 256"
else
    SHASUM="sha256sum"
fi

if [ "x$1" == "xdev" ]; then
    WEBFILES_REPO="https://github.com/greenaddress/GreenAddressWebFiles.git"
    WEBFILES_BRANCH=js_only_deprecated
    if [ \! -e webfiles ]; then
        git clone --depth 1 $WEBFILES_REPO -b $WEBFILES_BRANCH webfiles
    fi
else
    SHA256SUM_WEB_FILES=10197b7c28b0f5c6028fe3f8529c73043f7023eb859901b99ddc60a78b88baf2
    WEB_FILES_TAG=jsonly-v0.1.00
    curl -sL -o webfiles.tar.gz https://github.com/greenaddress/GreenAddressWebFiles/archive/${WEB_FILES_TAG}.tar.gz
    echo "${SHA256SUM_WEB_FILES}  webfiles.tar.gz" | $SHASUM --check
    tar -zxf webfiles.tar.gz
    mv GreenAddressWebFiles-${WEB_FILES_TAG} webfiles
    rm webfiles.tar.gz
fi

if [ \! -e venv ]; then
    command -v python2 >/dev/null &&
        python2 -m virtualenv venv ||
        python -m virtualenv venv
    venv/bin/pip install -r webfiles/requirements.txt
fi

cd webfiles

# 1. Build *.js:
if [ \! -e node_modules ]; then
    npm i
fi

npm run build
npm run test

# 2. Render *.html:
../venv/bin/python render_templates.py ..


# 3. Copy *.js:
rm -rf ../static
cp -r build/static ../static
rm -rf ../static/fonts/*.svg  # .woff are enough for crx
rm -rf ../static/sound/*.wav  # .mp3 are enough for crx
rm ../static/js/cdv-plugin-fb-connect.js  # cordova only
rm ../static/js/{greenaddress,instant}.js  # web only

# 4. remove venv & webfiles && node_modules
cd ../

if [ "x$1" == "x" ]; then
    rm -fr venv webfiles
fi
