//  The Printer

"use strict";

function Printer() {
  this.O_output = "";
}

//  Append text to the Printer
Printer.prototype.output = function(s) {
  this.O_output += s;
};

module.exports = Printer;
