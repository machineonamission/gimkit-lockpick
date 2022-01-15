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
        port.postMessage({
            id: id, // id which will be sent back so we can resolve the right query
            type: type, data: params, // event data
            me: "sender" // content script passes message straight to window and the window.onmessage triggers on
            // content-script fired events and window fired events so we need to differentiate
        })
    }))
}

let port
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    try {
        port = chrome.tabs.connect(tabs[0].id);
        askwindow(port, "ping").then(console.log);
        askwindow(port, "mode").then(mode => {
            let cont = document.getElementById("content");
            let md = null;
            switch (mode) {
                case "FISH":
                case "MC":
                case "DRAW":
                case "IMPOSTER":
                    md = mode;
                    const hnames = {
                        "FISH": "Fishtopia",
                        "MC": "Classic",
                        "DRAW": "Draw That",
                        "IMPOSTER": "Trust No One"
                    }
                    document.getElementById("content").innerHTML = `<p><i class="fa-solid fa-gamepad-modern"></i> Detected game: ${hnames[mode]} <sup><i class="fa-solid fa-circle-info" id="game-info"></i></sup></p>`;
                    new bootstrap.Tooltip(document.getElementById("game-info"), {
                        "title": "GimKit Lock-Pick has attempted to detect the game type. Especially for Classic, many games use the same mechanics with a different coat of paint."
                    })
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
            enableaccordion(mode);
            if (mode === "FISH") setupfishlink();
            initvalues()
        });
    } catch (e) {
        console.error(e)
        document.getElementById("content").innerHTML = `<p class="text-danger"><i class="fa-solid fa-circle-xmark"></i> Something went wrong connecting to GimKit.</p>`
    }
});

function enableaccordion(mode) {
    let fish, mc, draw, imposter = false;
    switch (mode) {
        case "FISH":
            fish = true;
            mc = true;
            break
        case "IMPOSTER":
            imposter = true
            mc = true;
            break
        case "MC":
            mc = true;
            break;
        case "DRAW":
            draw = true;
    }
    const warning = `<p class="text-warning"><i class="fa-solid fa-circle-question"></i> GimKit Lock-Pick did not detect that the current game is compatible with these settings. These most likely won't do anything.</p>`

    if (!mc) {
        document.querySelector("#mc-options > button").classList.add("accordion-button-muted");
        document.querySelector("#mc-options-body > .accordion-body")
            .insertAdjacentHTML("afterbegin", warning)
    }
    if (!fish) {
        document.querySelector("#fish-options > button").classList.add("accordion-button-muted");
        document.querySelector("#fish-options-body > .accordion-body")
            .insertAdjacentHTML("afterbegin", warning)
    }
    if (!draw) {
        document.querySelector("#draw-options > button").classList.add("accordion-button-muted");
        document.querySelector("#draw-options-body > .accordion-body")
            .insertAdjacentHTML("afterbegin", warning)
    }
    if (!imposter) {
        document.querySelector("#imposter-options > button").classList.add("accordion-button-muted");
        document.querySelector("#imposter-options-body > .accordion-body")
            .insertAdjacentHTML("afterbegin", warning)
    }


    document.getElementById("options").classList.remove("d-none")
}

function roundton(num, n) {
    return +(Math.round((num + Number.EPSILON) + "e+" + n) + "e-" + n);
}

function setupfishlink() {
    // warning about weird fishtopia handling
    const fw = document.getElementById("fishtopia-warning")
    fw.classList.remove("d-none")
    let tt = new bootstrap.Tooltip(fw, {
        "title": "Fishtopia handles question answering differently from the other gamemodes. When you answer a " +
            "question, Fishtopia only sends GimKit the answer you chose and is expected to have synced the current " +
            "question beforehand. Especially at high speeds, GimKit Lock-Pick may send the answer to a different " +
            "question if the GimKit servers haven't send the correct question yet. Currently, there is no workaround " +
            "other than to turn down the speed.",
        "customClass": "tt-big"
    })
    console.log(tt)
    // only need to ask once because you cant move with the popup open
    const x = document.getElementById("fishx");
    const y = document.getElementById("fishy");
    const speed = document.getElementById("fishspeed");
    const zoom = document.getElementById("fishzoom");
    askwindow(port, "trigger", "fishquery").then(data => {
        x.value = roundton(data.x, 1)
        y.value = roundton(data.y, 1)
        speed.value = data.speed
        zoom.value = data.zoom
    })

    function updatepos() {
        askwindow(port, "fishpos", {x: parseFloat(x.value), y: parseFloat(y.value)})
    }

    x.addEventListener("input", updatepos)
    y.addEventListener("input", updatepos)

    speed.addEventListener("input", () => {
        askwindow(port, "fishspeed", parseFloat(speed.value))
    })
    zoom.addEventListener("input", () => {
        askwindow(port, "fishzoom", parseFloat(zoom.value))
    })
}

