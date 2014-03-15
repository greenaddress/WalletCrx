var deps = ['greenWalletBaseApp', 'ngRoute', 'ui.bootstrap', 'greenWalletDirectives', 'greenWalletControllers',
     'greenWalletInfoControllers', 'greenWalletSettingsControllers', 'greenWalletTransactionsControllers',
     'greenWalletReceiveControllers', 'greenWalletSendControllers', 'greenWalletSignupLoginControllers', 'ja.qr'];
if (window.cordova) {
    deps.push('greenWalletNFCControllers');
    localStorage.hasWallet = true;  // enables redirect to wallet from front page (see js/greenaddress.js)
}
var greenWalletApp = angular.module('greenWalletApp', deps)
.controller('SignupController', ['$scope', '$injector', '$controller', function($scope, $injector, $controller) {
    $script('/static/js/signup.min.js', function() {
        // injector method takes an array of modules as the first argument
        // if you want your controller to be able to use components from
        // any of your other modules, make sure you include it together with 'ng'
        // Furthermore we need to pass on the $scope as it's unique to this controller
        $injector.invoke(SignupControllerAsync, this, {'$scope': $scope});
    });
}])
.constant('branches', {
	REGULAR: 1,
    EXTERNAL: 2
})
.config(['$routeProvider', '$provide', function config($routeProvider, $provide) {
    $routeProvider
        .when('/', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_signuplogin.html',
            controller: 'SignupLoginController'
        })
        .when('/info', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_info.html',
            controller: 'InfoController'
        })
        .when('/transactions', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_transactions.html',
            controller: 'TransactionsController'
        })
        .when('/receive', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_receive.html',
            controller: 'ReceiveController'
        })
        .when('/send', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_send.html',
            controller: 'SendController'
        })
        .when('/send/:contact', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_send.html',
            controller: 'SendController'
        })
        .when('/address-book', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_address_book.html'
            //controller: 'SettingsController'
        })
        .when('/address-book/name_:name', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_address_book.html'
            //controller: 'SettingsController'
        })
        .when('/address-book/:page', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_address_book.html'
            //controller: 'SettingsController'
        })
        .when('/settings', {
            templateUrl: '/'+LANG+'/wallet/partials/wallet_settings.html',
            controller: 'SettingsController'
        })
        .when('/create', {
            templateUrl: '/'+LANG+'/wallet/partials/signup_1_init.html',
            controller: 'SignupController'
        })
        .when('/signup_pin', {
            templateUrl: '/'+LANG+'/wallet/partials/signup_2_pin.html',
            controller: 'SignupController'
        })
        .when('/signup_oauth', {
            templateUrl: '/'+LANG+'/wallet/partials/signup_3_oauth.html',
            controller: 'SignupController'
        })
        .when('/signup_2factor', {
            templateUrl: '/'+LANG+'/wallet/partials/signup_4_2factor.html',
            controller: 'SignupController'
        })
        .when('/concurrent_login', {
            templateUrl: '/'+LANG+'/wallet/partials/concurrent_login.html',
            controller: 'SignupController'
        })
        .when('/browser_unsupported', {
            templateUrl: '/'+LANG+'/wallet/partials/browser_unsupported.html'
        });
        
}]).run(['$rootScope', function($rootScope, $location) {
    $rootScope.$location = $location;
}]).factory("inputsWatcher", ["$interval", "$rootScope", function($interval, $rootScope){
    var INTERVAL_MS = 500;
    var promise;
    var handlers = [];

    function execHandlers(){
        for(var i = 0, l = handlers.length; i < l; i++){
            handlers[i]();
        }
    }

    return {
        registerInput: function registerInput(handler){
            if(handlers.push(handler) == 1){
                promise = $interval(execHandlers, INTERVAL_MS);
            }
        },
        unregisterInput: function unregisterInput(handler){
            handlers.splice(handlers.indexOf(handler), 1);
            if(handlers.length == 0){
                $interval.cancel(promise);
            }
        }
    }
}]).directive("toggleableMenu", ['$location', 'cordovaReady', function($location, cordovaReady) {
    return {
        restrict: 'A',
        controller: ['$scope', function($scope) {
            var state = false;
            if (window.cordova) {
                var backHandler = function() {
                    $scope.toggle_set(false);
                    document.removeEventListener("backbutton", backHandler);
                };
                cordovaReady(function() {
                    document.addEventListener("menubutton", function() {
                        $scope.toggle_set(true);
                    });
                })();
            }
            var toggleClasses = [];
            this.registerToggleClass = function(element, cls) {
                toggleClasses.push([element, cls]);
            };
            $scope.toggle_set = function(enable) {
                if (state == enable) return;
                state = enable;
                for (var i = 0 ; i < toggleClasses.length; ++i) {
                    var tc = toggleClasses[i];
                    if (enable) {
                        tc[0].addClass(tc[1]);
                    } else {
                        tc[0].removeClass(tc[1]);
                    }
                }
                if (window.cordova) {
                    if (state) {
                        document.addEventListener("backbutton", backHandler);
                    } else {
                        document.removeEventListener("backbutton", backHandler);
                    }
                }
            };
        }],
        link: function(scope, element, attrs) {
            element.find('a').on('click', function() {
                var a = angular.element(this);
                scope.toggle_set(false);
            });
            scope.$watch(function() { return $location.path(); },
                function(newValue, oldValue) {
                    var all_a = element.find('a');
                    for (var i = 0; i < all_a.length; i++) {
                        var a = angular.element(all_a[i]);
                        if (newValue.indexOf(a.parent().attr('path')) != -1) {
                            scope.subpage_title = a.text();
                            a.parent().addClass('selected');
                        } else {
                            a.parent().removeClass('selected');
                        }
                    }
                });
        }
    };
}]).directive("toggleClass", function() {
    return {
        restrict: 'A',
        require: '^toggleableMenu',
        link: function(scope, element, attrs, toggleableMenuController) {
            toggleableMenuController.registerToggleClass(element, attrs['toggleClass']);
        }
    };
});
