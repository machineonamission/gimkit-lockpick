var ReactDOM = require('react-dom');
(function () {
    var _render = ReactDOM.render;
    ReactDOM.render = function () {
        return arguments[1].react = _render.apply(this, arguments);
    };
})();