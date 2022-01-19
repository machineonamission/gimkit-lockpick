let gksettings = {delay: 500}
let gkanswering = false;

const sleep = (milliseconds) => {
    // async sleep
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function waitForCond(condfunc) {
    // wait for condfunc() to return true a bit more intelligently by triggering with MutationObserver
    return new Promise(resolve => {
        if (condfunc()) {
            return resolve(condfunc());
        }

        const observer = new MutationObserver(() => {
            if (condfunc()) {
                resolve(condfunc());
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true, subtree: true
        });
    });
}


function reactprops(elem) {
    // superceded by reactfiber().memoizedProps
    if (elem && elem.props) {
        return elem.props
    }
    if (elem.$$typeof) {
        return elem
    }
    for (let o in elem) {
        if (o.startsWith("__reactProps")) {
            return elem[o]
        }
    }
    return null
}

function reactfiber(elem) {
    // get react data for DOM element
    for (let o in elem) {
        if (o.startsWith("__reactFiber")) {
            return elem[o]
        }
    }
    return null
}

function mobbox() {
    // find the "MobXProvider" object which contains lots of game info that is very useful
    // not always called that but the object seems to exist in all gamemodes
    let ginfo = reactsearch((e) => {
        return (typeof e.value.gameOptions === "object") || (typeof e.value.worldOptions === "object")
    })
    if (ginfo.length && ginfo[0].value) {
        return ginfo[0].value
    } else {
        return null
    }
}

function answertest(pr) {
    // function for reactsearch() to find object with answers and submit func
    return typeof pr.onQuestionAnswered === "function" && typeof pr.answers === "object"
}

function answer() {
    // get question container properties
    let props = reactsearch(answertest)[0];
    // handler to answer question
    let handler = props.onQuestionAnswered;
    // Q answers
    let answers = props.answers;
    // find correct answer, if theres multiple it should just choose the first
    let correct = answers.find(obj => {
        return obj.correct === true
    });
    if (correct !== undefined) {
        if (props.type === "text") {
            // answer text for text question
            handler(correct.text)
        } else {
            // answer ID for MC
            handler(correct._id)
        }
    } else {
        // if none are correct just choose the first one
        handler(answers[0]._id)
    }
}

function answerdraw() {
    // answer the drawmode
    let mb = mobbox()
    // get answer
    const term = mb.draw.round.term;
    // send directly to gimkit, visual changes are made on server response
    mb.engine.game.send("DRAW_MODE_GUESS", term)
}

async function revealdraw() {
    // cant find an easy way to safely override the function changing the terms
    // theres a prop listener i can find with breakpoints but i cant find how to access it from global
    // TODO: cleaner implementation i beg of you
    let mb = mobbox()
    while (mb.draw.status === "drawing") {
        mb.draw.round.revealText = mb.draw.round.term;
        await sleep(500);
    }
}

function conttest(pr) {
    // function to find continue button
    return typeof pr.continueToQuestions === "function"
}

function cont() {
    // find function
    let props = reactsearch(conttest)[0];
    // call it
    props.continueToQuestions();
}

async function anscont() {
    // if answer button exists
    if (0 < reactsearch(answertest).length) {
        // ans it
        answer()
    }
    // wait for continue button to exist
    await waitForCond(() => {
        return 0 < reactsearch(conttest).length
    });
    // continue
    cont();
    // wait for question to exist
    await waitForCond(() => {
        return 0 < reactsearch(answertest).length
    });
    // answer it
    answer();
    // sleep predefined value
    await sleep(gksettings.delay);

    // the sleep occurs on the continue screen which is important in fishtopia
    // for some godforsaken reason, the question ID is stored on gimkit's servers in fishtopia and you only send the
    // answer. it seems to be properly synced and prepared during the continue phase and having it sleep on the answer
    // screen causes it to get like half of the questions wrong. its a bit ugly but it works and plus the "+$231" screen
    // is nicer anyways
}

function reactsearch(proptest, returnentirefiber = false) {
    // search all React fibers for a specific property which is passed to proptest(), return all which return true
    const searchid = crypto.randomUUID(); // give this search a random ID to assign to searched fibers
    function searchfiber(fiber) {
        // in case its passed nonsense
        if (!fiber) return false;
        // avoid repeat searching
        // this is WAY faster than adding them to a local list and since the fibers are proper objects they remember
        if (fiber.searchid === searchid) return false;
        // if fiber lacks props, ignore
        if (!fiber.memoizedProps || typeof fiber.memoizedProps !== "object") return false;
        try {
            // check if props match test, add to matches if it do
            if (proptest(fiber.memoizedProps)) {
                if (returnentirefiber) {
                    matches.push(fiber);
                } else {
                    matches.push(fiber.memoizedProps);
                }
            }
        } catch (e) {
            // ignore exceptions
        } finally {
            // mark fiber as searched
            fiber.searchid = searchid
        }
    }

    let matches = [];
    // for every DOM element inside the #root (react object)
    Array.from(document.getElementById("root").getElementsByTagName('*')).forEach(e => {
        // get fiber
        let fiber = reactfiber(e);
        // just in case, make sure there is a fiber
        if (!fiber) return false;
        // test it
        searchfiber(fiber);
        // some fibers don't have html elements and traversing down with fiber.child can fail. use fiber.return which
        // goes up (parent) and always works to get almost all fibers
        do {
            if (!fiber.return) break;
            fiber = fiber.return;
            // if this fiber has been searched, its parents have been too.
            if (fiber.searchid === searchid) break;
            searchfiber(fiber);

        } while (fiber.return);
    })
    return matches
}

function gimkitclick(elem) {
    // getEventListeners only works in chrome console
    // send an object that looks like a click event to trick gimkit into thinking it was clicked
    // superceded by directly calling functions in react props
    window.getEventListeners(document.getElementById("root")).click.forEach(listener => {
        listener.listener({
            type: "click", view: window, isTrusted: true, path: [elem], target: elem,
        })
    });
}

async function amongus() {
    // get all roles for amogus mode
    let ginfo = mobbox()
    // weird proxy objects
    let people = _.cloneDeep(ginfo.imposter.people);
    // people might not be loaded especially when rejoining
    if (people.length) { // if loaded return gracefully
        return people
    } else {
        // if not loaded, ask for people and wait until it resolves
        ginfo.engine.game.send("IMPOSTER_MODE_REQUEST_PEOPLE", undefined)
        // send returns undefined and has no easy way to intercept callback
        while (true) {
            // check every 100ms if people was updated, return if it was
            people = _.cloneDeep(ginfo.imposter.people);
            if (people.length) {
                return people
            }
            await sleep(100)
        }
    }
}

function drawb64(data) {
    // draw base64 image on Draw It canvas
    // find canvas
    const canv = reactsearch((e) => {
        return (e.canEdit === true && typeof e.canvasRef === "object")
    })[0]
    // send image to gimkit
    canv.emitImage(data);
    // draw on local canvas
    canv.canvasRef.current.drawImage(data);
}

function fishteleport(pos) {
    // fishtopia teleport
    mobbox().phaser.mainCharacter.movement.moveInstantly(pos)
}

function fishspawn() {
    // fishtopia teleport to spawn
    let mb = mobbox()
    mb.phaser.mainCharacter.movement.moveInstantly(mb.me.spawnPosition)
}

function fishcollision(enabled) {
    // fishtopia toggle colission
    let mb = mobbox()
    // disables wall/water collision
    if (enabled) {
        mobbox().phaser.mainCharacter.collision.enableCollision()
    } else {
        mobbox().phaser.mainCharacter.collision.disableCollision()
    }
    // disables all object collision
    mb.phaser.mainCharacter.body.body.checkCollision.none = !enabled
}

function fishspeed(s) {
    // fishtopia movement speed
    mobbox().phaser.mainCharacter.physics.setMovementSpeed(s)
}

function fishzoom(z) {
    // fishtopia camera zoom
    mobbox().phaser.scene.cameras.main.zoom = z
}

function fishremovedelay() {
    // for every "device" (seems to be a phaser interactable object)
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.interactiveZones.isInteractive()).forEach(d => {
        // set its delay to 0
        d.interactiveZones.setDelay(0)
    })
}

function fishrestoredelay() {
    // for every device
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.interactiveZones.isInteractive()).forEach(d => {
        // set to delay specified in options which seems to be original
        d.interactiveZones.setDelay(d.options.interactionDuration)
    })
}

