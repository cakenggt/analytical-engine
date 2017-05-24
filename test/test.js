const test = require('tape');

const AE = require('../index');

var eng = new AE.Interface();

test('clear state test', (t) => {
	t.plan(6);

	let cards = `N000 1
N001 2
+
L000
L001
S002`;

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();

	// before state is cleared
	t.equal(eng.store.get(2).value, 3);
	t.equal(eng.mill.egress[0].value, 3);
	t.notEqual(eng.mill.operation, 0);

	eng.clearState();

	// after state is cleared
	t.equal(eng.store.get(2).value, 0);
	t.equal(eng.mill.egress[0].value, 0);
	t.equal(eng.mill.operation, 0);
});

test('addition test', (t) => {
	t.plan(1);

	let cards = `N000 1
N001 2
+
L000
L001
S002`;

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();
	t.equal(eng.store.get(2).value, 3);
});

test('sqrt test', (t) => {
	t.plan(1);

	let cards = `A set decimal places to 5
N000 4.0
A include from library cards for sqrt`;

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();

	t.equal(eng.store.get(0).value, 200000);
});

test('custom function test', (t) => {
	t.plan(1);

	let cards = `N000 4
A include cards test/addtwo.ae`;

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();

	t.equal(eng.store.get(0).value, 6);
});

test('combinatorial cards test', (t) => {
	t.plan(1);

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

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();

	t.equal(eng.store.get(1).value, 720);
});

test('combinatorial cards shorthand test', (t) => {
	t.plan(1);

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

	eng.clearState();
	eng.submitProgram(cards);
	eng.runToCompletion();

	t.equal(eng.store.get(1).value, 5040);
});
