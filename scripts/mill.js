const bigInt = require("big-integer");

const definitions = require('./definitions');

//  The Mill

("use strict");

var shiftFactor = new Array(101); // Shift factors created as needed

function Mill(p, a, t) {
  this.panel = p;
  this.attendant = a;
  this.timing = t;

  this.ingress = new Array(3); // Ingress axes
  this.egress = new Array(2); // Egress axes

  this.reset();
}

//  Set ingress axis
Mill.prototype.setIngress = function(which, v) {
  this.ingress[which] = bigInt(v);
  this.panel.changeIngress(which, this.ingress[which]);
};

//  Set egress axis
Mill.prototype.setEgress = function(which, v) {
  this.egress[which] = bigInt(v);
  this.panel.changeEgress(which, this.egress[which]);
};

//  Reset the mill
Mill.prototype.reset = function() {
  this.operation = definitions.OP_NONE;
  this.panel.changeOperation(this.currentOperationString());
  this.opargs = 2;
  this.index = 0;
  this.run_up = false;
  this.panel.changeRunUp(this.run_up);
  this.trace = false;

  var i;
  for (i = 0; i < 3; i++) {
    this.setIngress(i, 0);
  }
  for (i = 0; i < 2; i++) {
    this.setEgress(i, 0);
  }

  this.currentAxis = bigInt.zero;
  this.index = 0;
  this.run_up = false;
  this.panel.changeRunUp(this.run_up);
};

//  Return status of run up lever
Mill.prototype.hasRunUp = function() {
  return this.run_up;
};

//  Return string representing current Mill operation
Mill.prototype.currentOperationString = function() {
  var s = "";

  switch (this.operation) {
    case definitions.OP_NONE:
      s = " ";
      break;
    case definitions.OP_ADD:
      s = "+";
      break;
    case definitions.OP_SUBTRACT:
      s = C_minus;
      break;
    case definitions.OP_MULTIPLY:
      s = C_times;
      break;
    case definitions.OP_DIVIDE:
      s = C_divide;
      break;
  }
  return s;
};

//  Set or clear trace mode
Mill.prototype.setTrace = function(t) {
  this.trace = t;
};

//  Set current mill operation
Mill.prototype.setOperation = function(which) {
  switch (which) {
    case "+":
      this.operation = definitions.OP_ADD;
      this.opargs = 2;
      break;

    case C_minus:
    case "-":
      this.operation = definitions.OP_SUBTRACT;
      this.opargs = 2;
      break;

    case C_times:
    case "*":
    case "x":
      this.operation = definitions.OP_MULTIPLY;
      this.opargs = 2;
      break;

    case C_divide:
    case "/":
      this.operation = definitions.OP_DIVIDE;
      this.opargs = 2;
      break;

    default:
      alert("Unknown Mill operation" + which);
  }
  this.index = 0;
  this.panel.changeOperation(this.currentOperationString());
};

//  Transfer a value into the Mill
Mill.prototype.transferIn = function(v, upper) {
  var vb = bigInt(v);
  if (upper) {
    this.setIngress(2, (this.currentAxis = vb));
  } else {
    this.setIngress(this.index, (this.currentAxis = v));
    //  When first ingress axis set, clear prime axis
    if (this.index === 0) {
      this.setIngress(2, bigInt.zero);
    }
    this.index = (this.index + 1) % 2; // Rotate to next ingress axis
    if (this.index == this.opargs || this.index === 0) {
      this.crank(); // All arguments transferred; turn the crank
    }
  }
};

//  Transfer a value out of the Mill
Mill.prototype.transferOut = function(prime) {
  var b = this.egress[prime ? 1 : 0];

  this.currentAxis = b;
  return b;
};