function linksliderandnumber(slider, number) {
    // when slider is changed, change text value
    slider.addEventListener("input", () => {
        number.value = slider.value
    })
    // when text value is changed
    number.addEventListener("input", () => {
        // parse min max and val (text)
        const min = parseInt(number.getAttribute("min"))
        // const max = parseInt(number.getAttribute("max"))
        const val = parseInt(number.value)
        // assert correct values
        if (val < min) {
            slider.value = min
            number.value = min
            number.dispatchEvent(new Event("input"));
            // dont actually care but like lol
            // } else if (val > max) {
            //     slider.value = max
            //     number.value = max
            //     number.dispatchEvent(new Event("input"));
        } else {
            slider.value = val
        }

    });
}

function initvalues() {
    // init special settings
    const mindelay = document.getElementById('min-delay')
    const mindelaytext = document.getElementById('min-delay-text')
    linksliderandnumber(mindelay, mindelaytext)
    new bootstrap.Tooltip(document.querySelector("#danger-delay-div > label"), {
        "title": "GimKit listens for unnaturally fast answering and answering too many questions faster than 2/s will get you kicked."
    })
    new bootstrap.Tooltip(document.querySelector("#exp-zone"), {
        "title": "These options are experiments and may get you kicked from the game."
    })
    const dangerdelay = document.getElementById("danger-delay")
    dangerdelay.addEventListener("input", () => {
        [mindelay, mindelaytext].forEach(e => {
            const min = dangerdelay.checked ? 0 : 500
            e.setAttribute("min", min.toString())
            if (parseInt(e.value) < min) {
                e.value = min.toString()
                e.dispatchEvent(new Event("input"));
            }
        })
    })
    // amogus button
    const susbody = document.getElementById("amongusrolesbody");
    document.getElementById("amongusroles").addEventListener("click", () => {
        askwindow(port, "imposters").then(roles => {
            console.log(roles)
            susbody.innerHTML = "";
            const dead = `<i class="fa-solid fa-skull-crossbones"></i>`;
            roles.forEach(role => {
                susbody.insertAdjacentHTML('beforeend',
                    `<li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>${role.name}</span>
                                <span>${role.votedOff ? dead : ""}
                                <i class="fa-solid fa-user-${role.role === "detective" ? "astronaut" : "alien"}"></i></span>
                          </li>`)
            })
        })
    })
    // canvas upload
    const fileupload = document.getElementById("draw-file")
    const filebutton = document.getElementById("draw-upload")
    filebutton.addEventListener("click", () => {
        let file = fileupload.files[0]
        if (!file) return;
        let reader = new FileReader();
        reader.onload = function (e) {
            askwindow(port, "draw", e.target.result)
        }
        reader.readAsDataURL(file);
    })
    // general chrome-stored elements
    let storagequery = {}
    document.querySelectorAll('[storage-key]').forEach(e => {
        const key = e.getAttribute("storage-key")
        storagequery[key] = e.getAttribute("type") === "checkbox" ? e.checked : e.value;
    })
    chrome.storage.local.get(storagequery, items => {
        askwindow(port, "updatevalue", items)
        for (const [key, value] of Object.entries(items)) {
            let objs = document.querySelectorAll(`[storage-key="${key}"]`);
            if (!objs) return;
            objs.forEach(obj => {
                if (obj.getAttribute("type") === "checkbox") {
                    obj.checked = value;
                    obj.addEventListener("input", () => {
                        askwindow(port, "updatevalue", {[key]: obj.checked})
                        chrome.storage.local.set({[key]: obj.checked})
                    })
                } else {
                    obj.value = value;
                    obj.addEventListener("input", () => {
                        askwindow(port, "updatevalue", {[key]: obj.value})
                        chrome.storage.local.set({[key]: obj.value})
                    })
                }
            })

        }
    })
    // button triggers
    document.querySelectorAll('[trigger]').forEach(e => {
        const key = e.getAttribute("trigger")
        e.addEventListener("click", () => {
            askwindow(port, "trigger", key)
        })
    })
}