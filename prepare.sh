#!/bin/bash

set -e

WEBFILES_REPO="https://github.com/greenaddress/GreenAddressWebFiles.git"
WEBFILES_BRANCH=$(git describe --exact-match --all)

case "$WEBFILES_BRANCH" in
heads/*)
    WEBFILES_BRANCH=${WEBFILES_BRANCH#heads/}
    ;;
tags/*)
    WEBFILES_BRANCH=crx-${WEBFILES_BRANCH#tags/}
    ;;
*)
    WEBFILES_BRANCH=crx-$WEBFILES_BRANCH
    ;;
esac

UNKNOWN_OPTION=""

while [ $# -gt 0 ]; do
key="$1"

case $key in
    -h|--help)
    HELP=1
    ;;
    -r|--webfiles-repo)
    WEBFILES_REPO="$2"
    shift # past argument
    ;;
    # There used to be a typo so support both spellings
    -b|--webfile-branch|--webfiles-branch)
    WEBFILES_BRANCH="$2"
    shift # past argument
    ;;
    *)
    if [ $# -gt 1 ]; then
        UNKNOWN_OPTION="$1"
        break
    fi
    ;;
esac
if [ $# -gt 1 ]; then
    shift # past argument or value
else
    break # last (positional) argument
fi
done

if [ "$UNKNOWN_OPTION" != "" ] || [ "$HELP" == "1" ];
then
    if [ "$UNKNOWN_OPTION" != "" ]; then
        echo "Unknown option: " $UNKNOWN_OPTION
    elif [ "$HELP" != 1 ]; then
        echo "Invalid or no arguments provided."
    fi
    cat <<EOF
Usage: ./prepare.sh [-h] [--webfiles-repo WEBFILES_REPO]
                         [--webfiles-branch WEBFILES_BRANCH]

Prepares the Chrome extension. Requires npm and Python 2.x with virtualenv.

optional arguments:
  -h, --help                       show this help message and exit
  --webfiles-repo WEBFILES_REPO, -r WEBFILES_REPO
                                   Optional non-default git URL to clone web
                                   files from. (Default:
                                     $WEBFILES_REPO)
  --webfiles-branch WEBFILES_BRANCH, -b WEBFILES_BRANCH
                                   Optional non-default git URL to clone web
                                   files from. (Default: $WEBFILES_BRANCH)
EOF
    exit 1
fi

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