function fishcollect() {
    // for every device
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.deviceOption.id === "droppedItem").forEach(d => {
        d.interactiveZones.onInteraction()
    })
}

async function fishallbait() {
    const bait = mobbox().me.inventory.slots.get("bait").amount;
    for (let i = 0; i < bait; i++) {
        fishatgalaxy()
        await sleep(500)
    }
}

function fishsell() {
    // forcefully call the function to fish at one of the space cove things
    mobbox().phaser.scene.worldManager.devices.getDeviceById("3QhiGURlzHf7wQ3xVliTO").interactiveZones.onInteraction()
}

function fishatgalaxy() {
    // forcefully call the function to fish at one of the space cove things
    mobbox().phaser.scene.worldManager.devices.getDeviceById("Y5Mw3gytkmkflOrOXgEi8").interactiveZones.onInteraction()
}

let lastbaitobtain = 0;

async function fishobtainbait(toclose = true) {
    // if it was called too recently, do nothing
    let now = Date.now()
    if (now - lastbaitobtain <= gksettings.delay) {
        return
    }
    mobbox().phaser.scene.worldManager.devices.getDeviceById("7ip7k7AZc9ukQzRuILbRn").interactiveZones.onInteraction()
    await waitForCond(() => {
        return 0 < reactsearch(answertest).length
    });
    await answer()
    if (toclose) {
        function closetest(e) {
            return typeof e.close === "function" && typeof e.questions === "object"
        }

        await waitForCond(() => {
            return 0 < reactsearch(closetest).length
        });
        let close;
        while (0 < (close = reactsearch(closetest)).length) {
            close[0].close()
            await sleep(100)
        }
    }

    lastbaitobtain = Date.now();
}

