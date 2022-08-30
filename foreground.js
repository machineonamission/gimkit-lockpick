let gksettings = {
    delay: 1000,
    "phaser-no-stop": false,
    "ff-delay": 500,
    "ff-radius": 400
}
let gkanswering = false;
let gkfishing = false;
let gkfield = false;
let alwaysontop = false;

// let origAEL = EventTarget.prototype.addEventListener;
// const blurevents = [
//     "visibilitychange",
//     "webkitvisibilitychange",
//     "mozvisibilitychange",
//     "msvisibilitychange",
//     "blur",
//     // "onMouseLeave"
// ]
// // document.visibilityState
// EventTarget.prototype.addEventListener = function (type, listener, options) {
//     if (blurevents.includes(type)) {
//         console.log(this, type, listener, options);
//         let newlistener = (...args) => {
//             console.log(args);
//             if (!alwaysontop) {
//                 return listener(...args);
//             } else {
//                 args[0].stopImmediatePropagation();
//                 args[0].stopPropagation();
//             }
//         }
//         origAEL(type, newlistener, options);
//     } else {
//         origAEL(type, listener, options);
//     }
// }

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

function getanswers() {
    let methods = [
        function () { // new classic
            return mobbox().questions.currentQuestion.answers;
        },
        function () { // new phaser
            // questions are stored as string in the question overworld object in phaser
            let ow_object = mobbox().phaser.scene.worldManager.devices.allDevices.filter(e => {
                return e.deviceOption.id === "gimkitLiveQuestion"
            })[0];
            // parse json
            let allanswers = JSON.parse(ow_object.state.questions);
            // filter this object for the current question
            return allanswers.find(a => {
                return a._id === ow_object.currentQuestionId;
            }).answers;
        },
        function () { // old approach (BROKEN)
            let props = reactsearch(answertest)[0];
            return props.answers;
        }
    ]
    let errors = []
    for (const method of methods) {
        try {
            return method()
        } catch (e) {
            errors.push(e)
        }
    }
    console.error("unable to get questions", errors)
}

function answerobj(pr) {
    // function for reactsearch() to find object with answers and submit func
    // no idea what eas is but for some reason it's the correct one
    return typeof pr.onQuestionAnswered === "function" && typeof pr.eas === "string";
}

function answer() {
    // get question container properties
    let props = reactsearch(answerobj);
    if (!props.length) {
        console.warn("no answer object found")
        return
    } else {
        props = props[0]
    }
    // handler to answer question
    let handler = props.onQuestionAnswered;
    // Q answers
    let answers = getanswers();
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
    let props = reactsearch(conttest);
    // if exists
    if (props.length) {
        // call it
        props[0].continueToQuestions();
    } else {
        console.warn("no continue object found")
    }
}

async function anscont() {
    // debug for unhide()
    const now = new Date();


    let answerexists = false;
    let contexists = false;

    // wait for either to exist
    await waitForCond(() => {
        contexists = 0 < reactsearch(conttest).length;
        answerexists = 0 < reactsearch(answerobj).length;
        return contexists || answerexists;
    });
    if (contexists) {
        // console.log(`trying to continue at ${now.getMinutes()}:${now.getSeconds()}`, [document.visibilityState, document.hidden])
        // continue
        cont();
    } else if (answerexists) {
        // console.log(`trying to answer at ${now.getMinutes()}:${now.getSeconds()}`, [document.visibilityState, document.hidden])
        // answer it
        answer();
    }
    // sleep predefined value
    await sleep(gksettings.delay / 2);

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
    // mobbox().phaser.mainCharacter.movement.moveInstantly(pos)
    // mobbox().phaser.mainCharacter.movement.setTargetX(pos.x)
    // mobbox().phaser.mainCharacter.movement.setTargetY(pos.y)
    mobbox().phaser.mainCharacter.body.setPosition(pos.x, pos.y)
    // mobbox().phaser.mainCharacter.movement.moveToTargetPosition(16)
    // mobbox().phaser.network.sendUpdate()
}

function fishspawn() {
    // fishtopia teleport to spawn
    let mb = mobbox()
    mb.phaser.mainCharacter.movement.moveInstantly(mb.me.spawnPosition)
}

let bodies = []

