
    //  Web page interface

    "use strict";

    /*  All of the interface between the JavaScript objects
        implementing the Analytical Engine Emulator should
        be confined to this module.  */

    //  Emulator objects
    var prog, cr, ann, prt, cda, att, mill, sto, eng, tim;
    //  Web page objects obtained via getElementById
    var C_trace, C_animate, C_panel, P_comments, AS_columns, AC_cards,
        P_submit;

    var runInterval = 2;            // Milliseconds per step when running
    var animationInterval = 1000;   // Milliseconds per step in animation
    var stepInterval;               // Millseconds per step, set to one of the above
    var cardsPerStep = 100;         // Cards to process per step when running

    //  Initialise the Web page when loaded
    function initialise() {

/* globals document: false */
        //  Program panel
        P_comments = document.getElementById("P_comments");
        P_submit = document.getElementById("P_submit");

        //  Control panel
        C_panel = document.getElementById("C_panel");
        C_trace = document.getElementById("C_trace");
        C_trace.checked = !!window.parent.location.search.match(/trace=y/);
        C_animate = document.getElementById("C_animate");
        C_animate.checked = !!window.parent.location.search.match(/animate=y/);

        //  Annunciator panel
        ann = new Annunciator(document.getElementById("L_output"),
                document.getElementById("annunciator"),
                [ document.getElementById("AM_in0"),
                  document.getElementById("AM_in1"),
                  document.getElementById("AM_in0p")
                ],
                [ document.getElementById("AM_eg0"),
                  document.getElementById("AM_eg0p")
                ],
                document.getElementById("AM_op"),
                document.getElementById("AM_ru"),
                document.getElementById("AM_run"),
                displayStore,
                displayCardReader
            );
        ann.setBellSound("bell");
        AC_cards = document.getElementById("AC_cards");
        AS_columns = document.getElementById("AS_columns");

        //  Timing
        tim = new Timing();

        //  Printer
        prt = new Printer(document.getElementById("O_output"));

        //  Curve Drawing Apparatus
        cda = new CurveDrawingApparatus(canvasP() ?
            document.getElementById("D_plot") : null,
        document.getElementById('curve_drawing').style);

        //  Attendant
        att = new Attendant(ann, tim);
        att.setLibraryTemplate("Library/$.ae");

        //  Mill
        mill = new Mill(ann, att, tim);

        //  Card Reader
        cr = new CardReader(ann, att, tim);

        //  Store
        sto = new Store(ann, att, tim);

        //  Engine
        eng = new Engine(ann, att, mill, sto, cr, prt, cda);

        //  Analyst's Program
        prog = new Program(document.getElementById("P_cards"),
        document.getElementById("P_file"),
        document.getElementById("P_load"), att, cr, sto, cda, tim, eng);
        prog.onload();

        /*  If a ?load=filename is specified in the URL, try to
            load the requested filename into the program panel.
            The filename is restricted to be within our directory
            tree and an extension of ".ae" is appended.  */
        var qfile;
        if (qfile = window.parent.location.search.match(/load=(\w[\w\/]*)/)) {
            qfile = qfile[1] + ".ae";
                loadWebDoc_loaded = function(context, text) {
                document.getElementById("P_cards").value = text;
                submitProgram();
            }
            loadWebDoc_failed = function(context, url, status) {
                att.traceLog("Cannot load cards from " + url +
                ", status " + status + ".");
            }
            loadWebDoc(qfile, 0);
        }

        //  Inform the engine of the state of the trace and animate checkboxes
        Controls_trace();
        Controls_animate();
    }

    //  Animation/execution process
    function reAnimator() {
        /*  If the user has paused the execution, do nothing.
            Because we don't reset the execution timer, we won't
            be called again.  */
        if (eng.isRunning()) {
            if (stepInterval == runInterval) {
                for (var i = 0; i < cardsPerStep; i++) {
                    if (!eng.processCard()) {
                        ann.setOverride(true);
                        eng.halt();
                        ann.setOverride(false);
                        showState();
                        break;
                    }
                }
                if (eng.isRunning()) {
                    window.setTimeout(reAnimator, stepInterval);
                }
            } else {
                if (eng.processCard()) {
                    window.setTimeout(reAnimator, stepInterval);
                } else {
                    ann.setOverride(true);
                    eng.halt();
                    ann.setOverride(false);
                    showState();
                }
            }
        }
    }

    /*  Submit program.  This otherwise straightforward process is
    driven around the bend into gibbering insanity thanks to the
    "feature" that retreiving the content of a URL is asynchronous.
    If prog.submit returns a status of 1, indicating that a library
    retrieval is pending, the balance of the submission process
    has not occurred, so we must wait in a timer loop until the
    callback occurs.  Wouldn't it be nice if we could wait on the
    operation, yielding control like a timer, until the callback
    for completion or error occurred?  Yes, indeed, it would.

    As it stands, we'll keep on calling prog.submit at each timer
    tick until it reports something other than a pending status.  */
    function submitProgram() {
        P_submit.style.color = "#000000";   // Mark program submitted
        prog.submit0(P_comments.checked);
        submitProgram1();
    }

    function submitProgram1() {
        var stat = prog.submit1(P_comments.checked);
        if (stat == 1) {
            window.setTimeout(submitProgram1, 20);
        }
    }

    //  Start button pressed
    function Controls_start() {
        //  Need to check state, valid program loaded, etc.
        if (!eng.isRunning()) {
            ann.setOverride(true);
            eng.start();
            ann.setOverride(false);
            Controls_animate(); // Double check animation state
            reAnimator();
        }
    }

    //  Step button pressed
    function Controls_step() {
        if (eng.isRunning()) {
            ann.setOverride(true);
            eng.halt();
            ann.setOverride(false);
            showState();
        } else {
            eng.processCard();
        }
    }

    //  Reset button pressed
    function Controls_reset() {
        eng.reset();
        eng.commence();
        tim.reset();            // Reset the timer
        Controls_trace();       // Reset trace state to that of checkbox
        showState();
    }

    //  Trace checkbox state changed
    function Controls_trace()
    {
        ann.setTrace(C_trace.checked);
        eng.setTrace(C_trace.checked);
    }

    //  Animate checkbox state changed
    function Controls_animate() {
        ann.setAnimate(C_animate.checked);
        stepInterval = C_animate.checked ? animationInterval : runInterval;
    }

    //  Display store
    function displayStore(col, rack) {
        if (col == -1) {        // Col -1 indicates clear the store
        AS_columns.value = "";
    } else {
            /*  Level 0 store display: simply log writes to store
            AS_columns.value += "S(" + col + ") = " + rack[col].toString() + "\n";
            //  Make sure new line is scrolled into view
            AS_columns.scrollTop = this.L_output.scrollHeight;
            End level 0.  */

            /*  Level 1 store display: Show store in textarea with check mark
                to flag most recent change.  */
            var s = "";
            var nrows = 0;
            for (var i = 0; i < rack.length; i++) {
                if (rack[i]) {
                var cn = ("00" + i).substr(-3);         // Rack column number
                var f = (i == col) ? "\u2714 " : "  ";  // Flag if column changed
                var n = ("                                                  " +
                    rack[i].toString()).substr(-50);    // Column contents (right justified)
                s += f + cn + ":  " + n + "\n";
                nrows++;            // Increment rows displayed
            }
            }
            nrows++;                        // Must do this to avoid scroll bar appearing
            if (nrows > AS_columns.rows) {
                AS_columns.rows = nrows;    // Resize text area to hold store
            }
            AS_columns.value = s;           // Change in one whack to avoid visual fireworks
            /*  End level 1.  */
        }
    }

    //  Display card reader
    function displayCardReader(n, chain) {
        if (n == -1) {          // n  -1 indicates clear the reader
        AC_cards.value = "";
    } else {
            if (chain) {
                /*  Level 1 card reader display.  */
                var s = "";
                var start = Math.max(n - 2, 0);     // First card to display
                for (var i = start; i < start + 5; i++) {
                        var c;
                    if (c = chain[i]) {
                        s += (i == n ? "\u2192 " : "  ") + c.toString() + "\n";
                    } else {
                        break;
                    }
                }
                AC_cards.value = s;
                /*  End level 1.  */
            }
        }
    }

    //  Show complete state of engine when it halts
    function showState() {
        ann.setOverride(true);
        mill.showState();
        displayStore(sto.rack.length + 1, sto.rack);
        displayCardReader(cr.nextCardNumber, cr.cards);
        ann.setOverride(false);
    }
