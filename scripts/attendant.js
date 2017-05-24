const fs = require("fs");
const path = require("path");
const bigInt = require("big-integer");

const Program = require('./program');
const CardSource = Program.CardSource;
const Card = Program.Card;

//  The Attendant

("use strict");

function Attendant(p, t) {
  this.panel = p;
  this.timing = t;
  this.reset();
}

//  Reset to starting conditions
Attendant.prototype.reset = function() {
  this.newCardChain();
  this.timing.reset();
  this.allowFileInclusion = false;
  this.annotationDevice = null;

  this.Source = new CardSource("Attendant", -1);
  this.addComments = true;
  this.libraryTemplate = null;
  this.libLoadStatus = 0; // Library load status: 0 = idle, 1 = pending, 2 = error
  this.allowFileInclusion = false;

  this.restart();
};

//	Reset modes to defaults at start of card chain
Attendant.prototype.restart = function() {
  this.writeDown = true;
  this.numberPicture = null;
};

//  Begin a new chain of cards
Attendant.prototype.newCardChain = function() {
  this.cardChain = [];
  this.ncards = 0;
  this.errorDetected = false;
};

//  Append a card to the card chain
Attendant.prototype.appendCard = function(ctext, sname, sindex) {
  var cardSource = new CardSource(sname, sindex);
  var card = new Card(ctext, this.ncards, cardSource);
  this.cardChain[this.ncards++] = card;
};

//  Issue a complaint when an error is found in the card chain
Attendant.prototype.complain = function(c, s) {
  this.panel.attendantLogMessage(c + "\n");
  this.panel.attendantLogMessage(s + "\n");
  this.errorDetected = true;
};

//  Dump the card chain to the Attendant's log for debugging
Attendant.prototype.logCards = function() {
  for (var i = 0; i < this.cardChain.length; i++) {
    this.traceLog(this.cardChain[i].toString());
  }
  if (this.ncards != this.cardChain.length) {
    this.traceLog(
      "ncards (" +
        this.ncards +
        " disagrees with this.cardChain.length (" +
        this.cardChain.length +
        ")"
    );
  }
};

/*  Test whether this card marks the end of a cycle
        which is to be translated into combinatorial
        cards.  */
Attendant.prototype.isCycleStart = function(c) {
  var s = c.text;

  return s.length > 0 && (s.charAt(0) == "(" || s.charAt(0) == "{");
};

//  Test whether this card marks the end of a cycle.
Attendant.prototype.isCycleEnd = function(c) {
  var s = c.text;

  return s.length > 0 && (s.charAt(0) == ")" || s.charAt(0) == "}");
};

//  Test whether card is a comment.
Attendant.prototype.isComment = function(c) {
  var s = c.text;

  return s.length < 1 || s.charAt(0) == "." || s.charAt(0) == " ";
};

/*
  Translate a cycle into equivalent combinatorial
  cards the Mill can process.  If addComments
  is set the original attendant request cards are
  left in place as comments; otherwise they are
  removed.  If the cycle contains a cycle,
  translateCycle calls itself to translate the
  inner cycle.

  Warning: fiddling with the logic that computes
  the number of cards the combinatorial cards skip
  may lead to a skull explosion.  The correct number
  depends on the type of cycle, whether or not an
  else branch exists on a conditional, and whether
  comments are being retained or deleted, and is
  intimately associated with precisely where the
  combinatorial card is inserted when comments are
  being retained.
*/

