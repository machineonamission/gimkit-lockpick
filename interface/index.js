function askwindow(port, type, params = {}) {
    return new Promise(((resolve) => {
        // proper call and response doesnt work well for passing to the window so we have to create IDs to identify each query
        const id = crypto.randomUUID();

        function om(data) {
            if (data.id === id) {
                port.onMessage.removeListener(om)
                resolve(data.data)
            }
        }

        // send message to content script and wait for response
        port.onMessage.addListener(om)
        port.postMessage(
            {
                id: id, // id which will be sent back so we can resolve the right query
                type: type, data: params, // event data
                me: "sender" // content script passes message straight to window and the window.onmessage triggers on
                // content-script fired events and window fired events so we need to differentiate
            }
        )
    }))
}

chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    try {
        let port = chrome.tabs.connect(tabs[0].id);
        askwindow(port, "ping").then(console.log);
        askwindow(port, "mode").then(mode => {
            let cont = document.getElementById("content");
            switch (mode) {
                case "MC":
                case "DRAW":
                case "FISH":
                    cont.innerHTML = `<p><i class="fa-solid fa-circle-info"></i> Detected type: ${mode}</p>`;
                    break
                case "ERROR":
                    cont.innerHTML = `<p class="text-warning"><i class="fa-solid fa-circle-exclamation"></i> I cannot determine what game is loaded. If you are in a game, please report this to the GitHub.</p>`;
                    break
                case "UNKNOWN":
                default:
                    console.warn("Game type", mode)
                    cont.innerHTML = `<p class="text-warning"><i class="fa-solid fa-circle-exclamation"></i> GimKit appears to have loaded a game, but I cannot identify what it is. If you are in a game, please report this to the GitHub.</p>`;
                    break
            }

        });
    } catch (e) {
        console.error(e)
        document.getElementById("content").innerHTML =
            `<p class="text-danger"><i class="fa-solid fa-circle-xmark"></i> Something went wrong connecting to GimKit.</p>`
    }
});
