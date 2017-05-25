const bigInt = require("big-integer");
//	Curve Drawing Apparatus

("use strict");

var K10e25 = bigInt("10000000000000000000000000"),
  Kround = bigInt("5000000000000000000000000");

function CurveDrawingApparatus(width, height) {
  this.cwid = width;
  this.chgt = height;
  this.cdim = Math.min(this.cwid, this.chgt);
  this.cscale = Math.floor(this.cdim / 2);
  this.ctrx = Math.floor(this.cwid / 2);
  this.ctry = Math.floor(this.chgt / 2);
  this.currentPen = 'black';
  this.changePaper();
}

//	Set X co-ordinate
CurveDrawingApparatus.prototype.setX = function(x) {
  this.currentX = x;
};

//	Set X co-ordinate
CurveDrawingApparatus.prototype.setY = function(y) {
  this.currentY = y;
};

//	Move, with the pen up, to the current co-ordinates
CurveDrawingApparatus.prototype.moveTo = function() {
  if (this.penDown) {
    this.displayX.push(null);
    this.displayY.push("up");
    this.penDown = false;
  }
  this.startX = this.currentX;
  this.startY = this.currentY;
};

//	Draw, with the pen down, to the current co-ordinates
CurveDrawingApparatus.prototype.drawTo = function() {
  this.displayX.push(this.scaleNum(this.currentX));
  this.displayY.push(this.cdim - this.scaleNum(this.currentY));
  if (!this.penDown) {
    this.penDown = true;
  }
};

//	Change pen to a different colour
CurveDrawingApparatus.prototype.changePen = function(colour) {
  if (this.currentPen != colour) {
    this.currentPen = colour;
    this.displayX.push(null);
    this.displayY.push("pen:" + colour);
  }
};

//	Change paper
CurveDrawingApparatus.prototype.changePaper = function() {
  this.currentX = bigInt.zero;
  this.currentY = bigInt.zero;
  this.startX = bigInt.zero;
  this.startY = bigInt.zero;
  this.penDown = false;
  this.displayX = []; // Display list
  this.displayY = [];
  this.currentPen = "black";
  this.printScreen();
};

CurveDrawingApparatus.prototype.printScreen = function() {
  let svg = `<svg width="${this.cwid}" height="${this.chgt}" xmlns="http://www.w3.org/2000/svg">`;

  //  Replay the display list, drawing vectors on screen
  var opath = false;
  var ncol;
  for (var i = 0; i < this.displayX.length; i++) {
    if (this.displayX[i] === null) {
      if ((ncol = this.displayY[i].match(/^pen:\s*(.*)\s*$/))) {
        this.currentPen = ncol[1];
      }
      if (opath) {
        svg += `" />`;
      }
      opath = false;
    } else {
      if (!opath) {
        svg += `<polyline fill="none" stroke="${this.currentPen}" stroke-width="1" points="`;
      }
      svg += `${this.displayX[i]},${this.displayY[i]} `;
      opath = true;
    }
  }

  if (opath) {
    svg += `" />`;
  }
  svg += `</svg>`;
  return svg;
};

//	Scale a fixed point co-ordinate into a pixel value
CurveDrawingApparatus.prototype.scaleNum = function(v) {
  v = v.multiply(this.cscale).add(Kround.multiply(v.isNegative() ? -1 : 1));
  v = v.divide(K10e25);
  return v.toJSNumber() + this.cscale;
};

module.exports = CurveDrawingApparatus;