function fishupgrade() {
    // requires 205 dolar
    // press several upgrade buttons forcefully
    const upgrades = [
        'bS5z588nNdNVjKmZSu8R0', // expert rod
        'laPNTdJHJ9uKzRvXhqL7I', // 1.3x cash
        '249KQe7qAWdJob35wDp2j', // large pack
        'PRvBBHYYn_E1gaC9elMLX', // no wait
        // can be achieved via cheating fr
        // 'nIyk2qCiyPFIRFY0DJfQx', // bolt
    ]
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => upgrades.includes(n.id)).forEach(n => {
        n.interactiveZones.onInteraction()
    })
}


function fishcameraunlock() {
    // unbound camera
    mobbox().phaser.scene.cameras.main.removeBounds()
}

function fishquery() {
    // get fishtopia character data, called on popup initialization
    let mb = mobbox();
    return {
        zoom: mb.phaser.scene.cameras.main.zoom,
        speed: mb.phaser.mainCharacter.physics.movementSpeed,
        x: mb.phaser.mainCharacter.movement.lastSafePosition.x,
        y: mb.phaser.mainCharacter.movement.lastSafePosition.y,
    }
}

// TODO: this shit dont fuckin work!!!
// let fishlooping = false;
//
// async function closeall() {
//     // let mb = mobbox()
//     // mb.phaser.scene.worldManager.devices.getDeviceById(mb.me.deviceUI.deviceId).deviceUI.close()
//     function closetest(e) {
//         return typeof e.close === "function"
//     }
//
//     let close;
//     while (0 < (close = reactsearch(closetest)).length) {
//         close.forEach(c => c.close())
//         await sleep(100)
//     }
// }
//
// async function fishloop() {
//     do {
//         try {
//             mobbox().phaser.scene.worldManager.devices.getDeviceById("7ip7k7AZc9ukQzRuILbRn").interactiveZones.onInteraction()
//
//         } catch (e) {
//
//         }
//         await sleep(100)
//     } while (0 < reactsearch(answertest).length)
//     await sleep(500)
//     for (const item of Array.from(Array(10))) {
//         await anscont()
//     }
//     await closeall()
//     await sleep(500)
//     for (const item of Array.from(Array(10))) {
//         fishatgalaxy()
//     }
//     await sleep(2000)
//     fishsell()
//     fishupgrade()
//     await closeall()
//     await sleep(3000)
// }
//
// async function startfishloop() {
//     fishlooping = true;
//     while (fishlooping) {
//         await fishloop()
//     }
// }

function upgrade() {
    let mb = mobbox()
    let bal = mb.balance.balance;

    let candidates = []
    mb.upgrades.upgrades.filter(upg => upg.name !== "Insurance").forEach(upg => {
        // biggest affordable level
        let bestlevel = upg.levels.findLastIndex(lv => {
            return (0 < lv.price) && (lv.price <= bal)
        })
        let currentlevel = mb.upgrades.upgradeLevels[_.camelCase(upg.name)] - 1
        if (bestlevel > currentlevel) {  // candidate for upgrading is higher than the current level: we can upgrade
            candidates.push({name: upg.name, price: upg.levels[bestlevel].price, level: bestlevel + 1})
        }
    })
    if (candidates.length) {
        let topcandidate = candidates.reduce((a, b) => a.price > b.price ? a : b)
        mb.engine.game.send("UPGRADE_PURCHASED", {upgradeName: topcandidate.name, level: topcandidate.level})
        return true
    }
    return false
}