Attendant.prototype.translateCycle = function(cards, start) {
  var c = cards[start];
  var s = c.text;
  var which = s.charAt(0);
  var depends = false, error = false;
  var i;

  if (s.length > 1) {
    depends = s.charAt(1) == "?";
  }
  if (this.addComments) {
    c.text = ". " + s + " Translated by attendant";
  } else {
    cards.splice(start, 1);
    start--;
  }

  /*  Search for the end of this cycle.  If a sub-cycle
            is detected, recurse to translate it.  */

  for (i = start + 1; i < cards.length; i++) {
    var u = cards[i];

    if (this.isCycleStart(u)) {
      this.translateCycle(cards, i);
    }
    if (this.isCycleEnd(u)) {
      var isElse = u.text.match(/^}{/);

      if (u.text.charAt(0) != (which == "(" ? ")" : "}")) {
        this.complain(
          u,
          "End of cycle does not match " + which + " beginning on card " + start
        );
        error = true;
      }
      if (this.addComments) {
        u.text = ". " + u.text + " Translated by attendant";
      } else {
        cards.splice(i, 1);
      }
      if (which == "(") {
        //  It's a loop

        cards.splice(
          i,
          0,
          new Card("CB" + (depends ? "?" : "+") + (i - start), -1, this.Source)
        );
      } else {
        //  It's a forward skip, possibly with an else clause

        cards.splice(
          start + 1,
          0,
          new Card(
            "CF" +
              (depends ? "?" : "+") +
              ((isElse
                ? this.addComments ? 1 : 0
                : this.addComments ? 0 : -1) +
                Math.abs(i - start)) +
              "  . " +
              (isElse ? "Else" : "IfOnly") +
              " " +
              (i - start),
            -1,
            this.Source
          )
        );

        //  Translate else branch of conditional, if present

        if (isElse) {
          for (var j = i + 1; j < cards.length; j++) {
            u = cards[j];

            if (this.isCycleStart(u)) {
              this.translateCycle(cards, j);
            }
            if (this.isCycleEnd(u)) {
              if (u.text.charAt(0) != "}") {
                this.complain(
                  u,
                  "End of else cycle does not match " +
                    which +
                    " beginning on card " +
                    i
                );
                error = true;
              }
              if (this.addComments) {
                u.text = ". " + u.text + " Translated by attendant";
              } else {
                cards.splice(j, 1);
              }
              cards.splice(
                i + (this.addComments ? 2 : 1),
                0,
                new Card(
                  "CF+" + (Math.abs(j - i) - (this.addComments ? 1 : 1)),
                  -1,
                  this.Source
                )
              );
              return error;
            }
          }
        }
      }
      return error;
    }
  }
  this.complain(c, "No matching end of cycle.");
  return true;
};

//  Translate attendant combinatoric cards in chain to native cards
Attendant.prototype.translateCombinatorics = function(cards) {
  for (var i = 0; i < cards.length; i++) {
    if (this.isCycleStart(cards[i])) {
      this.translateCycle(cards, i);
    }
  }
};

