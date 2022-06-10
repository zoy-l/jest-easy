"use strict";

var _jestRun = _interopRequireDefault(require("./jestRun"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const args = process.argv.slice(2);
const arg = {};
const _ = [];
args.forEach(c => {
  if (c.indexOf('-') > -1) {
    arg[c.replace(/-/g, '')] = true;
  } else {
    _.push(c);
  }
});
(0, _jestRun.default)(_extends({
  _
}, arg));