function gamemode() {
    // find the "MobXProvider" object which contains lots of game info that is very useful for this function
    let ginfo = mobbox()
    if (!ginfo) return "ERROR"
    // attr which exists in all gamemodes except fishtopia
    if (ginfo.gameOptions) {
        // assignments have no special type and appear to only be the classic mode which makes sense
        if (ginfo.gameOptions.type === "assignment") return "MC"
        // unique to each game
        switch (ginfo.gameOptions.specialGameType[0]) {
            // multiple choice/classic
            // all of these gamemodes use the same interface as classic
            case "CLASSIC":
            case "TEAMS":
            case "HUMAN_ZOMBIE_DEFENDING_HOMEBASE":
            case "LAVA":
            case "THANOS":
            case "RICH":
            case "BOSS_BATTLE":
            case "HIDDEN":
            case "DRAINED":
            case "PARDY": // very fancy but uses the same interface
                return "MC"
            // uses classic interface but also see imposter
            case "IMPOSTER":
                return "IMPOSTER"
            // draw game
            case "DRAW":
                return "DRAW"
            default:
                // return ginfo.gameOptions.specialGameType[0];
                return "UNKNOWN"
        }
    } else {
        // prevent error
        if (ginfo.worldOptions && ginfo.worldOptions.itemOptions) {
            // i cant find anything that specifically says fishtopia, so im searching items for bait in case
            // they reuse the framework for future games. hopefully bait is unique to this game
            if (ginfo.worldOptions.itemOptions.some(o => o.id === "bait")) return "FISH"
        }
    }
    return "UNKNOWN"
}

async function answerall() {
    gkanswering = true;
    while (gkanswering) {
        await anscont()
    }
}

// functions called by buttons that dont expect a return
const triggers = {
    answerall: answerall,
    answerallandupgrade: async () => {
        gkanswering = true;
        while (gkanswering) {
            upgrade()
            await anscont()
        }
    },
    upgrade: () => {
        upgrade()
    },
    answerone: () => {
        // if cont button exists
        if (0 < reactsearch(conttest).length) {
            // click it
            cont()
        }
        //answer
        answer()
    },
    cancel: () => {
        gkanswering = false;
    },
    answerdraw: answerdraw,
    fishspawn: fishspawn,
    fishupgrade: fishupgrade,
    fishatgalaxy: fishatgalaxy,
    fishcollisionon: () => {
        fishcollision(true)
    },
    fishcollisionoff: () => {
        fishcollision(false)
    },
    fishrestoredelay: fishrestoredelay,
    fishremovedelay: fishremovedelay,
    fishcameraunlock: fishcameraunlock,
    fishquery: fishquery,
    fishcollect: fishcollect,
    fishallbait: fishallbait,
    fishsell: fishsell,
    fishobtainbait: fishobtainbait,
    revealdraw: revealdraw,

}
// handle messages from the extension
window.addEventListener("message", (event) => {
    // gimkit sends messages too, make sure events have the data we need and are from the popup
    if (event.data.id && event.data.type && event.data.me === "sender") {
        // makes it more readable, this is NOT a promise
        function resolve(msg) {
            // the listener will recieve this message, the receiver thing makes it so it knows to ignore
            window.postMessage({me: "receiver", data: msg, "id": event.data.id})
        }

        const type = event.data.type;
        const data = event.data.data;
        console.debug(event.data)
        switch (type) {
            case "ping":
                // debug for now, may remove but i find it fun
                console.log("GimKit Lock-Pick is connected!")
                resolve("pong")
                break
            case "mode":
                // get gamemode
                resolve(gamemode())
                break
            case "imposters":
                amongus().then(resolve)
                break
            case "draw":
                resolve(drawb64(data))
                break
            case "fishpos":
                resolve(fishteleport(data))
                break;
            case "fishspeed":
                resolve(fishspeed(data))
                break
            case "fishzoom":
                resolve(fishzoom(data))
                break
            case "updatevalue":
                // set config var
                for (const [key, value] of Object.entries(data)) {
                    gksettings[key] = value;
                }
                break;
            case "trigger":
                // call specific function
                let r = triggers[data]();
                if (r && typeof r.then === "function") { // promise
                    r.then(resolve)
                } else {
                    resolve(r)
                }
                break
            default:
                console.warn("Unknown message from GimKit Lock-Pick", event.data)
        }
    }
}, false);