function fishcollision(enabled) {
    // fishtopia toggle colission
    let mb = mobbox()
    // disables wall/water collision
    if (enabled) {
        // dont think this works but it doesnt matter because anticheat
        mb.phaser.scene.worldManager.physics.bodiesManager.staticBodies = [...bodies]
    } else {
        if (mb.phaser.scene.worldManager.physics.bodiesManager.staticBodies && !bodies) {
            bodies = [...mb.phaser.scene.worldManager.physics.bodiesManager.staticBodies]
        }
        for (const body of mb.phaser.scene.worldManager.physics.bodiesManager.staticBodies) {
            mb.phaser.scene.worldManager.physics.destroyBody(body)
        }
    }
    // disables all object collision
    // mb.phaser.mainCharacter.body.body.checkCollision.none = !enabled
}

function fishspeed(s) {
    // fishtopia movement speed
    mobbox().phaser.mainCharacter.physics.setMovementSpeed(s)
}

function phaserinterceptstop() {
    // intercept movement speed stops
    let mb = mobbox();
    if (!mb.hasOwnProperty("phaser")) {
        return
    }
    let phys = mb.phaser.mainCharacter.physics;
    // copy original function
    let origfunc = phys.setMovementSpeed;
    // override phaser call
    phys.setMovementSpeed = function (speed) {
        // don't let orig function go through if it tries to freeze when not wanted
        if (!(speed === 0 && gksettings["phaser-no-stop"])) {
            origfunc(speed)
        }
    }
    // if (phys.movementSpeed === 0 && gksettings["phaser-no-stop"]) {
    //     phys.movementSpeed = 310;
    // }
}

async function phaserskin(skin) {
    let mb = mobbox()
    mb.phaser.mainCharacter.skin.updateSkin(skin);
    await sleep(500);
    return mb.phaser.mainCharacter.skin.skinId;
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

async function collectandsell() {
    while (mobbox().phaser.scene.worldManager.devices.allDevices.filter(n => n.deviceOption.id === "droppedItem").length > 0) {
        fishcollect()
        await sleep(1000)
        fishsell()
        await sleep(1000)
    }
}

function fishsell() {
    // forcefully call the function to fish at one of the space cove things
    mobbox().phaser.scene.worldManager.devices.getDeviceById("3QhiGURlzHf7wQ3xVliTO").interactiveZones.onInteraction()
}

function fishatgalaxy() {
    // forcefully call the function to fish at lucky lake
    // called galaxy cause galaxy cove whatever used to be the best
    mobbox().phaser.scene.worldManager.devices.getDeviceById("Vhe-c_2os2_TjHBT4_2g3").interactiveZones.onInteraction()
    // sendToServerDevice("interacted", undefined)
}

let lastbaitobtain = 0;

async function openquestions() {
    if (reactsearch(answerobj).length > 0) {
        return // already open
    }
    mobbox().phaser.scene.worldManager.devices.getDeviceById("7ip7k7AZc9ukQzRuILbRn").interactiveZones.onInteraction()
    await waitForCond(() => {
        return 0 < reactsearch(answerobj).length
    });
}

async function fishobtainbait(toclose = true) {
    // if it was called too recently, do nothing
    let now = Date.now()
    if (now - lastbaitobtain <= gksettings.delay) {
        return
    }
    await openquestions()
    await answer()
    if (toclose) {
        await sleep(500)
        function closetest(e) {
            return typeof e.close === "function"
        }
        while(reactsearch(closetest).length === 0) {
            await sleep(100)
        }
        while(reactsearch(closetest).length > 0) {
            reactsearch(closetest)[0].close()
            await sleep(100)
        }
    }

    lastbaitobtain = Date.now();
}

async function fishloop() {
    gkfishing = true;
    let xpath = "//span[text()='Close']";
    let matchingElement;
    while (gkfishing) {
        await fishobtainbait(true)
        await sleep(500)
        fishatgalaxy()
        await sleep(500)
        matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        matchingElement.click()
        await sleep(500)
        await fishsell()
        await sleep(500)
    }
}

function fishstoploop() {
    gkfishing = false;
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
        x: mb.phaser.mainCharacter.body.x,
        y: mb.phaser.mainCharacter.body.y,
        camx: mb.phaser.scene.cameras.main.midPoint.x,
        camy: mb.phaser.scene.cameras.main.midPoint.y,
        skin: mb.phaser.mainCharacter.skin.skinId
    }
}

