const Annunciator = require('./scripts/annunciator');
const Timing = require('./scripts/timing');
const Printer = require('./scripts/printer');
const CurveDrawingApparatus = require('./scripts/curvedrawing');
const Attendant = require('./scripts/attendant');
const Mill = require('./scripts/mill');
const Program = require('./scripts/program');
const Store = require('./scripts/store');
const Engine = require('./scripts/engine');

// Annunciator
var ann = new Annunciator();

//  Timing
var tim = new Timing();

//  Printer
var prt = new Printer();

//  Curve Drawing Apparatus
var cda = new CurveDrawingApparatus();

//  Attendant
var att = new Attendant(ann, tim);
att.setLibraryTemplate("Library/$.ae");

//  Mill
var mill = new Mill(ann, att, tim);

//  Card Reader
var cr = new Program.CardReader(ann, att, tim);

//  Store
var sto = new Store(ann, att, tim);

//  Engine
var eng = new Engine(ann, att, mill, sto, cr, prt, cda);

var cards = `
N000 1
N001 2
+
L000
L001
S002
`;

//  Analyst's Program
var prog = new Program.Program(cards, att, cr, sto, cda, tim, eng);

prog.submit0(true);
prog.submit1(true);
ann.setOverride(true);
eng.start();
ann.setOverride(false);
while(eng.processCard()) {}
ann.setOverride(true);
eng.halt();
ann.setOverride(false);

console.log(sto.rack);
