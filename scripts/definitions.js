const bigInt = require("big-integer");
//  Global definitions

("use strict");

//  Unicode character escapes.  Named from HTML text entities

exports.C_plusmn = "\xB1"; // Plus or minus sign
exports.C_times = "\xD7"; // Multiplication sign
exports.C_divide = "\xF7"; // Division sign
exports.C_minus = "\u2212"; // Minus sign

//  Global utility functions

//  Return true zero if bigInt is either positive or negative zero
exports.pzero = function(v) {
  return v.isZero() ? bigInt.zero : v;
};

//  Negate a bigInt by subtracting it from zero
const negate = function(v) {
  return bigInt.zero.subtract(v);
};

exports.negate = negate;

//	Edit an integer with commas between thousands
exports.commas = function(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

//  Useful bigInts

const K10e50 = bigInt("100000000000000000000000000000000000000000000000000");
exports.K10e50 = K10e50;
const Km10e50 = negate(K10e50);
exports.Km10e50 = Km10e50;
exports.K10 = bigInt(10);

//operation codes
exports.OP_NONE = 0;
exports.OP_ADD = 1;
exports.OP_SUBTRACT = 2;
exports.OP_MULTIPLY = 3;
exports.OP_DIVIDE = 4;
exports.OP_SHIFT = 5;
