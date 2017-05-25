//  Timing
const definitions = require('./definitions');

"use strict";

var tiMillOp = ["", "+", definitions.C_minus, definitions.C_times, definitions.C_divide, "<"];

function Timing() {
  this.Ncols = 1000; // Number of columns in store

  //  Operation times in seconds
  this.AddSubTime = 1; // Add/subtract time
  this.MulBaseTime = 10; // Multiplication base time (regardless of arguments)
  this.MulDigitTime = 1; // Multiplication time per digit of shorter argument
  this.DivBaseTime = 10; // Division base time (regardless of arguments)
  this.DivDigitTime = 1; // Division time per digit count difference of dividend and divisor
  this.ShiftTimeCol = 0.1; // Shift time per column
  this.AdvBackTime = 0.5; // Advance / backing time per card
  this.StoreSlewTime = 0.5; // Store slew time per column
  this.StoreCircular = true; // Are store columns arranged circularly ?
  this.StoreTransferTime = 0.25; // Transfer time between store and mill

  this.reset();
}

//	Reset timing
Timing.prototype.reset = function() {
  this.millOperations = 0; // Number of mill operations
  this.millOp = [0, 0, 0, 0, 0, 0]; // Number of mill operations by type
  this.storeOperations = 0; // Number of store operations
  this.storeOpPut = 0; //  Store puts
  this.storeOpGet = 0; //  Store gets
  this.storeCurCol = 0; //  Current store column
  this.storeSlewCol = 0; //	Number of store column slew operations
  this.cardsProcessed = 0; // Number of cards executed
  this.cardsAdvance = 0; //  Cards advanced past
  this.cardsBack = 0; //  Cards repeated
  this.runTime = 0; // Simulated run time in seconds
};

//	Card Events

//	Process card
Timing.prototype.cardProcess = function() {
  this.cardsProcessed++;
  this.runTime += this.AdvBackTime;
};

//	Advance past cards
Timing.prototype.cardAdvance = function(n) {
  this.cardsAdvance += n;
  this.runTime += n * this.AdvBackTime;
};

//	Back over cards to repeat
Timing.prototype.cardBack = function(n) {
  this.cardsBack += n;
  this.runTime += n * this.AdvBackTime;
};

//	Store Events

//	Generic handling of store operation
Timing.prototype.storeOp = function(col) {
  this.storeOperations++;
  var slew = this.storeCircular
    ? this.colDistMod(col, this.storeCurCol)
    : this.colDistLin(col, this.storeCurCol);
  this.storeSlewCol += slew;
  this.storeCurCol = col;
  this.runTime += this.StoreTransferTime + slew * this.StoreSlewTime;
};

//	Put item in store
Timing.prototype.storePut = function(col) {
  this.storeOpPut++;
  this.storeOp(col);
};

//	Get item from store
Timing.prototype.storeGet = function(col) {
  this.storeOpGet++;
  this.storeOp(col);
};

//	Mill Events

//	Mill operation
Timing.prototype.millOperation = function(which, arg) {
  this.millOperations++;
  this.millOp[which]++;
  switch (which) {
    case definitions.OP_ADD:
    case definitions.OP_SUBTRACT:
      this.runTime += this.AddSubTime;
      break;

    case definitions.OP_MULTIPLY:
      //  Find argument with least number of digits
      var mdig = Math.min(
        arg[0].toString().replace(/\-/, "").length,
        arg[1].toString().replace(/\-/, "").length
      );
      this.runTime += this.MulBaseTime + mdig * this.MulDigitTime;
      //att.traceLog("Mul " + arg[0].toString() + " * " + arg[1].toString() + ":  " +
      //    (this.MulBaseTime + (mdig * this.MulDigitTime)));
      break;

    case definitions.OP_DIVIDE:
      //  Compute number of digits in dividend
      var didig = arg[2].isZero()
        ? arg[0].toString().replace(/\-/, "").length
        : arg[2].toString().replace(/\-/, "").length + 50;
      var dvdig = arg[1].toString().replace(/\-/, "").length;
      var diffdig = Math.max(0, didig - dvdig);
      this.runTime += this.DivBaseTime + this.DivDigitTime * diffdig;
      //att.traceLog("Div " + arg[2].toString() + ":" + arg[0].toString() + " / " + arg[1].toString() + ":  " +
      //    (this.DivBaseTime + (this.DivDigitTime * diffdig)) +
      //    "  " + didig + "  " + dvdig + "  " + diffdig);
      break;

    case definitions.OP_SHIFT:
      this.runTime += Math.abs(arg) * this.ShiftTimeCol;
      break;
  }
};

//	Report accumulated statistics and timings
Timing.prototype.report = function() {
  var s = "", i;

  s += "Cards read: " + definitions.commas(this.cardsProcessed) + "\n";
  s += "    Advanced:  " + definitions.commas(this.cardsAdvance) + "\n";
  s += "    Backed:    " + definitions.commas(this.cardsBack) + "\n";

  s += "Mill operations: " + definitions.commas(this.millOperations) + "\n";
  for (i = 1; i < this.millOp.length; i++) {
    s += "    " + tiMillOp[i] + "  " + definitions.commas(this.millOp[i]) + "\n";
  }

  s += "Store operations: " + definitions.commas(this.storeOperations) + "\n";
  s += "    Put:  " + definitions.commas(this.storeOpPut) + "\n";
  s += "    Get:  " + definitions.commas(this.storeOpGet) + "\n";
  s += "    Slew: " + definitions.commas(this.storeSlewCol) + " columns\n";

  var days = Math.floor(this.runTime / (24 * 60 * 60)),
    secs = Math.floor(this.runTime % (24 * 60 * 60));
  var d = new Date(secs * 1000);
  s +=
    "Total running time: " +
    definitions.commas(Math.round(this.runTime)) +
    " seconds (" +
    (days > 0 ? days + " days " : "") +
    d.toISOString().substr(11, 8) +
    ").";
  return s;
};

//  Modulus of Euclidian division
Timing.prototype.eucMod = function(a, n) {
  return a - n * Math.floor(a / n);
};

//  Distance between columns for rotary store
Timing.prototype.colDistMod = function(col1, col2) {
  return Math.min(
    this.eucMod(col1 - col2, this.Ncols),
    this.eucMod(col2 - col1, this.Ncols)
  );
};

//  Distance between columns for linear store
Timing.prototype.colDistLin = function(col1, col2) {
  return Math.abs(col1 - col2);
};

module.exports = Timing;
