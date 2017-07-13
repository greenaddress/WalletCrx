Build status: [![Build Status](https://travis-ci.org/greenaddress/WalletCrx.png?branch=master)](https://travis-ci.org/greenaddress/WalletCrx)

## How to build

For TESTNET run ./prepare.sh testnet

For MAINNET run ./prepare.sh mainnet

For LIVEREGTEST run ./prepare.sh liveregtest

For REGTEST run ./prepare.sh regtest

To create a Chrome store zip for mainnet, testnet and liveregtest run ./makePackages.sh

Prepares the Chrome extension. Requires npm and Python 2.x with virtualenv, for an example with Debian Stretch see contrib/stretch_deps.sh

Once built, you can just load the directory in Chrome extentions by enabling the developer mode.

## Pull Requests

Before making a Pull Request for WalletCrx check if what you want to modify is present in https://github.com/greenaddress/GreenAddressWebFiles - if it is then you should do the PR there.
