
    //	Curve Drawing Apparatus
    
    "use strict";
    
    var K10e25 = bigInt("10000000000000000000000000"),
        Kround = bigInt( "5000000000000000000000000");


    function CurveDrawingApparatus(cvs, dstyle) {
    	this.canvas = cvs;
	if (this.canvas) {
	    this.cwid = this.canvas.width;
	    this.chgt = this.canvas.height;
	    this.cdim = Math.min(this.cwid, this.chgt);
	    this.cscale = Math.floor(this.cdim / 2);
	    this.ctrx = Math.floor(this.cwid / 2);
	    this.ctry = Math.floor(this.chgt / 2);
	    this.ctx = this.canvas.getContext("2d");
	    this.style = dstyle;
	    this.changePaper();
	}
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
    	if (this.canvas) {
    	    if (this.penDown) {
		this.displayX.push(null);
		this.displayY.push("up");
		this.penDown = false;
	    }
	    this.startX = this.currentX;
	    this.startY = this.currentY;
	}
    };

    //	Draw, with the pen down, to the current co-ordinates
    CurveDrawingApparatus.prototype.drawTo = function() {
    	if (this.canvas) {
	    this.displayX.push(this.scaleNum(this.currentX));
	    this.displayY.push(this.cdim - this.scaleNum(this.currentY));
    	    if (this.penDown) {
		//	If the Curve Drawing Apparatus is hidden, expose it
		if (this.style.display == "none") {
	    	    this.style.display = "block";
		}
		this.drawScreen();
	    } else {
		this.penDown = true;
	    }
	}
    };
    
    //	Change pen to a different colour
    CurveDrawingApparatus.prototype.changePen = function(colour) {
    	if (this.canvas) {
    	    if (this.currentPen != colour) {
		this.currentPen = colour;
		this.displayX.push(null);
		this.displayY.push("pen:" + colour); 
	    }
	}
    };

    //	Change paper
    CurveDrawingApparatus.prototype.changePaper = function() {
    	this.currentX = bigInt.zero;
	this.currentY = bigInt.zero;
	this.startX = bigInt.zero;
	this.startY = bigInt.zero;
	this.penDown = false;
	this.displayX = []; 	    // Display list
	this.displayY = [];
	this.currentPen = "black";
	this.drawScreen();
    };
    
    CurveDrawingApparatus.prototype.drawScreen = function() {
    	if (this.canvas) {
	    this.ctx.fillStyle = "#E0E0E0";
	    this.ctx.fillRect(0, 0, this.cwid, this.chgt);

    	    this.ctx.lineWidth = 1;
	    this.ctx.strokeStyle = "black";

    	    //  Replay the display list, drawing vectors on screen	
	    var opath = false;
	    var ncol;
	    for (var i = 0; i < this.displayX.length; i++) {
		if (this.displayX[i] === null) {
			if (opath) {
			    this.ctx.stroke();
			    this.ctx.closePath();
			    opath = false;
			    this.startX = this.currentX;
			    this.startY = this.currentY;
			}    	    	    
	    	    if (this.displayY[i] == "up") {
		    } else if (ncol = this.displayY[i].match(/^pen:\s*(.*)\s*$/)) {
			this.ctx.strokeStyle = ncol[1];
		    }
		} else {
	    	    if (!opath) {
			this.ctx.beginPath();
			this.ctx.moveTo(this.displayX[i], this.displayY[i]);
			opath = true;
		    } else {
			this.ctx.lineTo(this.displayX[i], this.displayY[i]);
		    }
		}
	    }
	    if (opath) {
		this.ctx.stroke();
		this.ctx.closePath();
	    }
	}
    };    

    //	Scale a fixed point co-ordinate into a pixel value
    CurveDrawingApparatus.prototype.scaleNum = function(v) {
    	v = v.multiply(this.cscale).add(
	    	Kround.multiply(v.isNegative() ? -1 : 1));
	v = v.divide(K10e25);
	return v.toJSNumber() + (this.cscale);
    };
