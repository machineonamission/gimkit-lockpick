// set the icon to be enabled on gimkit.com and disabled everywhere else frfr
let rule = {
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostSuffix: 'gimkit.com'},
        })
    ],
    actions: [new chrome.declarativeContent.ShowAction()],
};
chrome.runtime.onInstalled.addListener(function() {
    chrome.action.disable();
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([rule]);
    });
});