//  Turn the crank and perform a Mill operation
Mill.prototype.crank = function() {
  var result = null, tresult = null;
  var qr;

  this.timing.millOperation(this.operation, this.ingress);
  this.run_up = false; // Reset run up lever
  switch (this.operation) {
    case definitions.OP_ADD:
      result = this.ingress[0].add(this.ingress[1]);
      /*  Check for passage through infinity (carry out)
                    and set run up lever if that has occurred.  The
                    result is then taken modulo 10^50. */
      if (result.compare(definitions.K10e50) >= 0) {
        this.run_up = true;
        result = result.subtract(definitions.K10e50);
      } else if (
        !this.ingress[0].isNegative() &&
        result.isNegative() &&
        !result.isZero()
      ) {
        /* Run up gets set when the result of a
                       addition changes the sign of the
                       first argument.  Note that since the same
                       lever is used to indicate carry and change
                       of sign, it is not possible to distinguish
                       overflow from sign change. */
        this.run_up = true;
      }
      this.setEgress(1, 0);
      if (this.trace) {
        this.attendant.traceLog(
          "Mill:  " +
            this.ingress[0].toString() +
            " + " +
            this.ingress[1].toString() +
            " = " +
            result.toString() +
            (this.run_up ? " Run up" : "")
        );
      }
      break;

    case definitions.OP_SUBTRACT:
      result = this.ingress[0].subtract(this.ingress[1]);
      /* Check for passage through negative infinity
                   (borrow) and set run up and trim value as a
                   result. */
      if (result.compare(Km10e50) <= 0) {
        this.run_up = true;
        result = bigInt.zero.subtract(result.add(definitions.K10e50));
      } else if (
        !this.ingress[0].isNegative() &&
        result.isNegative() &&
        !result.isZero()
      ) {
        /* Run up gets set when the result of a
                       subtraction changes the sign of the
                       first argument.  Note that since the same
                       lever is used to indicate borrow and change
                       of sign, it is not possible to distinguish
                       overflow from sign change. */
        this.run_up = true;
      }
      if (this.trace) {
        this.attendant.traceLog(
          "Mill:  " +
            this.ingress[0].toString() +
            " - " +
            this.ingress[1].toString() +
            " = " +
            result.toString() +
            (this.run_up ? " Run up" : "")
        );
      }
      this.setEgress(1, 0);
      break;

    case definitions.OP_MULTIPLY:
      result = this.ingress[0].multiply(this.ingress[1]);
      if (this.trace) {
        tresult = result;
      }
      /* Check for product longer than one column and
                   set the primed egress axis to the upper part. */
      if (result.abs().compare(definitions.K10e50) > 0) {
        qr = result.divmod(definitions.K10e50);
        this.setEgress(1, qr.quotient);
        result = qr.remainder;
      } else {
        this.setEgress(1, 0);
      }
      if (this.trace) {
        this.attendant.traceLog(
          "Mill:  " +
            this.ingress[0].toString() +
            " " +
            C_times +
            " " +
            this.ingress[1].toString() +
            " = " +
            tresult.toString() +
            (this.run_up ? " Run up" : "")
        );
      }
      break;

    case definitions.OP_DIVIDE:
      var dividend = this.ingress[0];

      if (!this.ingress[2].isZero()) {
        dividend = dividend.add(this.ingress[2].multiply(definitions.K10e50));
      }
      if (this.ingress[1].isZero()) {
        this.setEgress(1, (result = bigInt.zero));
        this.run_up = true;
        break;
      }
      qr = dividend.divmod(this.ingress[1]);
      if (qr.quotient.abs().compare(definitions.K10e50) > 0) {
        //  Overflow if quotient more than 50 digits
        this.setEgress(1, (result = bigInt.zero));
        this.run_up = true;
        break;
      }
      this.setEgress(1, qr.quotient);
      result = qr.remainder;
      if (this.trace) {
        this.attendant.traceLog(
          "Mill:  " +
            dividend.toString() +
            " / " +
            this.ingress[1].toString() +
            " = " +
            qr.quotient.toString() +
            ", Rem: " +
            qr.remainder.toString() +
            (this.run_up ? " Run up" : "")
        );
      }
      break;

    case definitions.OP_NONE:
      result = this.currentAxis;
      break;
  }
  this.setEgress(0, (this.currentAxis = result));
  this.index = 0;
  this.panel.changeRunUp(this.run_up);
};

