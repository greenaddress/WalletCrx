angular.module('greenWalletReceiveControllers',
    ['greenWalletServices'])
.controller('ReceiveController', ['$scope', 'wallets', 'tx_sender', 'notices', 'cordovaReady', 'hostname', 'gaEvent',
        function InfoController($scope, wallets, tx_sender, notices, cordovaReady, hostname, gaEvent) {
    if(!wallets.requireWallet($scope)) return;
    var base_payment_url = 'https://' + hostname + '/pay/' + $scope.wallet.receiving_id + '/';
    $scope.receive = {
        payment_url: base_payment_url
    };
    var formatAmountBitcoin = function(amount) {
        var satoshi = Bitcoin.Util.parseValue(amount.toString()).divide(new BigInteger('1000'));
        return Bitcoin.Util.formatValue(satoshi.toString());
    };
    var formatAmountSatoshi = function(amount) {
        var satoshi = Bitcoin.Util.parseValue(amount.toString()).divide(new BigInteger('1000'));
        return satoshi.toString();
    }
    $scope.show_bitcoin_uri = function(show_qr) {
        if ($scope.receive.bitcoin_uri) {
            if (show_qr) $scope.show_url_qr($scope.receive.bitcoin_uri);
        } else {
            gaEvent('Wallet', 'ReceiveShowBitcoinUri');
            tx_sender.call('http://greenaddressit.com/vault/fund').then(function(data) {
                var script = Crypto.util.hexToBytes(data);
                var address = new Bitcoin.Address(Bitcoin.Util.sha256ripe160(script));
                address.version = cur_coin_p2sh_version;
                $scope.receive.base_bitcoin_uri = $scope.receive.bitcoin_uri = 'bitcoin:' + address.toString();
                if ($scope.receive.amount) {
                    $scope.receive.bitcoin_uri += '?amount=' + formatAmountBitcoin($scope.receive.amount);
                }
                if (show_qr) $scope.show_url_qr($scope.receive.bitcoin_uri);
            });
        }
    }
    wallets.addCurrencyConversion($scope, 'receive');
    $scope.$watch('receive.amount', function(newValue, oldValue) {
        if (newValue === oldValue) return;
        if (newValue) {
            $scope.receive.payment_url = base_payment_url + '?amount=' + formatAmountSatoshi(newValue);
            if ($scope.receive.bitcoin_uri) {
                $scope.receive.bitcoin_uri = $scope.receive.base_bitcoin_uri + '?amount=' + formatAmountBitcoin(newValue);
            }
        } else {
            $scope.receive.payment_url = base_payment_url;
            $scope.receive.bitcoin_uri = $scope.receive.base_bitcoin_uri;
        }
    });
}]);