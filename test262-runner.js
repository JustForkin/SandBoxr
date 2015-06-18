var fs = require("fs");
var glob = require("glob");
var colors = require("colors");
var acorn = require("acorn");
var args = require("yargs")
	.default("stopOnFail", true)
	.default("strict", false)
	.default("verbose", false)
	.alias("v", "verbose")
	.argv;

var SandBoxr = require("./src/sandboxr");
var verbose = args.verbose;
var stopOnFail = args.stopOnFail;
var strictMode = args.strict;

var root = "test262/test/";
var include = fs.readFileSync("test262-harness.js");

var tests = [
	// root + "suite/ch06/**/*.js", // passed!
	// root + "suite/ch07/**/*.js",	// passed!
	// root + "suite/ch08/**/*.js",	// passed!
	// root + "suite/ch09/**/*.js",	// passed!
	// root + "suite/ch10/**/*.js",	// scope
	root + "suite/ch11/11.4/11.4.1/**/*.js",
	// root + "suite/ch12/12.10/**/*.js"
	// root + "suite/ch13/**/*.js",	// functions
	// root + "suite/ch14/**/*.js",	// program
	// root + "suite/ch15/15.1/**/*.js",	// global
	// root + "suite/ch15/15.2/15.2.3/15.2.3.3/**/*.js",	// object
	// root + "suite/ch15/15.3/**/*.js",	// function
	// root + "suite/ch15/15.4/**/*.js",	// array
	// root + "suite/ch15/15.4/15.4.4/15.4.4.17/**/*.js",
	// root + "suite/ch15/15.5/15.5.4/15.5.4.15/**/*.js",	// string
	// root + "suite/ch15/15.6/**/*.js",	// boolean
	// root + "suite/ch15/15.7/**/*.js",	// number
	// root + "suite/ch15/15.8/**/*.js",	// math
	// root + "suite/ch15/15.9/**/*.js",	// date
	// root + "suite/ch15/15.10/**/*.js",	// regex
	// root + "suite/ch15/15.11/**/*.js",	// error
	// root + "suite/ch15/15.12/**/*.js",	// json
	// root + "suite/annexB/**/*.js",	// passed
	// root + "suite/bestPractice/**/*.js"
];

var exclusions = [
	/S15\.4\.4\.10_A3_T[1-2]\.js$/i,
	/S15\.4\.4\.13_A3_T2\.js$/i,
	/15\.4\.4\.15-3-14\.js$/i,
	/15\.4\.4\.15-5-12\.js$/i,
	/15\.4\.4\.15-5-16\.js$/i,
	/15\.4\.4\.18-3-14\.js$/i,
	/15\.4\.4\.19-3-14\.js$/i,
	/15\.4\.4\.19-3-28\.js$/i,
	/15\.4\.4\.19-3-29\.js$/i,
	/15\.4\.4\.19-3-8\.js$/i,
	/15\.4\.4\.20-3-14\.js$/i,
	/15\.4\.4\.21-3-14\.js$/i,
	/15\.4\.4\.22-3-14\.js/i,
	/S15\.4\.5\.2_A3_T4\.js/i
];

var descriptionRgx = /\*.*@description\s+(.*)\s*\n/i;
var negativeRgx = /\*.*@negative\b/i;
var strictRgx = /\*.*@(?:no|only)Strict\b/i;

var running = true;
var passedCount = 0;
var skippedCount = 0;
var failedCount = 0;

var files, file, contents, description;

for (var i = 0; running && i < tests.length; i++) {
	files = glob.sync(tests[i]);

	for (var j = 0; running && j < files.length && running; j++) {
		file = files[j];

		if (exclusions.some(function (excl) { return excl.test(file); })) {
			testSkipped(file, "Excluded");
			continue;
		}

		contents = fs.readFileSync(file, "utf-8");

		if (negativeRgx.test(contents)) {
			testSkipped(file, "Syntax check");
			continue;
		}

		if (!strictMode && strictRgx.test(contents)) {
			testSkipped(file, "Strict mode");
			continue;
		}

		description = descriptionRgx.exec(contents)[1];

		try {
			testStarting(file, description);

			var ast = acorn.parse(include + contents);
			var runner = new SandBoxr(ast, { parser: acorn.parse });

			runner.execute();
		} catch (err) {
			testFailed(file, description, err);

			if (stopOnFail) {
				running = false;
				break;
			}

			continue;
		}

		testPassed(file, description);
	}
}

if (passedCount) {
	console.log(colors.green("total passed: " + passedCount));
}

if (failedCount) {
	console.log(colors.red("total failed: " + failedCount));
}

if (skippedCount) {
	console.log(colors.blue("total skipped: " + skippedCount));
}

function testStarting (name, desc) {
	if (verbose) {
		console.log(colors.blue("starting: ") + name + " (" + desc + ")");
	}
}

function testPassed (name, desc) {
	if (verbose) {
		console.log(colors.green("passed: ") + name + " (" + desc + ")");
	}

	passedCount++;
}

function testFailed (name, desc, err) {
	console.log(colors.red("failed: ") + name + " (" + desc + ")");
	console.error(err);

	failedCount++;
}

function testSkipped (name, reason) {
	if (verbose) {
		console.log(colors.blue("skipped: ") + name + " (" + reason + ")");
	}

	skippedCount++;
}
