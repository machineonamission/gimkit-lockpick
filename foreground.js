window.lGetEventListeners = window.getEventListeners; //For some reason, getEventListeners is not available unless we do this.
console.log(lGetEventListeners);
function boolxor(bit, mask) {
    return mask ? bit : !bit;
}

function waitForElm(selector, removal = false) {
    return new Promise(resolve => {
        if (boolxor(document.querySelector(selector), removal)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (boolxor(document.querySelector(selector), removal)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

let container = null;

function answersfromquestiondom(elem) {
    for (let o in elem) {
        if (o.startsWith("__reactProps")) {
            return _.cloneDeep(elem[o].children[1].props.answers);
        }
    }
}

waitForElm(".enter-done").then(elem => {
    answersfromquestiondom(elem)
    container = elem.parentElement
})
// some thing that seems to be anticheat
document.removeEventListener("click", lGetEventListeners(document).click[1].listener)