const bigInt = require("big-integer");
//  The Store

("use strict");

function Store(p, a, t) {
  // Annunciator panel, Attendant, Timing
  this.panel = p;
  this.attendant = a;
  this.timing = t;
  this.trace = false;
  this.reset();
}

//  Clear the store
Store.prototype.reset = function() {
  this.rack = [];
  return this;
};

//  Turn trace of store operations on or off
Store.prototype.setTrace = function(t) {
  this.trace = t;
  return this;
};

//  Set column which in the rack to value v.  v may be a number,
//  in which case it is automatically converted to a bigInt.
Store.prototype.set = function(which, v) {
  if (typeof v == "number") {
    v = bigInt(v);
  }
  this.rack[which] = v;
  if (this.trace) {
    this.attendant.traceLog("Store: V" + which + " = " + v.toString());
  }
  this.timing.storePut(which);
};

//  Get the value from column which of the rack.  Columns into
//  which nothing has been stored will return zero.
Store.prototype.get = function(which) {
  var v;

  if (!this.rack[which]) {
    this.set(which, bigInt(0));
  }
  v = this.rack[which];
  if (this.trace) {
    this.attendant.traceLog(
      "Store: Mill <= V" + which + "(" + v.toString() + ")"
    );
  }
  this.timing.storeGet(which);
  return v;
};

module.exports = Store;
