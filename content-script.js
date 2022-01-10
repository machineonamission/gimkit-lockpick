function injectscript(filename) {
    let s = document.createElement('script');
    s.src = chrome.runtime.getURL(filename);
    s.onload = function () {
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(s);
}

injectscript("foreground.js")


chrome.runtime.onConnect.addListener((port) => {
    // pass message straight to window
    function onportmessage(data) {
        return window.postMessage(data);
    }

    port.onMessage.addListener(onportmessage)

    // if its from the window, pass straight to popup
    function onwindowmessage(evt) {
        if (evt.data.me === "receiver") {
            port.postMessage(evt.data)
        }
    }

    window.addEventListener("message", onwindowmessage);
    // unregister events on port disconnect
    port.onDisconnect.addListener(port => {
        port.onMessage.removeListener(onportmessage)
        window.removeEventListener("message", onwindowmessage)
    })
})
