const networkFilters = {
    urls: [
        "wss://*.gimkitconnect.com/*",
        "ws://*.gimkitconnect.com/*"
    ]
};
chrome.webRequest.onCompleted.addListener((details) => {
    console.log(details);
}, networkFilters);
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(request, sender, sendResponse)
    }
);