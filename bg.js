// Declare a rule to enable the action on example.com pages
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

