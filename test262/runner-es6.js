var path = require("path");
var fs = require("fs");
var vfs = require("vinyl-fs");
var acorn = require("acorn");
var SandBoxr = require("../dist/sandboxr");
var through = require("through2");
var gutil = require("gulp-util");
var yargs = require("yargs");

var args = 	yargs.default("verbose", false)
	.alias("v", "verbose")
	.default("in", "**/*.js")
	.alias("i", "in")
	.argv;

var infoBlock = /\/\*---([\s\S]*)---\*\//;
var infoSelector = /(\w+):\s*>?(.*)\s*/;

var failed = gutil.colors.bold.red("failed:");
var passed = gutil.colors.green("passed:");
var skipped = gutil.colors.blue("skipped:");

var harness = acorn.parse(fs.readFileSync(path.join(__dirname, "harness-es6.js")), { ecmaVersion: 6 });

var root = path.join(__dirname, "../../test262/test/");
var results = [];
var verbose = args.verbose;

// array -8
// weakmap -10
// object -25
// set -7
// number -1
// date -16
// symbol -4
// string -9
// boolean +
// reflect +

function getInfo (file) {
	var info = {
		src: file.contents.toString(),
		filename: path.basename(file.path)
	};
	
	var block = infoBlock.exec(info.src);
	if (block) {
		var lines = block[1].split(/\n/);
		var current;
		
		lines.forEach(function (line) {
			var match = infoSelector.exec(line);
			if (match) {
				current = match[1].toLowerCase();
				info[current] = match[2];
			} else if (current) {
				info[current] += " " + line.trim();
			}
		});
	}
	
	return info;
}

vfs.src(args.in, { cwd: root, verbose: true })
	.pipe(through.obj(function (file, enc, cb) {
		var info = getInfo(file);
		var useStrict = info.flags && info.flags.indexOf("onlyStrict") !== -1;
		var current = { file: file, info: info };

    if (!("es5id" in info || "es6id" in info)) {
      if (verbose) { 
        gutil.log("skipping:", info.filename, "-", info.description);
      }
      
      current.skipped = true;
      cb(null, current);
      return;
    }
    
		if (verbose) {
			gutil.log("starting:", info.filename, "-", info.description);
		}

		var ast;
		try {
			ast = acorn.parse(info.src, { ecmaVersion: 6 });
		} catch (err) {
			current.passed = String(info.negative || "").trim() === String(err.name).trim();

			current.err = err;
			cb(null, current);
			return;
		}

		var parser = function (text) { return acorn.parse(text, { ecmaVersion: 6 }); };
		var sandbox = SandBoxr.create(ast, { ecmaVersion: 6, parser: parser, useStrict: useStrict, imports: [{ ast: harness }]});

		try {
			sandbox.execute();
			current.passed = !info.negative;
			cb(null, current);
		} catch (err) {
			if ("toNative" in err) {
				err = err.toNative();
			}

			current.passed = info.negative === err.name;
			current.err = err;
			cb(null, current);
		}
	}))
	.pipe(through.obj(function (result, enc, cb) {
		if (!result.passed && !result.skipped) {
			gutil.log(failed, result.info.filename, result.info.description);
			
			if (result.info.negative) {
				gutil.log("expected:", result.info.negative);
				gutil.log("actual:", result.err && result.err.name);
			}
			
			gutil.log("path:", result.file.path);
			gutil.log(result.err);
		} else if (verbose) {
			var status = result.passed ? passed : skipped;
			gutil.log(status, result.info.filename, result.info.description);
		}

		results.push(result);
		cb();
	}))
	.on("finish", function () {
		var totalPassed = results.filter(function (o) { return o.passed; }).length;
		var totalSkipped = results.filter(function (o) { return o.skipped; }).length;
    
		gutil.log("TOTALS ==============================");
		gutil.log(passed, totalPassed);
		gutil.log(skipped, totalSkipped);
		gutil.log(failed, results.length - totalPassed - totalSkipped);
	});
	
	// .pipe(through.obj(function (file, enc, done) {
	// 	processFile(file, harness, done);
	// 	// if (!harness) {
	// 	// 	loadHarness(function (src) {
	// 	// 		harness = src;
	// 	// 		processFile(file, harness, done);
	// 	// 	});
	// 	// } else {
	// 	// 	processFile(file, harness, done);
	// 	// }
	// }));

// glob("**/*.js", {cwd: root}, function (err, files) {
// 	gutil.log(files);
// });