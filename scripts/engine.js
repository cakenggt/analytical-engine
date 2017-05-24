const bigInt = require("big-integer");

const definitions = require('./definitions');
//  The Analytical Engine

/*  This function connects all of the components of the engine
        into the complete, functioning engine.  Its main function
        is to read cards from the card chain supplied by the card
        reader and direct the operation of the components based
        upon their instructions.  */

("use strict");

function Engine(p, at, mi, st, cr, pr, cda) {
  this.panel = p;
  this.attendant = at;
  this.mill = mi;
  this.store = st;
  this.cardReader = cr;
  this.printer = pr;
  this.curvedraw = cda;
  //        this.punch = new CardPunchingApparatus();
  this.reset();
}

//  Reset the engine
Engine.prototype.reset = function() {
  this.errorDetected = false;
  this.running = false;
  this.trace = false;
  this.cardReader.firstCard();
};

//  Test if an error has occurred
Engine.prototype.error = function() {
  return this.errorDetected;
};

//  Set or clear trace mode
Engine.prototype.setTrace = function(t) {
  this.trace = t;
  this.mill.setTrace(t);
  this.store.setTrace(t);
};

//  Prepare to load a new chain of cards
Engine.prototype.loadNewCards = function() {
  this.errorDetected = false;
  this.attendant.newCardChain();
};

//  Start the engine
Engine.prototype.start = function() {
  this.panel.changeMillRunning((this.running = true));
};

// Runs to completion
Engine.prototype.runToCompletion = function() {
	this.start();
	while(this.processCard()) {}
	this.halt();
}

//  Stop the engine
Engine.prototype.halt = function() {
  this.panel.changeMillRunning((this.running = false));
};

//  If engine running ?
Engine.prototype.isRunning = function() {
  return this.running;
};

//  Notify attendant if an error is detected in the mill
Engine.prototype.errorHalt = function(why, perpetrator) {
  this.attendant.millAbnormality(why, perpetrator);
  this.errorDetected = true;
  this.halt();
};

// Set up to run new chain of cards
Engine.prototype.commence = function() {
  this.attendant.restart();
  this.store.reset();
  this.mill.reset();
  this.curvedraw.changePaper();
  this.cardReader.firstCard();
};

