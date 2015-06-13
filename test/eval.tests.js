var expect = require("chai").expect;
var acorn = require("acorn");
var SandBoxr = require("../src/sandboxr");

function createRunner (text) {
	return new SandBoxr(acorn.parse(text), { parser: acorn.parse });
}

describe("Eval", function () {
	it("should eval expression if parser is defined", function () {
		var ast = acorn.parse("eval('1 + 1');");
		var runner = new SandBoxr(ast, { parser: acorn.parse });
		var result = runner.execute();

		expect(result.result.value).to.equal(2);
	});

	it("should be able to add variables to current scope", function () {
		var ast = acorn.parse("eval('var i = 2;');i;");
		var runner = new SandBoxr(ast, { parser: acorn.parse });
		var result = runner.execute();

		expect(result.result.value).to.equal(2);
	});

	describe("with Function constructor", function () {
		it("should return a function instance", function () {
			var runner = createRunner("typeof (new Function('1+2')) === 'function'");
			var result = runner.execute();

			expect(result.result.value).to.be.true;
		});

		it("should execute parsed code when called", function () {
			var runner = createRunner("(new Function('1+2'))() === 3;");
			var result = runner.execute();

			expect(result.result.value).to.be.true;
		});

		it("should allow arguments to be defined", function () {
			var runner = createRunner("(new Function('a', 'b', 'a + b'))(1,2) === 3;");
			var result = runner.execute();

			expect(result.result.value).to.be.true;
		});

		it("should run in the global scope", function () {
			var runner = createRunner("function a() { return new Function('return this;'); }\na()() === this;");
			var result = runner.execute();

			expect(result.result.value).to.be.true;
		});
	})
});
