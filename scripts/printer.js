
    //  The Printer

    "use strict";

    function Printer(aout) {
        this.O_output = aout;
    }

    //  Append text to the Printer
    Printer.prototype.output = function(s) {
        this.O_output.value += s;
        //  Make sure new line is scrolled into view
        this.O_output.scrollTop = this.O_output.scrollHeight;
    };

