
    //  Global definitions
    
    "use strict";

    //  Unicode character escapes.  Named from HTML text entities

    var C_plusmn = "\xB1",          // Plus or minus sign
        C_times = "\xD7",           // Multiplication sign
        C_divide = "\xF7",          // Division sign
	C_minus = "\u2212"; 	    // Minus sign

    //  Global utility functions

    //  Return true zero if bigInt is either positive or negative zero
    function pzero(v) {
        return v.isZero() ? bigInt.zero : v;
    }

    //  Negate a bigInt by subtracting it from zero
    function negate(v) {
        return bigInt.zero.subtract(v);
    }
    
    //	Edit an integer with commas between thousands
    function commas(n) {
    	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    //  Useful bigInts

    var K10e50 = bigInt("100000000000000000000000000000000000000000000000000"),
        Km10e50 = negate(K10e50),
        K10 = bigInt(10);

    /*	Retrieve the contents of a URL into a string.  Note that due
    	to restrictions on cross-site accesses, the URL must be on the
	same site from which the request was made, unless the
	hosting site has opened up "Access-Control-Allow-Origin", which
	it won't have.  */

    //	The following are static.  You can't have two loadWebDoc requests
    //	active at the same time.  (Well, you can, but you'll regret it.)	
    var loadWebDoc_doc = null;
    var loadWebDoc_success = false;
    var loadWebDoc_pending = false;
    var loadWebDoc_loaded = null;   	    // Call back when document loaded
    var loadWebDoc_failed = null;   	    // Call back when document load failed
    var loadWebDoc_context = null;  	    // Context to pass to caller's callbacks
    
    function loadWebDocFail() {
	loadWebDoc_success = false;
	loadWebDoc_pending = false;
    }
    
    function loadWebDoc(url, context) {
    	loadWebDoc_context = context;
    	loadWebDoc_doc = null;
	loadWebDoc_success = false;
	loadWebDoc_pending = true;
	var xmlhttp;
    	if (window.XMLHttpRequest) {
	    xmlhttp = new XMLHttpRequest();
	} else {
	    /* There is an alternative for ancient versions of
	       Internet Exploder, but it doesn't make sense to
	       bother with them because they can't possibly run
	       JavaScript sufficiently modern to get anywhere near
	       this function call.  At some point, spraying gold
	       paint and perfume into the latrine just doesn't make
    	    	any sense. */
	    alert("Blooie!  No XMLHttpRequest.  Cannot load " + url);
	    return null;
	}
	xmlhttp.addEventListener("load", function() {
	    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		loadWebDoc_doc = xmlhttp.responseText;
		loadWebDoc_success = true;
		if (loadWebDoc_loaded) {
		    var l = loadWebDoc_loaded;
		    loadWebDoc_loaded = null;	// Notification is one shot
		    l(loadWebDoc_context, loadWebDoc_doc);
		}
		loadWebDoc_failed = null;
	    } else {
	    	loadWebDoc_success = false;
		loadWebDoc_pending = false;
		if (loadWebDoc_failed) {    	// Make fail notification if requested
		    loadWebDoc_failed(loadWebDoc_context, url, xmlhttp.status);
		}
		loadWebDoc_loaded = null;   	// Cancel notification
		loadWebDoc_failed = null;
	    }
	});
	xmlhttp.addEventListener("error", loadWebDocFail);
	xmlhttp.addEventListener("abort", loadWebDocFail);
	
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
    }
    
    //	Test if browser supports canvas and can get graphical context    
     function canvasP() {
    	return !!document.createElement("canvas").getContext;
    }
