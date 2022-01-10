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
    function onportmessage(data) {
        return window.postMessage(data);
    }

    port.onMessage.addListener(onportmessage)

    function onwindowmessage(evt) {
        if (evt.data.me === "receiver") {
            port.postMessage(evt.data)
        }
    }

    window.addEventListener("message", onwindowmessage);
    // unregister on port disconnect
    port.onDisconnect.addListener(port => {
        console.log("disconnect sadly")
        port.onMessage.removeListener(onportmessage)
        window.removeEventListener("message", onwindowmessage)
    })
})