//  Perform any requested fixed-point expansions.
Attendant.prototype.translateFixedPoint = function(cards, comments) {
  var i;
  var decimalPlace = -1;

  for (i = 0; i < cards.length; i++) {
    var thisCard = cards[i];
    var card = thisCard.text.toLowerCase();

    //  A set decimal places to [+/-]n

    if (card.match(/^a set decimal places to /)) {
      var dspec = card.substr(24).replace(/\s+$/, "");
      var relative = 0;
      var dspok = true;

      if (dspec.charAt(0) == "+" || dspec.charAt(0) == "-") {
        if (decimalPlace == -1) {
          this.complain(
            thisCard,
            "I cannot accept a relative decimal place setting\nwithout a prior absolute setting."
          );
          dspok = false;
        } else {
          relative = dspec.charAt(0) == "+" ? 1 : -1;
          dspec = dspec.substr(1);
        }
      }
      if (dspok) {
        var d = parseInt(dspec);
        if (!isNaN(d)) {
          if (relative !== 0) {
            d = decimalPlace + d * relative;
          }
          if (d < 0 || d > 50) {
            this.complain(
              thisCard,
              "I can only set the decimal place between 0 and 50 digits."
            );
          } else {
            if (comments) {
              thisCard.text = ". " + thisCard.text;
            } else {
              cards.splice(i, 1);
              i--;
            }
            decimalPlace = d;
          }
        } else {
          this.complain(
            thisCard,
            "I cannot find the number of decimal places you wish to use."
          );
        }
      }

      //  Convert "A write numbers with decimal point" to a picture
    } else if (card.match(/^a write numbers with decimal point/)) {
      var dpa;

      if (decimalPlace < 0) {
        this.complain(
          thisCard,
          "I cannot add the number of decimal places because\n" +
            "you have not instructed me how many decimal\n" +
            'places to use in a prior "A set decimal places to"\ninstruction.'
        );
        return;
      }
      thisCard.text = "A write numbers as 9.";
      for (dpa = 0; dpa < decimalPlace; dpa++) {
        thisCard.text += "9";
      }

      //  Add step up/down to "<" or ">" if not specified
    } else if (
      (card.match(/^</) || card.match(/^>/)) &&
      card.replace(/(?:\s+\.\s.*|\s+)$/, "").length == 1
    ) {
      if (decimalPlace < 0) {
        this.complain(
          thisCard,
          "I cannot add the number of decimal places because\n" +
            "you have not instructed me how many decimal\n" +
            'places to use in a prior "A set decimal places"\ninstruction.'
        );
        return;
      } else {
        thisCard.text =
          thisCard.text.replace(/(?:\s+\.\s.*|\s+)$/, "") +
          decimalPlace.toString();
        if (comments) {
          thisCard.text += " . Step count added by attendant";
        }
      }

      /*  Replace number cards with decimal points with
                cards scaled to the proper number of digits.  */
    } else if (card.match(/^n/)) {
      //StringTokenizer stok = new StringTokenizer(card.substring(1));
      var p = card.substr(1).match(/\s*(\d+)\s+((?:[\+\-\u2212])?[\d\.]+)/);
      if (p) {
        var cn, nspec;

        cn = p[1]; // Column number
        nspec = p[2]; // Number specification
        var dp = nspec.indexOf(".");

        if (dp >= 0) {
          if (decimalPlace < 0) {
            this.complain(
              thisCard,
              "I cannot add the number of decimal places because\n" +
                "you have not instructed me how many decimal\n" +
                'places to use in a prior "A set decimal places"\ninstruction.'
            );
            return;
          } else {
            var dpart = nspec.substr(dp + 1), // Decimal part
              dpnew = "";
            var j, places = 0;
            var ch;

            for (j = 0; j < dpart.length; j++) {
              if ((ch = dpart.charAt(j)).match(/\d/)) {
                dpnew += ch;
                places++;
              }
            }

            /* Now adjust the decimal part to the given number
                               of decimal places by trimming excess digits and
                               appending zeroes as required. */

            if (dpart.length > decimalPlace) {
              /* If we're trimming excess digits, round the
                                   remaining digits based on the first digit
                                   of the portion trimmed. */
              if (decimalPlace > 0 && dpart.charAt(decimalPlace) >= 5) {
                dpart = bigInt(dpart.substr(0, decimalPlace))
                  .add(bigInt(1))
                  .toString();
              } else {
                dpart = dpart.substring(0, decimalPlace);
              }
            }
            while (dpart.length < decimalPlace) {
              dpart += "0";
            }

            //  Append the decimal part to fixed part from card

            thisCard.text = "N" + cn + " " + nspec.substr(0, dp) + dpart;
            if (comments) {
              thisCard.text += " . Decimal expansion by attendant";
            }
          }
        }
      }
    }
  }
};

//	Set library template
Attendant.prototype.setLibraryTemplate = function(s) {
  this.libraryTemplate = s;
};

//	Test if library name is valid.  This avoids mischief by the user
Attendant.prototype.isLibraryNameValid = function(s) {
  return s.match(/^[abcdefghijklmnopqrstuvwxyz\-_0123456789]+$/);
};

