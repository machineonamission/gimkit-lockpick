let gksocket = null;
let gkonmessage = null;
const nativeWebSocket = window.WebSocket;
let wssend = WebSocket.prototype.send;
// log send
WebSocket.prototype.send = function (msg) {
    console.log('>>', msg);
    return wssend.call(this, msg);
}
// hook into and log onmessage
let omiv = setInterval(() => {
    if (gksocket && typeof gksocket.onmessage === "function") {
        gkonmessage = gksocket.onmessage;
        gksocket.onmessage = (messageevent) => {
            try {
                console.log("<<", messageevent.data)
            } catch (e) {
                console.error(e)
            } finally {
                return gkonmessage.apply(this, [messageevent]);
            }
        }
        window.clearInterval(omiv);
    }
}, 100);
// add all created WebSocket objects to sockets
window.WebSocket = function (...args) {
    const socket = new nativeWebSocket(...args);
    gksocket = socket;
    return socket;
};