console.log('injecting content script');
function injectscript(filename) {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL(filename);
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    (document.head||document.documentElement).appendChild(s);
}
injectscript("e.js")
injectscript("foreground.js")