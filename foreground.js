window.lGetEventListeners = window.getEventListeners; //For some reason, getEventListeners is not available unless we do this.
console.log(lGetEventListeners);

function boolxor(bit, mask) {
    return mask ? bit : !bit;
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function waitForCond(condfunc) {
    return new Promise(resolve => {
        if (condfunc()) {
            return resolve(condfunc());
        }

        const observer = new MutationObserver(mutations => {
            if (condfunc()) {
                resolve(condfunc());
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


function reactprops(elem) {
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

function answertest(pr) {
    return typeof pr.onQuestionAnswered === "function" && typeof pr.answers === "object"
}

function answer() {
    // get question container properties
    let props = reactsearch(answertest)[0].props;
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

function conttest(pr) {
    return typeof pr.continueToQuestions === "function"
}

function cont() {
    // find function
    let props = reactsearch(conttest)[0].props;
    // call it
    props.continueToQuestions();
}

async function anscont() {
    // sleep
    await sleep(500);
    // wait for function to exist
    let qcont = await waitForCond(() => {
        return 0 < reactsearch(answertest).length
    });
    // call it
    answer(qcont);
    // wait for function to exist
    let ccont = await waitForCond(() => {
        return 0 < reactsearch(conttest).length
    });
    // call it
    cont(ccont);
}


function reactsearch(proptest) {
    // search all fibers for a specific property which is passed to proptest(), return all which return true
    const searchid = crypto.randomUUID(); // give this search a random ID to assign to searched fibers
    // run proptest() on all react fibers and return property objects for all who return true
    function searchfiber(fiber) {
        if (!fiber) return false;
        // this is WAY faster than adding them to a local list
        if (fiber.searchid === searchid) return false;
        if (!fiber.memoizedProps || typeof fiber.memoizedProps !== "object") return false;
        try {
            if (proptest(fiber.memoizedProps)) matches.push(fiber.memoizedProps);
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
            if(!fiber.return) break;
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
            type: "click",
            view: window,
            isTrusted: true,
            path: [elem],
            target: elem,
        })
    });
}

function drawgameanswer() {
    return reactprops(document.querySelector("#content > div > div:nth-child(1) > div > div > div > div>div>div>div:nth-child(2)")).children.props.term
}
// let gopts = reactsearch((e) => {return typeof e.value.phaser === "object"})[1].value
// camera lock: gopts.phaser.scene.cameras.main._bounds (obj)
// camera zoom: gopts.phaser.scene.cameras.main.zoom = 0.1 (float)
// position: gopts.phaser.mainCharacter.body (.x, .y) (float)
// disable collission: gopts.phaser.mainCharacter.body.body.checkCollision.none = true