var lang, usbDevices = {};

var start = function() {
    chrome.app.window.create(lang+'/wallet.html', {
        'bounds': {
            'width': 992,
            'height': 700,
        },
        'id': 'wallet'
    }, function() {
        chrome.app.window.get('wallet').onClosed.removeListener(start); 
        chrome.app.window.get('wallet').onClosed.addListener(function () {
            for (var i in usbDevices) {
                winUSBInterface.prototype.close.apply(usbDevices[i]);
            }
        });
    });
}
var SUPPORTED_LANGS = ['de', 'en', 'es', 'fr', 'it', 'pl', 'ru', 'uk', 'sv', 'nl', 'el', 'th'];
chrome.app.runtime.onLaunched.addListener(function() {
    chrome.storage.local.get('language', function(items) {
        lang = items.language;
        if (!lang) {
            chrome.i18n.getAcceptLanguages(function(langs) {
                lang = 'en';
                for (var i = 0; i < langs.length; i++) {
                    if (SUPPORTED_LANGS.indexOf(langs[i]) != -1) {
                        lang = langs[i];
                        break;
                    }
                }
                console.log(lang);
                start();
            });
        } else {
            start();
        }
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.changeLang) {
        var win = chrome.app.window.get('wallet');
        lang = request.lang;
        win.onClosed.addListener(start);
        win.close();
    } else if (request.usbClaimed) {
        usbDevices[request.usbClaimed.device.handle] = request.usbClaimed;
    } else if (request.usbClosed) {
        delete usbDevices[request.usbClosed.device.handle];
    }
    return true;
});
