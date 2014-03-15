chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('en/wallet.html', {
    'bounds': {
      'width': 900,
      'height': 700,
    },
    'id': 'wallet'
  });
});