// doesnt work
// function tagnokick() {
//     mobbox().phaser.scene.worldManager.devices.allDevices.filter(a => a.name === "kickOutOfBase").forEach(a => {
//         a.input.disable();
//         a.input.dispose();
//     })
// }

function phaserstopfollow() {
    mobbox().phaser.scene.cameras.main.stopFollow();
}

function phaserfollow() {
    let mb = mobbox()
    phaserstopfollow();
    mb.phaser.scene.cameras.main.startFollow(mb.phaser.mainCharacter.body, false, 0.15, 0.15, undefined, undefined);
}

function phasercameragoto(pos) {
    mobbox().phaser.scene.cameraHelper.goTo(pos)
}


async function tagall() {
    for (let char of mobbox().phaser.scene.characterManager.characters) {
        char = char[1]
        if (char.indicator.isRunning && char.indicator.teamState != "ally") {
            console.log(char.nametag.name)
        }
    }
}



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
        if (ginfo.world && ginfo.world.terrain && ginfo.world.terrain.tiles) {
            // best way i can think to identify world, make list of unique tiles
            let uniquetiles = new Set()
            for (const key of ginfo.world.terrain.tiles) {
                uniquetiles.add(key[1].terrain)
            }
            const fishtiles = [
                "Water Dark",
                "Boardwalk",
                "Exposed Boardwalk",
                "Water",
                "Purple Sand",
                "Purple Grass",
                "Water Purple",
                "Sand",
                "Space Rock",
                "Water Space",
                "Space",
                "Grass",
                "Marble Stone"
            ]
            const tagtiles = [
                "Plastic Purple",
                "Marble Stone",
                "Marble Stone Dark",
                "Cinema",
                "Space Rock",
                "Concrete",
                "Grass",
                "Plastic Red",
                "Plastic Green",
                "Gym Floor",
                "Disco",
                "Light Scraps"
            ]
            const flagtiles = [
                "Light Scraps",
                "Dark Scraps",
                "Plastic Blue",
                "Marble Stone",
                "Marble Stone Dark",
                "Grass"
            ]
            if (uniquetiles.has("Sand") && uniquetiles.has("Boardwalk") && uniquetiles.has("Water Space")) {
                return "FISH"
            }
            if (uniquetiles.has("Cinema") && uniquetiles.has("Plastic Purple")) {
                return "TAG"
            }
            if (uniquetiles.has("Light Scraps") && uniquetiles.has("Dark Scraps") && uniquetiles.has("Plastic Blue")) {
                return "FLAG"
            }
            return "PHASER"
        }
    }
    return "UNKNOWN"
}

async function answerall() {
    gkanswering = true;
    answer();
    while (gkanswering) {
        await anscont()
    }
}

function naivedist(a, b) {
    // pythagorean distance without sqrt useful for comparing distances


    return a ** 2 + b ** 2
}

async function tagfield() {
    gkfield = true;
    let mb = mobbox();
    const iterations = 10;
    while (gkfield) {
        let changesmade = false;
        let me = {
            x: mb.phaser.mainCharacter.movement.lastSafePosition.x,
            y: mb.phaser.mainCharacter.movement.lastSafePosition.y
        }
        let points = []
        for (let char of mb.phaser.scene.characterManager.characters) {
            char = char[1]
            if (char.indicator.teamState !== "ally") {
                points.push({
                    x: char.movement.targetX,
                    y: char.movement.targetY
                })
            }
        }
        for (let i = 0; i < iterations; i++) {
            let closest = points.reduce((a, b) => {
                return naivedist(me.x - a.x, me.y - a.y) < naivedist(me.x - b.x, me.y - b.y) ? a : b
            });
            let hypot = Math.hypot(me.x - closest.x, me.y - closest.y);
            if (hypot >= gksettings["ff-radius"]) break
            // basically move to closest edge of closest circle Proooooobably
            changesmade = true
            let ratio = (gksettings["ff-radius"] + 10) / hypot;
            me.x = closest.x - ((closest.x - me.x) * ratio)
            me.y = closest.y - ((closest.y - me.y) * ratio)
        }
        if (changesmade) {
            fishteleport(me)
        }

        await sleep(gksettings["ff-delay"])
    }
}