//	Process library inclusion requests in mounted chain
Attendant.prototype.expandLibraryRequests = function(start) {
  if (this.libLoadStatus == 1) {
    // If request still pending...
    return this.libLoadStatus; // ...inform the caller
  }

  this.libLoadStatus = 0; // Set library load idle
  for (var i = start; i < this.cardChain.length; i++) {
    if (this.cardChain[i].text.match(/^a include from library cards for /i)) {
      this.lspec = this.cardChain[i].text.substr(33).toLowerCase();
      this.lspec = this.lspec.replace(/^\s+/, "");
      this.lspec = this.lspec.replace(/\s+$/, "");
      if (this.isLibraryNameValid(this.lspec) && this.libraryTemplate) {
        var url = this.libraryTemplate.replace(/\$/, this.lspec);
        this.libLoadI = i;
        this.libLoadStatus = 1;
        try {
          var text = fs.readFileSync(path.join(__dirname, '..', url), {
            encoding: "utf8"
          });
          var lines = text.split("\n");
          this.cardChain.splice(
            this.libLoadI,
            1,
            new Card(
              ". Begin interpolation of " +
                this.lspec +
                " from library by attendant",
              -1,
              this.Source
            )
          );
          var n = this.libLoadI + 1;
          var src = new CardSource(this.lspec + " [Library]", 0);
          for (var j = 0; j < lines.length; j++) {
            this.cardChain.splice(n, 0, new Card(lines[j], j, src));
            n++;
          }
          this.cardChain.splice(
            n,
            0,
            new Card(
              ". End interpolation of " +
                this.lspec +
                " from library by attendant",
              -1,
              this.Source
            )
          );
          this.ncards = this.cardChain.length;
          this.libLoadStatus = 0; // Set library load idle
        } catch (e) {
          this.complain(
            this.cardChain[this.libLoadI],
            "Cannot load cards from library " + url + ", error " + e + "."
          );
          this.libLoadStatus = 2; // Mark library load failed
        }
        break; // Quit loop to wait for callback
      } else {
        this.complain(
          this.cardChain[i],
          'I cannot include cards from the invalid library name of "' +
            lspec +
            '".'
        );
        this.libLoadStatus = 2; // Mark library load failed
      }
    } else if (this.cardChain[i].text.match(/^a include cards /i)) {
      this.lspec = this.cardChain[i].text.substr(16);
      var url = this.lspec;
      this.libLoadI = i;
      this.libLoadStatus = 1;
      try {
        var text = fs.readFileSync(path.join('.', url), {
          encoding: "utf8"
        });
        var lines = text.split("\n");
        this.cardChain.splice(
          this.libLoadI,
          1,
          new Card(
            ". Begin interpolation of " +
              this.lspec +
              " from library by attendant",
            -1,
            this.Source
          )
        );
        var n = this.libLoadI + 1;
        var src = new CardSource(this.lspec + " [Library]", 0);
        for (var j = 0; j < lines.length; j++) {
          this.cardChain.splice(n, 0, new Card(lines[j], j, src));
          n++;
        }
        this.cardChain.splice(
          n,
          0,
          new Card(
            ". End interpolation of " +
              this.lspec +
              " from library by attendant",
            -1,
            this.Source
          )
        );
        this.ncards = this.cardChain.length;
        this.libLoadStatus = 0; // Set library load idle
      } catch (e) {
        this.complain(
          this.cardChain[this.libLoadI],
          "Cannot load cards from library " + url + ", error " + e + "."
        );
        this.libLoadStatus = 2; // Mark library load failed
      }
      break; // Quit loop to wait for callback
    }
  }
  return this.libLoadStatus;
};

//  Examine cards in the chain and perform attendant transformations
Attendant.prototype.examineCards = function(comments) {
  this.addComments = comments;
  //  If we're eliding comments, remove them from the card chain
  if (!comments) {
    for (var i = 0; i < this.cardChain.length; i++) {
      if (this.isComment(this.cardChain[i])) {
        this.cardChain.splice(i, 1);
        i--;
      }
    }
  }
  this.translateFixedPoint(this.cardChain, comments);
  this.translateCombinatorics(this.cardChain);
  this.ncards = this.cardChain.length; // Update ncards to reflect changes
};

//  Deliver completed card chain for mounting in reader
Attendant.prototype.deliverCardChain = function() {
  return this.errorDetected ? null : this.cardChain;
};

