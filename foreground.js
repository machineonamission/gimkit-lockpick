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

let continue_container_selector = "#content > div > div:nth-child(1) > div > div > div:nth-child(2) > div > div > div";
let question_container_selector = "#content > div > div:nth-child(1) > div > div > div:nth-child(2) > div > div";

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

function answer() {
    let props = reactsearch(pr=>{return typeof pr.onQuestionAnswered === "function" && typeof pr.answers === "object"});
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

function cont() {
    let Qholder = document.querySelector(continue_container_selector);
    let props = reactprops(Qholder).children[1].props;
    let handler = props.actions[1].handleClick;
    handler();
}

async function anscont() {
    // sleep
    await sleep(500);
    // wait for function to exist
    let qcont = await waitForCond(() => {
        try {
            let Qholder = document.querySelector(question_container_selector);
            let props = reactprops(Qholder);
            let handler = props.children[1].props.onQuestionAnswered;
            return typeof handler === "function";
        } catch (e) {
            return false
        }
    });
    // call it
    answer(qcont);
    // wait for function to exist
    let ccont = await waitForCond(() => {
        try {
            let Qholder = document.querySelector(continue_container_selector);
            let props = reactprops(Qholder);
            let handler = props.children[1].props.actions[1].handleClick;
            return typeof handler === "function";
        } catch (e) {
            return false
        }
    });
    // call it
    cont(ccont);
}


function reactsearch(proptest) {
    // run proptest() on all react properties and return property objects for all who return true
    // totally inefficient but very dynamic
    function test(p) {
        if (p && typeof p === "object" && typeof p.props === "object")
            return proptest(p.props)
        else
            return false
    }
    let porps = [];
    Array.from(document.getElementById("root").getElementsByTagName('*')).forEach(e => {
        let props = reactprops(e);
        if (props.children) {
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