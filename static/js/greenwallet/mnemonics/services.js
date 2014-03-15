angular.module('greenWalletMnemonicsServices', ['greenWalletServices'])
.factory('mnemonics', ['$q', '$http', 'cordovaReady', function($q, $http, cordovaReady) {
    var mnemonics = {};
    var english_txt;
    var getEnglishTxt = function() {
        var deferred = $q.defer();
        if (english_txt) deferred.resolve(english_txt);
        else {
            $http.get('/static/js/greenwallet/english.txt').success(function(data) {
                english_txt = data;
                deferred.resolve(english_txt);
            });
        }
        return deferred.promise;
    };
    var getMnemonicMap = function() {
        var deferred = $q.defer();
        getEnglishTxt().then(function(data) {
            var words = data.split('\n');
            var mapping = {};
            for (var i = 0; i < words.length; i++) {
                mapping[words[i]] = i;
            }
            deferred.resolve(mapping);
        });
        return deferred.promise;
    };
    mnemonics.getMnemonicMap = getMnemonicMap;
    mnemonics.validateMnemonic = function(mnemonic) {
        var deferred = $q.defer();
        var words = mnemonic.split(" ");
        if (words.length % 3 > 0) deferred.reject("Invalid number of words");
        getMnemonicMap().then(function(mapping) {
            var indices = [];
            for (var i = 0; i < words.length; i++) {
                if (mapping[words[i]] === undefined) {
                    deferred.reject("Unknown word '" + words[i] + "'");
                    return;
                }
                indices.push(mapping[words[i]]);
            }
            var binary = '';
            for(var i = 0; i < indices.length; i++) {
                var binPart = new BigInteger(indices[i].toString()).toRadix(2);
                while (binPart.length < 11) binPart = '0' + binPart;
                binary += binPart;
            }
            var retval = new BigInteger(binary, 2).toByteArrayUnsigned();
            var checksum = retval.pop();
            var hash = Crypto.SHA256(retval, {asBytes: true});
            if(hash[0] != checksum) deferred.reject('Checksum does not match');  // checksum
            deferred.resolve(retval);
        })
        return deferred.promise;
    }
    mnemonics.fromMnemonic = function(mnemonic) {
        var bytes = mnemonics.validateMnemonic(mnemonic);
        var deferred = $q.defer();
        bytes.then(function(bytes) {
            deferred.resolve(bytes);
        }, function(e) {
            throw("Invalid mnemonic: " + e);
        });
        return deferred.promise;
    };
    mnemonics.toMnemonic = function(data) {
        var deferred = $q.defer();
        getEnglishTxt().then(function(response) {
            var words = response.split('\n');
            if(words.length != 2048) {
                throw("Wordlist should contain 2048 words, but it contains "+words.length+" words.");
            }

            var binary = BigInteger.fromByteArrayUnsigned(data).toRadix(2);
            while (binary.length < data.length * 8) { binary = '0' + binary; }

            var hash = BigInteger.fromByteArrayUnsigned(Crypto.SHA256(data, {asBytes: true})).toRadix(2);
            while (hash.length < 256) { hash = '0' + hash; }
            binary += hash.substr(0, data.length / 4);  // checksum

            var mnemonic = [];
            for (var i = 0; i < binary.length / 11; ++i) {
                var index = new BigInteger(binary.slice(i*11, (i+1)*11), 2);
                mnemonic.push(words[index[0]]);
            }
            deferred.resolve(mnemonic.join(' '));
        });
        return deferred.promise;
    }
    mnemonics.toSeed = function(mnemonic) {
        var deferred = $q.defer();
        var k = 'mnemonic';
        var m = mnemonic;
        if (window.cordova) {
            cordovaReady(function() {
                cordova.exec(function(param) {
                        if (param.constructor === Number) {
                            deferred.notify(param);
                        } else {
                            var ArrayBuffer2hex = function (buffer) {
                                var hex = "";
                                var view = new Uint8Array(buffer);                                  
                                for (var i = 0; i < view.length; i++)
                                    hex += ("00" + view[i].toString(16)).slice(-2);
                                return hex;
                            };
                            var hex = ArrayBuffer2hex(param);
                            deferred.resolve(hex);
                        }
                    }, function(fail) {
                        console.log('mnemonic.toSeed failed: ' + fail)
                    }, "BIP39", "calcSeed", [k, m]);
            })();
        } else {
            var worker = new Worker("/static/js/mnemonic_seed_worker.min.js");
            worker.postMessage({k: k, m: m});
            worker.onmessage = function(message) {
                if(message.data.type == 'seed') {
                    deferred.resolve(message.data.seed);
                } else {
                    deferred.notify(message.data.progress);
                }
            }
        }
        return deferred.promise;
    };
    return mnemonics;
}]);
