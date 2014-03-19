angular.module('greenWalletSettingsControllers',
    ['greenWalletServices', 'greenWalletSettingsDirectives'])
.controller('TwoFactorSetupController', ['$scope', '$modal', 'notices', 'focus', 'tx_sender', 'wallets', 'gaEvent',
        function TwoFactorSetupController($scope, $modal, notices, focus, tx_sender, wallets, gaEvent) {
    if (!wallets.requireWallet($scope, true)) return;  // dontredirect=true because this cocntroller is reused in signup
    var twofactor_state = $scope.twofactor_state = {
        twofactor_type: 'email'
    }
    var update_wallet = function() {
        wallets.getTwoFacConfig($scope, true).then(function(data) {
            if (data.gauth) {
                twofactor_state.gauth_confirmed = true;
            } else {
                twofactor_state.google_secret_url = data.gauth_url;
                twofactor_state.google_secret_key = data.gauth_url.split('=')[1];
            }
            $scope.wallet.twofac_email_confirmed = twofactor_state.twofac_email_confirmed = data.email;
            twofactor_state.twofac_sms_confirmed = data.sms;
        }, function(err) {
            notices.makeNotice('error', 'Error fetching two factor authentication configuration: ' + err.desc);
            twofactor_state.twofactor_type = 'error';
        });
    };
    update_wallet();
    $scope.gauth_qr_modal = function() {
        gaEvent('Wallet', 'GoogleAuthQRModal');
        $modal.open({
            templateUrl: '/'+LANG+'/wallet/partials/wallet_modal_gauth_qr.html',
            scope: $scope
        });
    };
    $scope.show_gauth = function() {
        gaEvent('Wallet', 'GoogleAuth2FATabClicked');
        twofactor_state.twofactor_type = 'gauth';
    };
    $scope.show_email_auth = function() {
        gaEvent('Wallet', 'Email2FATabClicked');
        twofactor_state.twofactor_type = 'email';
    };
    $scope.show_sms_auth = function() {
        gaEvent('Wallet', 'SMS2FATabClicked');
        twofactor_state.twofactor_type = 'sms';
    };
    var modal;
    $scope.disable_2fa_modal = function() {
        if (twofactor_state.twofactor_type == 'email') {
            tx_sender.call('http://greenaddressit.com/twofactor/request_email').catch(function(err) {
                notices.makeNotice('error', err.desc);
            });
        }
        if (twofactor_state.twofactor_type == 'sms') {
            tx_sender.call('http://greenaddressit.com/twofactor/request_sms').catch(function(err) {
                notices.makeNotice('error', err.desc);
            });
        }
        modal = $modal.open({
            templateUrl: '/'+LANG+'/wallet/partials/wallet_modal_disable_2fa.html',
            scope: $scope
        });
        modal.opened.then(function() { focus("disableTwoFactorModal"); });
        modal.result.catch(function() {
            $scope.disable_2fa_error = '';
        });
    };
    $scope.enable_gauth = function() {
        notices.setLoadingText("Validating code");
        tx_sender.call('http://greenaddressit.com/twofactor/enable_gauth', twofactor_state.gauth_code).then(
            function() {
                gaEvent('Wallet', 'EnableGauth2FASuccessful');
                notices.makeNotice('success', 'Enabled Google Authenticator');
                twofactor_state.gauth_code = '';
                twofactor_state.gauth_confirmed = true;
                update_wallet();
            }, function(err) {
                gaEvent('Wallet', 'EnableGauth2FAFailed', err.desc);
                notices.makeNotice('error', err.desc);
            });
    };
    $scope.disable_2fa = function() {
        notices.setLoadingText("Validating code");
        if (twofactor_state.twofactor_type == 'gauth') {
            tx_sender.call('http://greenaddressit.com/twofactor/disable_gauth', twofactor_state.disable_2fa_code).then(
                function() {
                    gaEvent('Wallet', 'DisableGauth2FASuccessful');
                    twofactor_state.disable_2fa_code = '';
                    notices.makeNotice('success', 'Disabled Google Authenticator');
                    twofactor_state.gauth_confirmed = false;
                    modal.close();
                    update_wallet();  // new secret required for re-enabling
                }, function(err) {
                    gaEvent('Wallet', 'DisableGauth2FAFailed', err.desc);
                    $scope.disable_2fa_error = err.desc;
                })
        } else if (twofactor_state.twofactor_type == 'email') {
            tx_sender.call('http://greenaddressit.com/twofactor/disable_email', twofactor_state.disable_2fa_code).then(
                function() {
                    gaEvent('Wallet', 'DisableEmail2FASuccessful');
                    twofactor_state.disable_2fa_code = '';
                    notices.makeNotice('success', 'Disabled email two factor authentication');
                    twofactor_state.twofac_email_confirmed = false;
                    twofactor_state.email_set = false;
                    modal.close();
                    update_wallet();
                }, function(err) {
                    gaEvent('Wallet', 'DisableEmail2FAFailed', err.desc);
                    $scope.disable_2fa_error = err.desc;
                })
        } else if (twofactor_state.twofactor_type == 'sms') {
            tx_sender.call('http://greenaddressit.com/twofactor/disable_sms', twofactor_state.disable_2fa_code).then(
                function() {
                    gaEvent('Wallet', 'DisableSMS2FASuccessful');
                    twofactor_state.disable_2fa_code = '';
                    notices.makeNotice('success', 'Disabled SMS two factor authentication');
                    twofactor_state.twofac_sms_confirmed = false;
                    twofactor_state.sms_set = false;
                    modal.close();
                    update_wallet();
                }, function(err) {
                    gaEvent('Wallet', 'DisableSMS2FAFailed', err.desc);
                    $scope.disable_2fa_error = err.desc;
                })
        }
    };
    $scope.start_enabling_email = function() {
        if (twofactor_state.enabling_email) return;
        twofactor_state.enabling_email = true;
        tx_sender.call('http://greenaddressit.com/twofactor/init_enable_email', twofactor_state.new_twofac_email).then(
            function() {
                gaEvent('Wallet', 'StartEnablingEmail2FASuccessful');
                twofactor_state.enabling_email = false;
                twofactor_state.email_set = true;
            }, function(err) {
                gaEvent('Wallet', 'StartEnablingEmail2FAFailed', err.desc);
                twofactor_state.enabling_email = false;
                notices.makeNotice('error', err.desc);
            })
    };
    $scope.cancel_twofac_email = function() {
        twofactor_state.email_set = false;
    };
    $scope.enable_twofac_email = function() {
        notices.setLoadingText("Validating code");
        tx_sender.call('http://greenaddressit.com/twofactor/enable_email', twofactor_state.twofac_email_code).then(
            function() {
                gaEvent('Wallet', 'EnableEmail2FASuccessful');
                notices.makeNotice('success', 'Enabled email two factor authentication');
                twofactor_state.twofac_email_code = '';
                twofactor_state.twofac_email_confirmed = true;
                update_wallet();
            }, function(err) {
                gaEvent('Wallet', 'EnableEmail2FAFailed', err.desc);
                notices.makeNotice('error', err.desc);
            });
    };
    $scope.start_enabling_sms = function() {
        if (twofactor_state.enabling_sms) return;
        twofactor_state.enabling_sms = true;
        tx_sender.call('http://greenaddressit.com/twofactor/init_enable_sms', twofactor_state.new_twofac_sms).then(
            function() {
                gaEvent('Wallet', 'StartEnablingSMS2FASuccessful');
                twofactor_state.enabling_sms = false;
                twofactor_state.sms_set = true;
            }, function(err) {
                gaEvent('Wallet', 'StartEnablingSMS2FAFailed', err.desc);
                twofactor_state.enabling_sms = false;
                notices.makeNotice('error', err.desc);
            })
    };
    $scope.cancel_twofac_sms = function() {
        twofactor_state.sms_set = false;
    };
    $scope.enable_twofac_sms = function() {
        notices.setLoadingText("Validating code");
        tx_sender.call('http://greenaddressit.com/twofactor/enable_sms', twofactor_state.twofac_sms_code).then(
            function() {
                gaEvent('Wallet', 'EnableSMS2FASuccessful');
                notices.makeNotice('success', 'Enabled SMS two factor authentication');
                twofactor_state.twofac_sms_code = '';
                twofactor_state.twofac_sms_confirmed = true;
                update_wallet();
            }, function(err) {
                gaEvent('Wallet', 'EnableSMS2FAFailed', err.desc);
                notices.makeNotice('error', err.desc);
            });
    };
}]).controller('SettingsController', ['$scope', 'wallets', 'tx_sender', 'notices', '$modal', 'gaEvent', 'storage',
        function SettingsController($scope, wallets, tx_sender, notices, $modal, gaEvent, storage) {
    if (!wallets.requireWallet($scope)) return;
    var exchanges = $scope.exchanges = {
        BITSTAMP: 'Bitstamp',   
        LOCALBTC: 'LocalBitcoins',
        BTCAVG: 'BitcoinAverage'
    };
    var userfriendly_blocks = function(num) {
        return gettext("(about %s days: 1 day ≈ 144 blocks)").replace("%s", Math.round(num/144));
    }
    var settings = $scope.settings = {
        noLocalStorage: storage.noLocalStorage,
        currency: $scope.wallet.fiat_currency,
        exchange: $scope.wallet.fiat_exchange,
        notifications: angular.copy($scope.wallet.appearance.notifications_settings || {}),
        updating_display_fiat: false,
        nlocktime: {
            blocks: $scope.wallet.nlocktime_blocks,
            blocks_new: $scope.wallet.nlocktime_blocks,
            update: function() {
                this.updating_nlocktime_blocks = true;
                var that = this;
                tx_sender.call('http://greenaddressit.com/login/set_nlocktime', that.blocks_new).then(function() {
                    $scope.wallet.nlocktime_blocks = that.blocks = that.blocks_new;
                    notices.makeNotice('success', gettext('nLockTime settings updated successfully'));
                }, function(err) {
                    notices.makeNotice('error', err.desc);
                }).finally(function() { that.updating_nlocktime_blocks = false; });
            }
        },
        nfcmodal: function() {
            gaEvent('Wallet', 'SettingsNfcModal');
            $modal.open({
                templateUrl: '/'+LANG+'/wallet/partials/signup_nfc_modal.html',
                scope: $scope,
                controller: 'NFCController'
            });
        },
        expiring_soon_modal: function() {
            gaEvent('Wallet', 'ExpiringSoonModal');
            tx_sender.call('http://greenaddressit.com/txs/upcoming_nlocktime').then(function(data) {
                $scope.soon_nlocktimes = data;
                $scope.soon_nlocktimes.estimate_days = function(nlocktime_at) {
                    var remaining_blocks = nlocktime_at - this.cur_block;
                    if (remaining_blocks <= 0) return gettext('Already expired');
                    else return gettext('in about %s days').replace('%s', Math.round(remaining_blocks/144));
                };
                $modal.open({
                    templateUrl: '/'+LANG+'/wallet/partials/wallet_modal_expiring_soon.html',
                    scope: $scope
                });  
            }, function(err) {
                notices.makeNotice('error', err.desc);
            });
        }
    };
    tx_sender.call('http://greenaddressit.com/login/available_currencies').then(function(data) {
        $scope.settings.available_currencies = data;
    });
    $scope.$watch('settings.nlocktime.blocks_new', function(newValue, oldValue) {
        settings.nlocktime.blocks_userfriendly = userfriendly_blocks(settings.nlocktime.blocks_new);
    })
    if (!settings.currency) {
        $scope.$on('first_balance_updated', function() { settings.currency = $scope.wallet.fiat_currency; })
    }
    $scope.$watch('settings.currency', function(newValue, oldValue) {
        if (oldValue !== newValue && !settings.updating_currency && newValue != $scope.wallet.fiat_currency) {
            settings.currency = oldValue;
            settings.updating_currency = true;
            tx_sender.call('http://greenaddressit.com/login/set_currency', newValue).then(function() {
                gaEvent('Wallet', 'CurrencyChanged', newValue);
                $scope.wallet.fiat_currency = newValue;
                $scope.wallet.update_balance();
                settings.currency = newValue;
                settings.updating_currency = false;
            }).catch(function(err) {
                settings.updating_currency = false;
                if (err.uri == "http://greenaddressit.com/error#exchangecurrencynotsupported") {
                    gaEvent('Wallet', 'CurrencyNotSupportedByExchange');
                    notices.makeNotice('error', gettext('{1} supports only the following currencies: {2}')
                        .replace('{1}', exchanges[settings.exchange])
                        .replace('{2}', err.detail.supported));
                } else {
                    gaEvent('Wallet', 'CurrencyChangeFailed', err.desc);
                    notices.makeNotice('error', err.desc);
                }
            });
        }
    });
    $scope.$watch('settings.exchange', function(newValue, oldValue) {
        if (oldValue !== newValue && !settings.updating_exchange && newValue != $scope.wallet.fiat_exchange) {
            settings.exchange = oldValue;
            settings.updating_exchange = true;
            tx_sender.call('http://greenaddressit.com/login/set_exchange', newValue).then(function() {
                gaEvent('Wallet', 'ExchangeChanged', newValue);
                $scope.wallet.fiat_exchange = newValue;
                $scope.wallet.update_balance();
                settings.exchange = newValue;
                settings.updating_exchange = false;
            }).catch(function(err) {
                settings.updating_exchange = false;
                if (err.uri == "http://greenaddressit.com/error#exchangecurrencynotsupported") {
                    gaEvent('Wallet', 'CurrencyNotSupportedByExchange');
                    notices.makeNotice('error', gettext('{1} supports only the following currencies: {2}')
                        .replace('{1}', exchanges[newValue])
                        .replace('{2}', err.detail.supported));
                } else {
                    gaEvent('Wallet', 'ExchangeChangeFailed', err.desc);
                    notices.makeNotice('error', err.desc);
                }
            });
        }
    });
    var watchNotificationsEmail = function(inout, eventprefix) {
        $scope.$watch('settings.notifications.email_'+inout, function(newValue, oldValue) {
            if (newValue === oldValue) return;
            if (!settings['updating_ntf_email_'+inout] && newValue !==
                        ($scope.wallet.appearance.notifications_settings||{})['email_'+inout]) {
                var notificationsNewValue = angular.copy(settings.notifications);
                settings.notifications['email_'+inout] = oldValue;
                settings['updating_ntf_email_'+inout] = true;
                wallets.updateAppearance($scope, 'notifications_settings', notificationsNewValue).then(function() {
                    gaEvent('Wallet', eventprefix+(newValue?'Enabled':'Disabled'));
                    settings.notifications['email_'+inout] = newValue;
                    settings['updating_ntf_email_'+inout] = false;
                }).catch(function(err) {
                    gaEvent('Wallet', eventprefix+(newValue?'Enable':'Disable')+'Failed', err.desc);
                    notices.makeNotice('error', err.desc);
                    settings['updating_ntf_email_'+inout] = false;
                });
            }
        });
    };
    watchNotificationsEmail('incoming', 'EmailIncomingNotifications');
    watchNotificationsEmail('outgoing', 'EmailOutgoingNotifications');
    $scope.show_mnemonic = function() {
        gaEvent('Wallet', 'ShowMnemonic');
        $modal.open({
            templateUrl: '/'+LANG+'/wallet/partials/wallet_modal_mnemonic.html',
            scope: $scope
        });
    };
}]).controller('AddressBookController', ['$scope', 'tx_sender', 'notices', 'focus', 'wallets', '$location', 'gaEvent', '$rootScope', 'crypto', '$routeParams', 'storage',
        function AddressBookController($scope, tx_sender, notices, focus, wallets, $location, gaEvent, $rootScope, crypto, $routeParams, storage) {
    // dontredirect=false here because address book is now outside settings,
    // though it's also used from inside SendController, hence the $location.url() check
    if (!wallets.requireWallet($scope, $location.url().indexOf('/address-book') != -0)) return;
    $routeParams.page = $routeParams.page || 1;
    $routeParams.page = parseInt($routeParams.page);
    $scope.route = $routeParams;
    var addressbook = $scope.addressbook = {
        items: [],
        new_item: undefined,
        populate_csv: function() {
            var csv_list = [];
            for (var i = 0; i < this.items.length; i++) {
                var item = this.items[i];
                csv_list.push(item.name + ',' + (item.href || item.address));
            }
            this.csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_list.join('\n'));
        }
    };
    var update_addressbook = function(items) {
        while (addressbook.items.length) addressbook.items.pop();
        items.sort(function(a, b) { return a[0].localeCompare(b[0]); });
        var i = 0;
        var is_chrome_app = window.chrome && chrome.storage;
        angular.forEach(items, function(value) {
            if (value[3] == 'facebook') {
                var has_wallet = value[4];
                if (!has_wallet && is_chrome_app) return;  // can't send FB messages from Chrome app
                var href = 'https://www.facebook.com/' + value[1];
                addressbook.items.push({name: value[0], type: value[3], address: value[1], has_wallet: has_wallet, href: href});
            } else {
                addressbook.items.push({name: value[0], type: value[3], has_wallet: value[4], address: value[1]});
            }
            if (value[0] == $routeParams.name) $routeParams.page = Math.ceil((i+1)/20);
            i += 1;
        });
        addressbook.num_pages = Math.ceil(addressbook.items.length / 20);
        addressbook.pages = [];
        for (var i = 1; i <= addressbook.num_pages; i++) addressbook.pages.push(i);
        addressbook.populate_csv();
    };
    var addressbook_key = $scope.wallet.receiving_id + 'addressbook'
    var cache;
    storage.get(addressbook_key).then(function(cache) {
        try {
            cache = JSON.parse(cache) || {};
        } catch(e) {
            cache = {};
        }
        if (cache.hashed) {
            update_addressbook(JSON.parse(crypto.decrypt(cache.items, $scope.wallet.cache_password)));
            var requires_load = false;
        } else {
            $rootScope.is_loading += 1;
            requires_load = true;
        }

        tx_sender.call('http://greenaddressit.com/addressbook/read_all', cache.hashed).then(function(data) {
            if (data.items) {
                var items = data.items;
                cache.items = crypto.encrypt(JSON.stringify(data.items), $scope.wallet.cache_password);
                cache.hashed = data.hashed;
                storage.set(addressbook_key, JSON.stringify(cache));
                update_addressbook(items);
            }
        }, function(err) {
            notices.makeNotice('error', gettext('Error reading address book: ') + err.desc);
        }).finally(function() {
            if (requires_load) {
                $rootScope.is_loading -= 1;
            }
        });
    });
    
    
    $scope.add = function() {
        gaEvent('Wallet', 'AddressBookNewItemStarted');
        addressbook.new_item = {name: '', address: '', type: 'address'};
        focus('addrbook_new_item');
    };
    $scope.delete = function(address) {
        gaEvent('Wallet', 'AddressBookDeleteItem');
        tx_sender.call('http://greenaddressit.com/addressbook/delete_entry', address).then(function() {
            var filtered_items = [];
            angular.forEach(addressbook.items, function(value) {
                if (value.address != address) {
                    filtered_items.push(value);
                }
            });
            addressbook.items = filtered_items;
            addressbook.num_pages = Math.ceil(addressbook.items.length / 20);
            addressbook.populate_csv();
        });
    };
    $scope.rename = function(address, name) {
        tx_sender.call('http://greenaddressit.com/addressbook/edit_entry', address, name, 0).then(function(data) {
            gaEvent('Wallet', 'AddressBookItemRenamed');
            angular.forEach(addressbook.items, function(value) {
                if (value.address == address) {
                    value.renaming = false;
                }
            });
        }, function(err) {
            gaEvent('Wallet', 'AddressBookItemRenameFailed', err.desc);
            notices.makeNotice('error', 'Error renaming item: ' + err.desc);
        });
    };
    $scope.start_rename = function(item) {
        gaEvent('Wallet', 'AddressBookRenameItemStarted');
        item.renaming = true;
        focus('addrbook_rename_' + item.address);
    };
    $scope.save = function() {
        var item = addressbook.new_item;
        if (item.address.indexOf('@') != -1) {
            item.type = 'email';
        }
        tx_sender.call('http://greenaddressit.com/addressbook/add_entry',
                item.address, item.name, 0).then(function(data) {
            if (!data) {
                gaEvent('Wallet', 'AddressBookItemAddFailed', '!data');
                notices.makeNotice('error', 'Error saving item');
                return;
            } else {
                gaEvent('Wallet', 'AddressBookItemAdded');
                
                addressbook.new_item = undefined;
                notices.makeNotice('success', gettext('New item saved'));
                // go to first page - it should refresh the view:
                $location.path('/address-book/name_'+encodeURIComponent(item.name));
            }
        }, function(err) {
            gaEvent('Wallet', 'AddressBookItemAddFailed', err.desc);
            notices.makeNotice('error', gettext('Error saving item: ') + err.desc);
        });
    }
    $scope.send_url = function(contact) {
        return '#/send/' + Crypto.util.bytesToBase64(UTF8.stringToBytes(JSON.stringify(contact)));
    };
}]).controller('QuickLoginController', ['$scope', 'tx_sender', 'notices', 'wallets', 'gaEvent', 'storage',
        function QuickLoginController($scope, tx_sender, notices, wallets, gaEvent, storage) {
    if (!wallets.requireWallet($scope, true)) return;   // dontredirect=true because one redirect in SettingsController is enoug
    $scope.quicklogin = {enabled: false};
    tx_sender.call('http://greenaddressit.com/pin/get_devices').then(function(data) {
        angular.forEach(data, function(device) {
            if (device.is_current) {
                $scope.quicklogin.enabled = true;
                $scope.quicklogin.device_ident = device.device_ident;
            }
        });
        $scope.quicklogin.loaded = true;
        $scope.$watch('quicklogin.enabled', function(newValue, oldValue) {
            if (newValue === oldValue) return
            if (newValue && !$scope.quicklogin.started_unsetting_pin) {
                if (!$scope.quicklogin.started_setting_pin) {
                    $scope.quicklogin.started_setting_pin = true;
                    $scope.quicklogin.enabled = false;  // not yet enabled
                } else {
                    // finished setting pin
                    $scope.quicklogin.started_setting_pin = false;
                }
            } else if (!newValue && !$scope.quicklogin.started_setting_pin) {
                if (!$scope.quicklogin.started_unsetting_pin) {
                    $scope.quicklogin.started_unsetting_pin = true;
                    $scope.quicklogin.enabled = true;  // not yet disabled
                    tx_sender.call('http://greenaddressit.com/pin/remove_pin_login',
                            $scope.quicklogin.device_ident).then(function(data) {
                        gaEvent('Wallet', 'QuickLoginRemoved');
                        $scope.quicklogin.enabled = false;
                        $scope.quicklogin.device_ident = undefined;
                        storage.remove('pin_ident');
                        storage.remove('encrypted_seed');
                        notices.makeNotice('success', gettext('PIN removed'));
                    }, function(err) {
                        gaEvent('Wallet', 'QuickLoginRemoveFailed', err.desc);
                        $scope.quicklogin.started_unsetting_pin = false;
                        notices.makeNotice('error', err.desc);
                    });
                } else {
                    // finished disabling pin
                    $scope.quicklogin.started_unsetting_pin = false;
                }
            }
        })
    });
    $scope.set_new_pin = function() {
        if (!$scope.quicklogin.new_pin) return;
        $scope.quicklogin.setting_pin = true;
        var success_message;
        var success = function(device_ident) {
            $scope.quicklogin.setting_pin = false;
            $scope.quicklogin.new_pin = '';
            $scope.quicklogin.enabled = true;
            if (device_ident) {
                $scope.quicklogin.device_ident = device_ident;
            }
            notices.makeNotice('success', success_message);
        }, error = function(err) {
            $scope.quicklogin.setting_pin = false;
            $scope.quicklogin.started_setting_pin = false;
            gaEvent('Wallet', 'PinError', err.desc);
            notices.makeNotice('error', err.desc);
        };
        if ($scope.quicklogin.device_ident) {  // change the existing PIN
            gaEvent('Wallet', 'PinChangeAttempt');
            success_message = gettext('PIN changed');
            tx_sender.change_pin($scope.quicklogin.new_pin).then(success, error);
        } else {  // create a brand new PIN
            gaEvent('Wallet', 'NewPinSetAttempt');
            success_message = gettext('PIN set');
            wallets.create_pin($scope.quicklogin.new_pin, $scope).then(
                success, error);
        }
    };
    $scope.remove_all_pin_logins = function() {
        $scope.quicklogin.started_unsetting_pin = true;
        tx_sender.call('http://greenaddressit.com/pin/remove_all_pin_logins').then(function() {
            gaEvent('Wallet', 'AllPinLoginsRemoved');
            $scope.quicklogin.enabled = false;
            $scope.quicklogin.device_ident = undefined;
            storage.remove('pin_ident');
            storage.remove('encrypted_seed');
            notices.makeNotice('success', gettext('All PINs removed'));
        }, function(err) {
            gaEvent('Wallet', 'AllPinLoginsRemoveFailed', err.desc);
            $scope.quicklogin.started_unsetting_pin = false;
            notices.makeNotice('error', err.desc);
        });
    }
}]).controller('ThirdPartyController', ['$scope', 'tx_sender', 'notices', 'facebook', 'gaEvent', '$q', 'reddit',
        function($scope, tx_sender, notices, facebook, gaEvent, $q, reddit) {
    $scope.thirdparty = {
        loaded: false,
        fbstate: {},
        redditstate: {},
        customstate: {},
        toggle_fb: function() {
            var that = this;
            if (this.fbstate.enabled) {
                tx_sender.call('http://greenaddressit.com/addressbook/disable_sync', 'facebook').then(function(data) {
                    gaEvent('Wallet', 'FbSyncDisabled');
                    that.toggling_fb = 2;
                    that.fbstate.enabled = false;
                    notices.makeNotice('success', gettext('Facebook integration disabled'));
                }, function(err) {
                    gaEvent('Wallet', 'FbSyncDisableFailed', err.desc);
                    that.toggling_fb = false;
                    notices.makeNotice('error', err.desc);
                });
            } else {
                gaEvent('Wallet', 'FbSyncEnableAttempt');
                facebook.login(that.fbstate).then(function() {
                    var auth = FB.getAuthResponse();
                    if (that.fbstate.logged_in) {
                        tx_sender.call('http://greenaddressit.com/addressbook/sync_fb', auth.accessToken).then(function() {
                            gaEvent('Wallet', 'FbSyncEnabled');
                            notices.makeNotice('success', gettext('Facebook integration enabled'));
                            that.toggling_fb = 2;
                            that.fbstate.enabled = true;
                        }, function(err) {
                            gaEvent('Wallet', 'FbSyncEnableFailed');
                            notices.makeNotice('error', err.desc);
                            that.toggling_fb = false;
                        });
                    } else {
                        that.toggling_fb = false;
                    }
                });
            }
        },
        toggle_reddit: function() {
            var that = this;
            if (this.redditstate.enabled) {
                tx_sender.call('http://greenaddressit.com/addressbook/disable_sync', 'reddit').then(function(data) {
                    gaEvent('Wallet', 'RedditSyncDisabled');
                    that.toggling_reddit = 2;
                    that.redditstate.enabled = false;
                    notices.makeNotice('success', gettext('Reddit integration disabled'));
                }, function(err) {
                    gaEvent('Wallet', 'RedditSyncDisableFailed', err.desc);
                    that.toggling_reddit = false;
                    notices.makeNotice('error', err.desc);
                });
            } else {
                gaEvent('Wallet', 'RedditSyncEnableAttempt');
                reddit.getToken('identity').then(function(token) {
                    if (token) {
                        tx_sender.call('http://greenaddressit.com/addressbook/sync_reddit', token).then(function() {
                            gaEvent('Wallet', 'RedditSyncEnabled');
                            notices.makeNotice('success', gettext('Reddit integration enabled'));
                            that.toggling_reddit = 2;
                            that.redditstate.enabled = true;
                        }, function(err) {
                            gaEvent('Wallet', 'RedditSyncEnableFailed');
                            notices.makeNotice('error', err.desc);
                            that.toggling_reddit = false;
                        });
                    } else {
                        that.toggling_reddit = false;
                    }
                });
            }
        },
        toggle_custom: function() {
            var that = this;
            var change = (that.toggling_custom == 'changing');
            if (this.customstate.enabled && !change) {
                tx_sender.call('http://greenaddressit.com/addressbook/disable_sync', 'custom').then(function(data) {
                    gaEvent('Wallet', 'CustomLoginDisabled');
                    that.customstate.enabled = false;
                    that.customstate.username = that.customstate.password = null;
                    notices.makeNotice('success', gettext('Custom login disabled'));
                }, function(err) {
                    gaEvent('Wallet', 'CustomLoginDisableFailed', err.desc);
                    that.toggling_custom = 'initial';
                    notices.makeNotice('error', err.desc);
                });
            } else {
                gaEvent('Wallet', 'CustomLoginEnableAttempt');
                tx_sender.call('http://greenaddressit.com/addressbook/sync_custom', that.customstate.username,
                        that.customstate.password).then(function() {
                    gaEvent('Wallet', 'CustomLoginEnabled');
                    if (that.customstate.enabled) {
                        // change=true
                        notices.makeNotice('success', gettext('Custom login changed'));
                        $scope.thirdparty.toggling_custom = false;
                    } else {
                        notices.makeNotice('success', gettext('Custom login enabled'));
                        that.customstate.enabled = true;
                    }                    
                }, function(err) {
                    gaEvent('Wallet', 'CustomLoginEnableFailed');
                    notices.makeNotice('error', err.desc);
                    // go back to 1st step of toggling
                    that.toggling_custom = 'initial';
                });
            }
        }
    };
    tx_sender.call('http://greenaddressit.com/addressbook/get_sync_status').then(function(data) {
        $scope.thirdparty.fbstate.enabled = data.fb;
        $scope.thirdparty.redditstate.enabled = data.reddit;
        $scope.thirdparty.customstate.username = data.username;
        $scope.thirdparty.customstate.enabled = data.username ? true : false;
        $scope.thirdparty.customstate.save_button_label = data.username ? gettext('Change') : gettext('Save');
        $scope.thirdparty.loaded = true;
        $scope.$watch('thirdparty.fbstate.enabled', function(newValue, oldValue) {
            if (newValue === oldValue || $scope.thirdparty.toggling_fb === true) return;
            if ($scope.thirdparty.toggling_fb == 2) {
                $scope.thirdparty.toggling_fb = false;
                return;
            }
            $scope.thirdparty.fbstate.enabled = oldValue;
            $scope.thirdparty.toggling_fb = true;
            $scope.thirdparty.toggle_fb();
        });
        $scope.$watch('thirdparty.redditstate.enabled', function(newValue, oldValue) {
            if (newValue === oldValue || $scope.thirdparty.toggling_reddit === true) return;
            if ($scope.thirdparty.toggling_reddit == 2) {
                $scope.thirdparty.toggling_reddit = false;
                return;
            }
            $scope.thirdparty.redditstate.enabled = oldValue;
            $scope.thirdparty.toggling_reddit = true;
            $scope.thirdparty.toggle_reddit();
        });
        $scope.thirdparty.customstate.save = function() {
            // step 2 - actually enable (disabling the inputs while server processes the request)
            var was_enabled = $scope.thirdparty.customstate.enabled;
            if (was_enabled) {
                $scope.thirdparty.toggling_custom = 'changing';
            } else {
                $scope.thirdparty.toggling_custom = 'enabling';
            }
            $scope.thirdparty.toggle_custom();
        };
        $scope.$watch('thirdparty.customstate.enabled', function(newValue, oldValue) {
            $scope.thirdparty.customstate.save_button_label = newValue ? gettext('Change') : gettext('Save');
            if (newValue === oldValue || $scope.thirdparty.toggling_custom == 'initial') return;
            if ($scope.thirdparty.toggling_custom == 'disabling' && newValue == true) return;
            if ($scope.thirdparty.toggling_custom == 'disabling' || $scope.thirdparty.toggling_custom == 'enabling') {
                $scope.thirdparty.toggling_custom = false;
                return;
            }
            $scope.thirdparty.customstate.enabled = oldValue;
            $scope.thirdparty.customstate.save_button_label = oldValue ? gettext('Change') : gettext('Save');
            if (oldValue) { // disabling
                $scope.thirdparty.toggling_custom = 'disabling';
                $scope.thirdparty.toggle_custom();
                return;
            }
            // step 1 - just show the inputs
            $scope.thirdparty.toggling_custom = 'initial';
        });
    });
}]);
