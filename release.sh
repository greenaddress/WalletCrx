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

if [ $# -eq 0 ];
then
    echo "Invalid or no arguments provided."
    cat <<EOF
Usage: ./prepare.sh VERSION

Prepares a new Chrome app release.

positional arguments:
  VERSION                 Version number to release
EOF
    exit 1
fi

if [ ! -z "`git status -s | grep -v ^??`" ]; then  ## ?? = untracked files
    echo "You have uncommited changes. Please revert/stash them."
    exit 1
fi

$SED -i 's/"version": "[0-9.]\+"/"version": "'$1'"/' manifest.json
git commit -am"bump version for release $2"

$SED -i 's|WEBFILES_BRANCH=${WEBFILES_BRANCH##refs/heads/}|WEBFILES_BRANCH="'crx-v$1'"|' prepare.sh

git commit -am"update prepare.sh for release $2"
git tag v$1
git reset --hard HEAD^  # revert the release.sh change for the main branch

cd webfiles
git tag crx-v$1
cd ..

echo "Update and tagging done. Now please push this repo and webfiles/ with --tags."