function tagnofield() {
    gkfield = false;
}

function unhide() {
    // make gimkit think it's always on top
    alwaysontop = true;
    delete document.visibilityState;
    Object.defineProperty(document, 'visibilityState', {
        get: function () {
            return "visible"
        },
        set: () => {
        }
    });
    delete document.hidden;
    Object.defineProperty(document, 'hidden', {
        get: function () {
            return false
        },
        set: () => {
        }
    });
}

let origname;
let namescrambling;

function phasernameshow() {
    if (origname) {
        mobbox().phaser.mainCharacter.nametag.tag.text = origname;
    }
    namescrambling = false;
}

function phasernamehide() {
    let mb = mobbox()
    if (!origname) {
        origname = mb.phaser.mainCharacter.nametag.tag.text;
    }
    mb.phaser.mainCharacter.nametag.tag.text = "";
    namescrambling = false;
    rainbowing = false;
}

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function phasernamescramble() {
    if (!namescrambling) {
        namescrambling = true;
        if (!origname) {
            origname = mobbox().phaser.mainCharacter.nametag.tag.text;
        }
        while (namescrambling) {
            mobbox().phaser.mainCharacter.nametag.tag.text = makeid(origname.length);
            await sleep(100);
        }
    }
}


// https://krazydad.com/tutorials/makecolors.php
function RGB2Color(r, g, b) {
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}

// input: h in [0,1] and s,v in [0,1] - output: r,g,b in [0,266]
function hsv2rgb(h, s, v) {
    let f = (n, k = (n + (h * 360) / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5) * 255, f(3) * 255, f(1) * 255];
}

function rainbowatpoint(i) {
    // weird constant brightness rainbow, feels less jank
    // from https://krazydad.com/tutorials/makecolors.php
    const frequency = 2 * Math.PI;
    let red = Math.sin(frequency * i) * 127.5 + 127.5;
    let green = Math.sin((frequency * i) + (2 * Math.PI / 3)) * 127.5 + 127.5;
    let blue = Math.sin((frequency * i) + (4 * Math.PI / 3)) * 127.5 + 127.5;

    // traditional HSV
    // let cols = hsv2rgb(i, 1, 1);
    // let red = cols[0];
    // let green = cols[1];
    // let blue = cols[2];

    return RGB2Color(red, green, blue)
}


let rainbowing = false;

async function phaserrainbow() {
    if (!rainbowing) {
        rainbowing = true;
        let rainbowindex = 0;
        while (rainbowing) {
            mobbox().phaser.mainCharacter.nametag.tag.setColor(rainbowatpoint(rainbowindex));
            rainbowindex += 1 / 120;
            await sleep(1000 / 60);
        }
    }
}

function phasernorainbow() {
    rainbowing = false;
    mobbox().phaser.mainCharacter.nametag.updateFontColor();
}

// TODO: skin change client side

// functions called by buttons that dont expect a return
const triggers = {
    phaserrainbow: phaserrainbow,
    phasernorainbow: phasernorainbow,
    phasernameshow: phasernameshow,
    phasernamehide: phasernamehide,
    phasernamescramble: phasernamescramble,
    answerall: answerall,
    answerallandupgrade: async () => {
        gkanswering = true;
        answer();
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
    phaserstopfollow: phaserstopfollow,
    phaserfollow: phaserfollow,
    tagfield: tagfield,
    tagnofield: tagnofield,
    unhide: unhide,
    openquestions: openquestions,
    collectandsell: collectandsell,
    fishloop: fishloop,
    fishstoploop: fishstoploop
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
            case "campos":
                resolve(phasercameragoto(data))
                break;
            case "fishspeed":
                resolve(fishspeed(data))
                break
            case "fishzoom":
                resolve(fishzoom(data))
                break
            case "phaserskin":
                phaserskin(data).then(resolve)
                break
            case "updatevalue":
                // set config var
                for (const [key, value] of Object.entries(data)) {
                    gksettings[key] = value;
                    // i dont care if this is jank im lazy
                    if (key === "phaser-no-stop") {
                        phaserinterceptstop();
                    }
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