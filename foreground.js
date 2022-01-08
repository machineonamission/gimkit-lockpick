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
    // run proptest() on all react properties and return property objects for all who return true
    // totally inefficient but very dynamic
    // takes 1~13ms depending on hardware, since theres 500ms min delay anyways this probably shouldnt matter
    // if using to
    function test(p) {
        if (p && typeof p === "object" && typeof p.props === "object")
            return proptest(p.props)
        else
            return false
    }

    let porps = [];
    Array.from(document.getElementById("root").getElementsByTagName('*')).forEach(e => {
        let props = reactprops(e);
        if (props && props.children) {
            if (props && props.children && typeof props.children === "object" && props.children.length) {
                return Array.from(props.children).forEach(e => {
                    if (test(e)) {
                        porps.push(e)
                        return true;
                    }
                    return false
                })
            } else {
                if (test(props.children)) {
                    porps.push(props.children)
                    return true;
                }
                return false
            }
        } else {
            return false
        }
    })
    return porps
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

// TODO: fiber.parent goes UP a node, make ✨ new ✨ search function using this