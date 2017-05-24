//  The Annunciator Panel

"use strict";

function Annunciator() {
  this.L_output = "";
  this.A_panel = "";
  this.M_ingress = [];
  this.M_egress = [];
  this.M_op = "";
  this.M_runup = "";
  this.M_runstop = "";

  this.tracing = false;
  this.animating = false;
  this.override = false;
  this.watch = false;
  this.bellSound = null;
  this.audioVolume = 0.3;
  this.panelShowing = true;

  this.cardChain = null; // Card chain for panel display
  this.currentCard = 0;
}

Annunciator.prototype.setBellSound = function(soundfile) {
  console.log("Function disabled");
};

//  Ring the bell
Annunciator.prototype.ringBell = function() {
  console.log("Bell ring!");
};

//  Append a message to the Attendant's Log
Annunciator.prototype.attendantLogMessage = function(s) {
  this.L_output += s;
};

//  Write an item to the Mill operation trace
Annunciator.prototype.attendantWriteTrace = function(s) {
  this.attendantLogMessage(s);
};

//  Decide whether the attendant is watching the panel
Annunciator.prototype.watchMan = function() {
  this.watch = this.tracing || this.animating || this.override;
  return this.watch;
};

//  Set or clear tracing
Annunciator.prototype.setTrace = function(t) {
  this.tracing = t;
  this.watchMan();
};

//  Set or clear animating
Annunciator.prototype.setAnimate = function(t) {
  this.animating = t;
  this.watchMan();
};

//	Set or clear status display override
Annunciator.prototype.setOverride = function(t) {
  this.override = t;
  this.watchMan();
};

//  Set or clear annunciator panel visible
Annunciator.prototype.setPanelShowing = function(t) {
  this.panelShowing = t;
  this.watchMan();
};

//  Mount new chain in card reader display
Annunciator.prototype.mountCardReaderChain = function(chain) {
  this.cardChain = chain;
  this.currentCard = 0;
};

//  Change Mill ingress axis value
Annunciator.prototype.changeIngress = function(which, v) {
  if (this.watch) {
    this.M_ingress[which] = v.toString();
  }
};

//  Change Mill egress axis value
Annunciator.prototype.changeEgress = function(which, v) {
  if (this.watch) {
    this.M_egress[which] = v.toString();
  }
};

//  Change current Mill operation
Annunciator.prototype.changeOperation = function(op) {
  if (this.watch) {
    this.M_op = op == "-" ? C_minus : op;
  }
};

//  Change state of Mill run up lever
Annunciator.prototype.changeRunUp = function(runup) {
  if (this.watch) {
    this.M_runup = runup ? "Set" : "Not set";
  }
};

//  Change Mill run/stop state
Annunciator.prototype.changeMillRunning = function(run) {
  if (this.watch) {
    this.M_runstop = run ? "Running" : "Stopped";
  }
};

module.exports = Annunciator;
