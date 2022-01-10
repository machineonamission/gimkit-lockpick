function askwindow(port, params) {
    return new Promise(((resolve) => {
        // call and response doesnt work well for passing to the window so we have to create IDs to identify
        const id = crypto.randomUUID();
        port.onMessage.addListener((data) => {
            if (data.id === id) resolve(data.data)
        })
        port.postMessage({id: id, data: params, me: "sender"})
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
                case "UNKNOWN":
                    cont.innerHTML = `<p class="text-warning"><i class="fa-solid fa-circle-exclamation"></i> GimKit appears to have loaded a game, but I cannot identify what it is. If you are in a game, please report this to the GitHub.</p>`;
                    break
                case "ERROR":
                    cont.innerHTML = `<p class="text-warning"><i class="fa-solid fa-circle-exclamation"></i> I cannot determine what game is loaded. If you are in a game, please report this to the GitHub.</p>`;
                    break
                default:
                    cont.innerHTML = `<p class="text-danger"><i class="fa-solid fa-circle-exclamation"></i> I've recieved an invalid game type, please report this to the GitHub.</p>`;
                    break
            }

        });
    } catch (e) {
        console.error(e)
        document.getElementById("content").innerHTML =
            `<p class="text-danger"><i class="fa-solid fa-circle-xmark"></i> Something went wrong connecting to GimKit.</p>`
    }
});
