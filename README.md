# Analytical Engine

An Analytical Engine emulator for Node.

# Background

This library is an emulator of Charles Babbage's [Analytical Engine](https://en.wikipedia.org/wiki/Analytical_Engine), a Victorian era Turing-complete computer. The work of John Walker was used to build this, and it is mostly a port of his [web emulator](http://fourmilab.ch/babbage/emulator.html).

# Usage

Much better documentation than I could ever write can be found on John Walker's [Analytical Engine Table of Contents](http://fourmilab.ch/babbage/contents.html), particularly in the [Programming Cards](http://fourmilab.ch/babbage/cards.html) section, which explains how to program the machine.

This specific implementation differs from the web emulator in how you interact with it, which I will attempt to describe below.

## `AE`

`AE` is the object that you get when you require this library. It has listings for all of the individual components of the Analytical Engine, as well as a helper called `Interface`.

```js
const AE = require('analytical-engine');
```

## `AE.Interface`

`AE.Interface` is an object that is meant to help set up the engine in a common way using only a few commands. If you were not to use this, it would take many lines of code to connect each of the separate components of the Analytical Engine together.

```js
const interface = new AE.Interface();
```

### `AE.Interface.clearState()`

The `clearState` method of `AE.Interface` is meant to clear the contents of the Mill and Store, as well as setting resetting the card stack to the beginning for another run. The current program is maintained, so you don't have to submit it again, but it is set back to the beginning.

### `AE.Interface.submitProgram(cards)`

The `submitProgram` method of `AE.Interface` is meant to be a shortcut method of setting up a program on the Analytical Engine. The program submitted should be a string. This method should return 0 if the internal libraries referenced in the program were expanded properly. If it doesn't, check the Attendant's log for errors in `interface.annunciator.L_output`.

### `AE.Interface.runToCompletion()`

The `runToCompletion` method of `AE.Interface` will cause the engine to run until it either finishes or errors out. Errors can be checked for in the Attendant's log (`interface.annunciator.L_output`).

## Accessing Engine Components

The components of the engine of an `AE.Interface` instance can be accessed using the following attributes.

* annunciator
* timing
* printer
* curveDrawingApparatus
* attendant
* mill
* cardReader
* store
* engine

The constructors for each of these components can be found in the `AE` main export.

* Annunciator
* Timing
* Printer
* CurveDrawingApparatus
* Attendant
* Mill
* Program
	* CardReader
	* CardSource
	* Card
	* Program
* Store
* Engine

## Libraries

All of the functions described in [The Mathematical Function Library](http://fourmilab.ch/babbage/library.html) are included in this emulator and can be run by using a `A include from library cards for libraryname` card.

You can write your own libraries as well. They must end with the extension `.ae`. You can include them in your code by using a `A include cards relative/path/to/library` card, where the extension is omitted from the library name.

## Curve Drawing Apparatus

In the [Programming Cards](http://fourmilab.ch/babbage/cards.html) section, the Curve Drawing Apparatus is mentioned as a way to draw images using the engine. When you have run a program that you expect a drawing out of, `interface.curveDrawingApparatus.printScreen()` will return an SVG string of the curve that was drawn. This SVG can then be inserted into html or saved and opened up in an SVG editor to be viewed.

## Command Line Interface

The `analytical-engine` command line program is provided to give you a quick method of running Analytical Engine programs. To use this program, simply give it the location of an Analytical Engine program and it will run it to completion.

Example: `analytical-engine scripts/mandelbrot.ae`

After the program is finished executing, it will print out the contents of the Attendant's Log, Printer, and Curve Drawing Apparatus in that order. If you want to see the result of a calculation, I suggest using Print cards.

## Analytical Engine Language for Atom

Now is as good a time as any to plug my work on a very simple package which provides Analytical Engine language support for the Atom text editor.