//  Process the next card
Engine.prototype.processCard = function() {
  var cardAvailable = false, halted = false;
  var currentCard;

  if ((currentCard = this.cardReader.nextCard())) {
    var card = currentCard.text;
    var operation = card.length === 0 ? " " : card.charAt(0);
    var prime = false;
    var n = 0;
    var v = bigInt.zero;

    cardAvailable = true;
    if (this.trace) {
      this.attendant.traceLog("Card:  " + currentCard);
    }

    //  Trim possible comment from card

    card = card.replace(/\.\s.*$/, "");

    switch (operation) {
      //  Mill operations (Operation cards)

      case "+":
      case "-":
      case definitions.C_minus:
      case definitions.C_times:
      case "*":
      case "x":
      case definitions.C_divide:
      case "/":
        this.mill.setOperation(operation);
        break;

      case "<":
      case ">":
        card = card.replace(/\s+$/, "");
        if (card.length > 1) {
          n = parseInt(card.substr(1), 10);
        }
        if (isNaN(n) || n < 0 || n > 100) {
          this.errorHalt("Bad stepping up/down card", currentCard);
        }
        this.mill.shiftAxes(operation == "<" ? n : -n);
        break;
      //  Mill to store transfers (Variable cards)


      case "L":
      case "Z":
      case "S":
        prime = false;
        if (card.substr(1).match(/'\s*$/) !== null) {
          prime = true;
        }
        n = parseInt(card.substr(1).match(/\d+/)[0]);
        //console.log("M/S " + operation + " prime " + prime + "  n " + n + " card(" + card + ")");
        if (isNaN(n) || n < 0) {
          this.errorHalt("Bad variable card", currentCard);
          break;
        }

        switch (operation) {
          case "L":
            this.mill.transferIn(this.store.get(n), prime);
            break;

          case "Z":
            this.mill.transferIn(this.store.get(n), prime);
            this.store.set(n, bigInt.zero);
            break;

          case "S":
            this.store.set(n, this.mill.transferOut(prime));
            break;
        }
        break;
      //  Number cards


      case "N":
        n = -1;
        var pn = card.substr(1).match(/(\d+)\s+([\d\+\-\u2212]+)/);
        if (pn) {
          n = parseInt(pn[1], 10);
          pn[2] = pn[2].replace(/^\+/, ""); // bigInt doesn't understand leading + sign...
          pn[2] = pn[2].replace(/^\u2212/, "-"); // ...nor Unicode minus sign
          v = bigInt(pn[2]);
        }
        //                              Defined by the Mill VVVVVV
        if (isNaN(n) || n < 0 || n > 999 || v.abs().compare(definitions.K10e50) >= 0) {
          this.errorHalt("Bad number card", currentCard);
          break;
        }
        this.store.set(n, v);
        break;
      //  Combinatorial cards


      case "C":
        {
          var howMany;
          var withinChain = true;

          if (
            card.length < 4 ||
            (card.charAt(1) != "F" && card.charAt(1) != "B") ||
            (card.charAt(2) != "?" &&
              card.charAt(2) != "1" &&
              card.charAt(2) != "+")
          ) {
            this.errorHalt("Bad combinatorial card", currentCard);
            break;
          }
          howMany = parseInt(card.substring(3).replace(/\s+$/, ""), 10);
          if (isNaN(howMany) || n < 0) {
            this.errorHalt("Bad combinatorial card cycle length", currentCard);
            break;
          }
          if (
            card.charAt(2) == "1" ||
            card.charAt(2) == "+" ||
            this.mill.hasRunUp()
          ) {
            if (card.charAt(1) == "F") {
              withinChain = this.cardReader.advance(howMany);
            } else {
              withinChain = this.cardReader.repeat(howMany);
            }
            if (!withinChain) {
              this.errorHalt("Card chain fell on floor during", currentCard);
              break;
            }
          }
        }
        break;
      //  Control cards


      case "B": // Ring Bell
        this.panel.ringBell();
        break;

      case "P": // Print
        this.mill.print(this.printer);
        break;

      case "H": // Halt
        this.panel.changeMillRunning((this.running = false), card.substring(1));
        halted = true;
        card = card.substr(2).replace(/^\s+/, "");
        card = card.replace(/\s+$/, "");
        if (card !== "") {
          this.attendant.traceLog("Halt: " + card);
        }
        break;
      //  Curve Drawing Apparatus
      case "D":
        if (card.length > 1) {
          switch (card.charAt(1)) {
            case "X":
              this.curvedraw.setX(this.mill.outAxis());
              break;

            case "Y":
              this.curvedraw.setY(this.mill.outAxis());
              break;

            case "+":
              this.curvedraw.drawTo();
              break;

            case "-":
            case definitions.C_minus:
              this.curvedraw.moveTo();
              break;

            case "P":
              this.curvedraw.changePaper();
              break;

            case "C":
              this.curvedraw.changePen(card.substr(2));
              break;

            default:
              this.errorHalt("Bad curve drawing card", currentCard);
              break;
          }
        }
        break;
      //  Attendant action cards


      case "A":
        if (!this.attendant.processActionCard(currentCard, this.printer)) {
          //  Attendant didn't know what to do with card
          this.panel.changeMillRunning((this.running = false));
          this.errorDetected = true;
          break;
        }
        break;
      //  Non-period diagnostic cards


      case "T": // Trace
        this.setTrace(card.length > 1 && card.charAt(1) == "1");
        break;

      case " ":
      case ".": // Comment
        break;

      default:
        this.errorHalt("Unknown operation", currentCard);
        break;
    }
  }
  return cardAvailable && !halted && !this.errorDetected;
};

module.exports = Engine;
