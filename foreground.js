let gksettings = {}
let gkanswering = false;

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function waitForCond(condfunc) {
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
    for (let o in elem) {
        if (o.startsWith("__reactFiber")) {
            return elem[o]
        }
    }
    return null
}

function mobbox() {
    // find the "MobXProvider" object which contains lots of game info that is very useful
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
    return typeof pr.onQuestionAnswered === "function" && typeof pr.answers === "object"
}

function answer() {
    // get question container properties
    let props = reactsearch(answertest)[0];
    // handler to answer question
    let handler = props.onQuestionAnswered;
    // Q answers
    let answers = props.answers;
    // find correct answer
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
    let mb = mobbox()
    const term = mb.draw.round.term;
    mb.engine.game.send("DRAW_MODE_GUESS", term)
}

function conttest(pr) {
    return typeof pr.continueToQuestions === "function"
}

function cont() {
    // find function
    let props = reactsearch(conttest)[0];
    // call it
    props.continueToQuestions();
}

async function anscont() {
    // if cont button exists
    if (0 < reactsearch(conttest).length) {
        // click it
        cont()
    }
    // wait for function to exist
    await waitForCond(() => {
        return 0 < reactsearch(answertest).length
    });
    // call it
    answer();
    // wait for function to exist
    await waitForCond(() => {
        return 0 < reactsearch(conttest).length
    });
    // call it
    cont();
    // sleep
    await sleep(gksettings.delay);
}

function reactsearch(proptest, returnentirefiber = false) {
    // search all fibers for a specific property which is passed to proptest(), return all which return true
    const searchid = crypto.randomUUID(); // give this search a random ID to assign to searched fibers
    // run proptest() on all react fibers and return property objects for all who return true
    function searchfiber(fiber) {
        if (!fiber) return false;
        // this is WAY faster than adding them to a local list
        if (fiber.searchid === searchid) return false;
        if (!fiber.memoizedProps || typeof fiber.memoizedProps !== "object") return false;
        try {
            if (proptest(fiber.memoizedProps)) {
                if (returnentirefiber) {
                    matches.push(fiber);
                } else {
                    matches.push(fiber.memoizedProps);
                }

            }
        } catch (e) {

        } finally {
            fiber.searchid = searchid
        }
    }

    let matches = [];
    Array.from(document.getElementById("root").getElementsByTagName('*')).forEach(e => {
        // search all html element's fibers
        let fiber = reactfiber(e);
        if (!fiber) return false;
        searchfiber(fiber);
        // some fibers don't have html elements and traversing down with fiber.child can fail. use fiber.return which
        // goes up and always works to get almost all fibers
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
    window.getEventListeners(document.getElementById("root")).click.forEach(listener => {
        listener.listener({
            type: "click", view: window, isTrusted: true, path: [elem], target: elem,
        })
    });
}

async function amongus() {
    // get all roles for amogus mode
    let ginfo = mobbox()
    let people = _.cloneDeep(ginfo.imposter.people);
    // people might not be loaded especially when rejoining
    if (people.length) { // if loaded return gracefully
        return people
    } else {
        // if not loaded, ask for people and wait until it resolves
        ginfo.engine.game.send("IMPOSTER_MODE_REQUEST_PEOPLE", undefined)
        // send returns undefined and has no easy way to intercept callback
        while (true) {
            people = _.cloneDeep(ginfo.imposter.people);
            if (people.length) {
                return people
            }
            await sleep(100)
        }
    }
    // engine.game.send("IMPOSTER_MODE_REQUEST_PEOPLE", undefined)
}

function drawb64(data) {
    const canv = reactsearch((e) => {
        return (e.canEdit === true && typeof e.canvasRef === "object")
    })[0]
    canv.emitImage(data);
    canv.canvasRef.current.drawImage(data);
    return true
}

function fishteleport(pos) {
    mobbox().phaser.mainCharacter.movement.moveInstantly(pos)
}

function fishspawn() {
    let mb = mobbox()
    mb.phaser.mainCharacter.movement.moveInstantly(mb.me.spawnPosition)
}

function fishcollision(enabled) {
    let mb = mobbox()
    if (enabled) {
        mobbox().phaser.mainCharacter.collision.enableCollision()
    } else {
        mobbox().phaser.mainCharacter.collision.disableCollision()
    }
    mb.phaser.mainCharacter.body.body.checkCollision.none = !enabled
}

function fishspeed(s) {
    mobbox().phaser.mainCharacter.physics.setMovementSpeed(s)
}

function fishzoom(z) {
    mobbox().phaser.scene.cameras.main.zoom = z
}

function fishremovedelay() {
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.interactiveZones.isInteractive()).forEach(d => {
        d.interactiveZones.setDelay(0)
    })
}

function fishrestoredelay() {
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.interactiveZones.isInteractive()).forEach(d => {
        d.interactiveZones.setDelay(d.options.interactionDuration)
    })
}

