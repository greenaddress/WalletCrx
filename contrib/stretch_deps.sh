#!/usr/bin/env bash
set -e

sed -i 's/deb.debian.org/httpredir.debian.org/g' /etc/apt/sources.list
apt-get -yqq update && apt-get -yqq upgrade
apt-get -yqq install zip git curl python-{virtualenv,pip}
curl -sL https://deb.nodesource.com/setup_8.x | bash -
apt-get -yqq update && apt-get -yqq install nodejs

apt-get remove --purge curl -yqq
apt-get -yqq autoremove && apt-get -yqq clean
rm -rf /var/lib/apt/lists/* /var/cache/* /tmp/* /usr/share/locale/* /usr/share/man /usr/share/doc /lib/xtables/libip6*
