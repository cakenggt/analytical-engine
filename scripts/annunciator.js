
    //  The Annunciator Panel

    "use strict";

    function Annunciator(al, ap, ina, ega, op, runup, runstop, dstore, dcr) {
        this.L_output = al;
        this.A_panel = ap;
        this.M_ingress = ina;
        this.M_egress = ega;
        this.M_op = op;
        this.M_runup = runup;
        this.M_runstop = runstop;
	this.updStore = dstore;
	this.updCardReader = dcr

        this.tracing = false;
        this.animating = false;
	this.override = false;
        this.watch = false;
        this.bellSound = null;
        this.audioVolume = 0.3;
        this.panelShowing = true;

        this.cardChain = null;          // Card chain for panel display
        this.currentCard = 0;
    }

    //  Set the sound to be played then the bell rings
    var audioReady = false;
    Annunciator.prototype.setBellSound = function(soundfile) {
/* globals document: false */
        this.bellSound = document.createElement("audio");
        document.body.appendChild(this.bellSound);
        var aFormat = chooseAudioFormat(this.bellSound);
        if (aFormat !== "") {
            /*  iOS, bless its pointy little head, doesn't execute audio load
                operations except in response to a user action (mouse click,
                touch, etc.).  This is an attempt to block autoplay audio in
                Web pages, but torpedoes legitimate applications like this one
                which wish to use sound as a cue to various events.  This means
                that if we use the "canplaythrough" event to trigger starting
                the animation, as we'd like to do, it will never start, as
                the event is never received.  All the "canplaythrough" event does is set
                audioReady.  */
            this.bellSound.addEventListener("canplaythrough",
                function() { audioReady = true; }, false);
            this.bellSound.setAttribute("src",
                "sounds/" + soundfile + "." + aFormat);
            this.bellSound.volume = this.audioVolume; // Set sound volume
        } else {
            alert("Browser cannot play audio.  Bell sound disabled.");
        }
    };

    //  Ring the bell
    Annunciator.prototype.ringBell = function() {
        this.bellSound.play();
    };

    //  Append a message to the Attendant's Log
    Annunciator.prototype.attendantLogMessage = function(s) {
        this.L_output.value += s;
        //  Make sure new line is scrolled into view
        this.L_output.scrollTop = this.L_output.scrollHeight;
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
        this.A_panel.style.display = t ? "block" : "none";
    };

    //  Mount new chain in card reader display
    Annunciator.prototype.mountCardReaderChain = function(chain) {
        this.cardChain = chain;
        this.currentCard = 0;
	this.updCardReader(this.currentCard, chain);
    };

    //  Change to a different current cards in the reader display
    Annunciator.prototype.changeCardReaderCard = function(n, chain) {
    	//  If we're clearing the reader, always notify
        if (this.watch || n == -1) {
            this.updCardReader(n, chain);
        }
    };

    //  Change Mill ingress axis value
    Annunciator.prototype.changeIngress = function(which, v) {
        if (this.watch) {
            this.M_ingress[which].value = v.toString();
        }
    };

    //  Change Mill egress axis value
    Annunciator.prototype.changeEgress = function(which, v) {
        if (this.watch) {
            this.M_egress[which].value = v.toString();
        }
    };

    //  Change current Mill operation
    Annunciator.prototype.changeOperation = function(op) {
        if (this.watch) {
            this.M_op.value = op == "-" ? C_minus : op;
        }
    };

    //  Change state of Mill run up lever
    Annunciator.prototype.changeRunUp = function(runup) {
        if (this.watch) {
            this.M_runup.value = runup ? "Set" : "Not set";
        }
    };

    //  Change Mill run/stop state
    Annunciator.prototype.changeMillRunning = function(run) {
        if (this.watch) {
            this.M_runstop.value = run ? "Running" : "Stopped";
        }
    };

    //	Change the contents of a column in the store
    Annunciator.prototype.changeStoreColumn = function(col, rack) {
    	//  If we're clearing store, always notify
        if (this.watch || col == -1) {
            this.updStore(col, rack);
        }
    };
    
    /*  chooseAudioFormat  --  Find a supported audio format for
                               an audio element among those we
                               have files available. */

    function chooseAudioFormat(e) {
        var fmt = "";

        //  We test all "probably" types before trying "maybe"

        if (e.canPlayType("audio/ogg") == "probably") {
            fmt = "ogg";
        } else if (e.canPlayType("audio/wav") == "probably") {
            fmt = "wav";
        } else if (e.canPlayType("audio/mp3") == "probably") {
            fmt = "mp3";
        } else if (e.canPlayType("audio/mpeg") == "probably") {
            fmt = "mp3";
        }

        if (fmt === "") {
           if (e.canPlayType("audio/ogg") == "maybe") {
               fmt = "ogg";
           } else if (e.canPlayType("audio/wav") == "maybe") {
               fmt = "wav";
           } else if (e.canPlayType("audio/mp3") == "maybe") {
               fmt = "mp3";
           } else if (e.canPlayType("audio/mpeg") == "maybe") {
               fmt = "mp3";
           }
        }

        return fmt;
    }