/*  In Section 1.[5] of his 26 December 1837 "On the Mathematical
        Powers of the Calculating Engine", Babbage remarks: "The
        termination of the Multiplication arises from the action of
        the Counting apparatus which at a certain time directs the
        barrels to order the product thus obtained to be stepped down
        so the decimal point may be in its proper place,...", which
        implies a right shift as an integral part of the multiply
        operation.  This makes enormous sense, since it would take
        only a tiny fraction of the time a full-fledged divide would
        require to renormalise the number.  I have found no
        description in this or later works of how the number of digits
        to shift was to be conveyed to the mill.  So, I am introducing
        a rather curious operation for this purpose.  Invoked after a
        multiplication, but before the result has been emitted from
        the egress axes, it shifts the double-length product right by
        a fixed number of decimal places, and leaves the result in the
        egress axes.  Thus, to multiply V11 and V12, scale the result
        right 10 decimal places, and store the scaled product in V10,
        one would write:

             *
             L011
             L012
             >10
             S010

        Similarly, we provide a left shift for prescaling fixed
        point dividends prior to division; this operation shifts
        the two ingress axes containing the dividend by the given
        amount, and must be done after the ingress axes are loaded
        but before the variable card supplying the divisor is given.
        For example, if V11 and V12 contain the lower and upper halves
        of the quotient, respectively, and we wish to shift this
        quantity left 10 digits before dividing by the divisor in
        V13, we use:

            /
            L011
            L012'
            <10
            L013
            S010

        Note that shifting does not change the current operation
        for which the mill is set; it merely shifts the axes in
        place.  */

Mill.prototype.shiftAxes = function(count) {
  var right = count < 0;
  var sf, value;

  this.timing.millOperation(definitions.OP_SHIFT, count);

  /* Assemble the value from the axes.  For a right shift,
           used to normalise after a fixed point multiplication,
           the egress axes are used while for a left shift,
           performed before a fixed point division, the two
           ingress axes containing the dividend are shifted. */

  if (right) {
    count = -count;
    value = this.egress[0];
    if (!this.egress[1].isZero()) {
      value = value.add(this.egress[1].multiply(definitions.K10e50));
    }
  } else {
    value = this.ingress[0];
    if (!this.ingress[2].isZero()) {
      value = value.add(this.ingress[2].multiply(definitions.K10e50));
    }
  }

  /*  If we don't have a ready-made shift factor in stock,
            create one.  */

  if (!shiftFactor[count]) {
    shiftFactor[count] = definitions.K10.pow(count);
  }

  /*  Perform the shift and put the result back where
            we got it.  */

  sf = shiftFactor[count];
  if (right) {
    var qr;

    qr = value.divmod(sf);
    if (this.trace) {
      this.attendant.traceLog(
        "Mill:  " +
          value.toString() +
          " > " +
          count +
          " = " +
          qr.quotient.toString()
      );
    }
    if (qr.quotient.compare(definitions.K10e50) !== 0) {
      qr = qr.quotient.divmod(definitions.K10e50);
      this.setEgress(1, qr.quotient);
      this.setEgress(0, qr.remainder);
    } else {
      this.setEgress(0, qr.quotient);
      this.setEgress(1, 0);
    }
    this.currentAxis = this.egress[0];
  } else {
    var pr = value.multiply(sf);
    var pq;

    if (this.trace) {
      this.attendant.traceLog(
        "Mill:  " + value.toString() + " < " + count + " = " + pr.toString()
      );
    }
    if (pr.compare(definitions.K10e50) !== 0) {
      pq = pr.divmod(definitions.K10e50);
      this.setIngress(2, pq.quotient);
      this.setIngress(0, pq.remainder);
    } else {
      this.setIngress(0, pr);
      this.setIngress(2, 0);
    }
    this.currentAxis = this.ingress[0];
  }
};

//	Print the contents of the current axis
Mill.prototype.print = function(apparatus) {
  apparatus.output(this.attendant.editToPicture(this.outAxis()));
  this.attendant.writeEndOfItem(apparatus);
};

//  Return current axis
Mill.prototype.outAxis = function() {
  return this.currentAxis;
};

//	Display the complete state of the Mill on the panel
Mill.prototype.showState = function() {
  this.panel.changeOperation(this.currentOperationString());
  this.panel.changeRunUp(this.run_up);
  var i;
  for (i = 0; i < 3; i++) {
    this.panel.changeIngress(i, this.ingress[i]);
  }
  for (i = 0; i < 2; i++) {
    this.panel.changeEgress(i, this.egress[i]);
  }
};

module.exports = Mill;
