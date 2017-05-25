const Annunciator = require('./scripts/annunciator');
const Timing = require('./scripts/timing');
const Printer = require('./scripts/printer');
const CurveDrawingApparatus = require('./scripts/curvedrawing');
const Attendant = require('./scripts/attendant');
const Mill = require('./scripts/mill');
const Program = require('./scripts/program');
const Store = require('./scripts/store');
const Engine = require('./scripts/engine');

exports.Annunciator = Annunciator;
exports.Timing = Timing;
exports.Printer = Printer;
exports.CurveDrawingApparatus = CurveDrawingApparatus;
exports.Attendant = Attendant;
exports.Mill = Mill;
exports.Program = Program;
exports.Store = Store;
exports.Engine = Engine;

function Interface() {
	// Annunciator
	this.annunciator = new Annunciator();

	//  Timing
	this.timing = new Timing();

	//  Printer
	this.printer = new Printer();

	//  Curve Drawing Apparatus
	this.curveDrawingApparatus = new CurveDrawingApparatus(512, 512);

	//  Attendant
	this.attendant = new Attendant(this.annunciator, this.timing);
	this.attendant.setLibraryTemplate("Library/$.ae");

	//  Mill
	this.mill = new Mill(this.annunciator, this.attendant, this.timing);

	//  Card Reader
	this.cardReader = new Program.CardReader(this.annunciator, this.attendant, this.timing);

	//  Store
	this.store = new Store(this.annunciator, this.attendant, this.timing);

	//  Engine
	this.engine = new Engine(this.annunciator, this.attendant, this.mill, this.store, this.cardReader, this.printer, this.curveDrawingApparatus);
}

Interface.prototype.clearState = function() {
	this.engine.commence();
}

Interface.prototype.submitProgram = function(cards) {
	this.program = new Program.Program(cards, this.attendant, this.cardReader, this.store, this.curveDrawingApparatus, this.timing, this.engine);
	return this.program.submit();
}

Interface.prototype.runToCompletion = function() {
	//library loads gave no errors, run the program
	this.annunciator.setOverride(true);
	this.engine.start();
	this.annunciator.setOverride(false);
	while(this.engine.processCard()) {}
	this.annunciator.setOverride(true);
	this.engine.halt();
	this.annunciator.setOverride(false);
}

exports.Interface = Interface;
