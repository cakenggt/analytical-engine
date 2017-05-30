const test = require('ava');

const AE = require('../index');

test('clear state test', async t => {
	t.plan(6);

	let eng = new AE.Interface();
	let cards = `N000 1
N001 2
+
L000
L001
S002`;

	eng.submitProgram(cards);
	eng.runToCompletion();

	// before state is cleared
	t.is(eng.store.get(2).value, 3);
	t.is(eng.mill.egress[0].value, 3);
	t.not(eng.mill.operation, 0);

	eng.clearState();

	// after state is cleared
	t.is(eng.store.get(2).value, 0);
	t.is(eng.mill.egress[0].value, 0);
	t.is(eng.mill.operation, 0);
});

test('addition test', async t => {
	t.plan(1);

	let eng = new AE.Interface();
	let cards = `N000 1
N001 2
+
L000
L001
S002`;

	eng.submitProgram(cards);
	eng.runToCompletion();
	t.is(eng.store.get(2).value, 3);
});

test('sqrt test', async t => {
	t.plan(1);

	let eng = new AE.Interface();
	let cards = `A set decimal places to 5
N000 4.0
A include from library cards for sqrt`;

	eng.submitProgram(cards);
	eng.runToCompletion();

	t.is(eng.store.get(0).value, 200000);
});

test('custom function test', async t => {
	t.plan(1);

	let eng = new AE.Interface();
	let cards = `N000 4
A include cards test/addtwo`;

	eng.submitProgram(cards);
	eng.runToCompletion();

	t.is(eng.store.get(0).value, 6);
});

test('combinatorial cards test', async t => {
	t.plan(1);

	let eng = new AE.Interface();
	let cards = `N0 6
N1 1
N2 1
×
L1
L0
S1
-
L0
L2
S0
L2
L0
CB?11`;

	eng.submitProgram(cards);
	eng.runToCompletion();

	t.is(eng.store.get(1).value, 720);
});

test('combinatorial cards shorthand test', async t => {
	t.plan(1);

	let eng = new AE.Interface();
	let cards = `N0 7
N1 1
N2 1
(?
×
L1
L0
S1
-
L0
L2
S0
L2
L0
)`;

	eng.submitProgram(cards);
	eng.runToCompletion();

	t.is(eng.store.get(1).value, 5040);
});

test('drawing test', async t => {
	t.plan(2);

	let eng = new AE.Interface();
	let emptySvg = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"></svg>';

	let cards = `        Iteration variable
N000 −10000000000000000000000000

        Step
N001 100000000000000000000000

        Number of steps
N002    201

        Constants
N003    1
N004    0

+
L000
DX
×
L000
L000
>25
S005
L000
L005
>25
DY
D+
+
L000
L001
S000
−
L002
L003
S002
L004
L002
CB?24`;

	t.is(eng.curveDrawingApparatus.printScreen(), emptySvg);

	eng.submitProgram(cards);
	eng.runToCompletion();

	t.not(eng.curveDrawingApparatus.printScreen(), emptySvg);
});
