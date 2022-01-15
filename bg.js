function declarcontent() {
    // set the icon to be enabled on gimkit.com and disabled everywhere else
    let rule = {
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostSuffix: 'gimkit.com'},
            })
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
    };
    chrome.action.disable();
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([rule]);
    });
}
chrome.runtime.onStartup.addListener(declarcontent);
chrome.runtime.onInstalled.addListener(declarcontent);