//  Process request when the mill stops on an attendant action card.
Attendant.prototype.processActionCard = function(c, printer) {
  var ok = true;
  var card = c.text;

  /*  "write"  Control the transcription of
                     output from the printer to the
                     final summary of the computation.  */

  if (card.toLowerCase().substr(1).match(/ write /)) {
    var cws = card.toLowerCase().substr(8);
    if (cws.match(/numbers as /)) {
      this.setPicture(card.substring(19));
    } else if (cws.match(/annotation /)) {
      this.writeAnnotation(card.substring(19), printer);
    } else if (cws.match(/in columns/)) {
      this.setWriteAcross();
    } else if (cws.match(/in rows/)) {
      this.setWriteDown();
    } else if (cws.match(/new line/)) {
      this.writeNewLine(printer);
    } else if (cws.match(/timing/)) {
      this.traceLog(this.timing.report());
    } else {
      ok = false;
    }
  } else {
    ok = false;
  }
  if (!ok) {
    this.complain(c, "I do not understand this request for attendant action.");
  }
  return ok;
};

//  Set picture to be used in printing subsequent numbers
Attendant.prototype.setPicture = function(pic) {
  if (pic.length < 1) {
    pic = null;
  }
  this.numberPicture = pic;
};

//  Edit a number to the current picture specification
Attendant.prototype.editToPicture = function(v) {
  var s;
  var negative = v.isNegative(), sign = false;

  if (this.numberPicture) {
    s = v.abs().toString();
    var i = this.numberPicture.length;
    var o = "";

    while (--i >= 0) {
      var c = this.numberPicture.charAt(i);

      switch (c) {
        case "9": //  Digit, unconditionally
          if (s.length === 0) {
            o = "0" + o;
          } else {
            o = s.substr(s.length - 1, s.length) + o;
            s = s.substr(0, s.length - 1);
          }
          break;

        case "#": // Digit, if number not exhausted
          if (s.length > 0) {
            o = s.substr(s.length - 1, s.length) + o;
            s = s.substr(0, s.length - 1);
          }
          break;

        case ",": // Comma if digits remain to output
          if (this.numberPicture.indexOf("9") >= 0 || s.length > 0) {
            o = c + o;
          }
          break;

        case "-": // Sign if negative
          if (negative) {
            o = "-" + o;
            sign = true;
          }
          break;

        case C_plusmn: // Plus or minus sign
          o = (negative ? "-" : "+") + o;
          sign = true;
          break;

        case "+": // Sign if negative, space if positive
          o = (negative ? "-" : " ") + o;
          sign = true;
          break;

        default:
          // Copy character to output
          o = c + o;
          break;
      }
    }
    /*  If there's any number "left over", write it to
                prevent truncation without warning.  */
    if (s.length > 0) {
      o = s + o;
    }
    /*  If the number is negative and no sign has been output
                so far, prefix it with a sign.  */
    if (negative && !sign) {
      o = "-" + o;
    }
    s = o;
  } else {
    s = v.toString();
  }

  return s;
};

//  Inform the attendant of an item to be added to the trace log.
Attendant.prototype.traceLog = function(s) {
  this.panel.attendantWriteTrace(s + "\n");
};

//  Report a Mill abnormality
Attendant.prototype.millAbnormality = function(why, card) {
  this.panel.attendantWriteTrace("Error: " + why + " card " + card + "\n");
};

//  Write selected end of line sequence at end of log item
Attendant.prototype.writeEndOfLogItem = function() {
  if (this.writeDown) {
    this.panel.attendantLogMessage("\n");
  }
};

//  Write selected end of line sequence to output apparatus
Attendant.prototype.writeEndOfItem = function(apparatus) {
  if (this.writeDown) {
    apparatus.output("\n");
  }
};

//  Write text annotation on output apparatus
Attendant.prototype.writeAnnotation = function(s, apparatus) {
  apparatus.output(s);
  this.writeEndOfItem(apparatus);
};

//  Write new line on output apparatus
Attendant.prototype.writeNewLine = function(apparatus) {
  apparatus.output("\n");
};

//  Set write across the page or down
Attendant.prototype.setWriteAcross = function() {
  this.writeDown = false;
};

Attendant.prototype.setWriteDown = function() {
  this.writeDown = true;
};

module.exports = Attendant;