function fishatgalaxy() {
    mobbox().phaser.scene.worldManager.devices.getDeviceById("Y5Mw3gytkmkflOrOXgEi8").interactiveZones.onInteraction()
}

function fishupgrade() {
    // requires 205 dolar
    const upgrades = [
        '249KQe7qAWdJob35wDp2j', // large pack
        'bS5z588nNdNVjKmZSu8R0', // expert rod
        'laPNTdJHJ9uKzRvXhqL7I', // 1.3x cash
        // can be achieved via cheating fr
        // 'PRvBBHYYn_E1gaC9elMLX', // no wait
        // 'nIyk2qCiyPFIRFY0DJfQx', // bolt
    ]
    mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => upgrades.includes(n.id)).forEach(n => {
        n.interactiveZones.onInteraction()
    })
}

function fishcameraunlock() {
    mobbox().phaser.scene.cameras.main.removeBounds()
}

function fishquery() {
    let mb = mobbox();
    return {
        zoom: mb.phaser.scene.cameras.main.zoom,
        speed: mb.phaser.mainCharacter.physics.movementSpeed,
        x: mb.phaser.mainCharacter.movement.lastSafePosition.x,
        y: mb.phaser.mainCharacter.movement.lastSafePosition.y,
    }
}

function gamemode() {
    // find the "MobXProvider" object which contains lots of game info that is very useful for this function
    let ginfo = mobbox()
    if (!ginfo) return "ERROR"
    if (ginfo.gameOptions) {
        // assignments have no special type and appear to only be the classic mode which makes sense
        if (ginfo.gameOptions.type === "assignment") return "MC"
        switch (ginfo.gameOptions.specialGameType[0]) {
            // MC: CLASSIC, TEAMS, IMPOSTER, HUMAN_ZOMBIE_DEFENDING_HOMEBASE, LAVA, THANOS, RICH, BOSS_BATTLE, HIDDEN, DRAINED
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
            case "IMPOSTER":
                return "IMPOSTER"
            // other: DRAW
            case "DRAW":
                return "DRAW"
            default:
                // this will probably cause problems in the future but idk if i want to set it to UNKNOWN
                return ginfo.gameOptions.specialGameType[0];
        }
    } else {
        if (ginfo.worldOptions && ginfo.worldOptions.itemOptions) {
            // i cant find anything that specifically says fishtopia, so im searching items for bait in case
            // they reuse the framework for future games. hopefully bait is unique to this game

            // separate from MC because there is potential for fishtopia unique hacks like teleportation
            if (ginfo.worldOptions.itemOptions.some(o => o.id === "bait")) return "FISH"
        }
    }
    return "UNKNOWN"
}

// functions called by buttons
const triggers = {
    answerall: async () => {
        gkanswering = true;
        while (gkanswering) {
            await anscont()
        }
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
    fishquery: fishquery

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