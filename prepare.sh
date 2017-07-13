#!/bin/bash

set -e

WEBFILES_REPO="https://github.com/greenaddress/GreenAddressWebFiles.git"
WEBFILES_BRANCH=js_only_deprecated

if [ \! -e webfiles ]; then
    git clone --depth 1 $WEBFILES_REPO -b $WEBFILES_BRANCH webfiles
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

# 2. Render *.html:
../venv/bin/python render_templates.py ..


# 3. Copy *.js:
rm -rf ../static
cp -r build/static ../static
rm -rf ../static/fonts/*.svg  # .woff are enough for crx
rm -rf ../static/sound/*.wav  # .mp3 are enough for crx
rm ../static/js/cdv-plugin-fb-connect.js  # cordova only
rm ../static/js/{greenaddress,instant}.js  # web only
