var convert = require("../utils/convert");
var contracts = require("../utils/contracts");
var func = require("../utils/func");
var NativeFunctionType = require("../types/native-function-type");

function defineThis (env, fn, thisArg) {
	if (fn.builtIn) {
		return thisArg || env.global.getProperty("undefined").getValue();
	}

	if (contracts.isNullOrUndefined(thisArg)) {
		return env.global;
	}

	return convert.toObject(env, thisArg);
}

var frozen = { configurable: false, enumerable: false, writable: false };

module.exports = function (env, options) {
	var globalObject = env.global;
	var undef = env.global.getProperty("undefined").getValue();
	var objectFactory = env.objectFactory;
	var funcClass;

	var funcCtor = function (...args) {
		var funcInstance;

		if (options.parser && args.length > 0) {
			let body = args.pop();

			if (args.length > 0) {
				args = args.map(function (arg, index) {
					if (contracts.isNull(arg)) {
						throw new SyntaxError("Unexpected token null");
					}

					return contracts.isUndefined(arg) ? "" : convert.toString(env, arg);
				})
				// the spec allows parameters to be comma-delimited, so we will join and split again comma
				.join(",").split(/\s*,\s*/g);
			}

			let ast = options.parser("(function(){" + convert.toString(env, body) + "}).apply(this,arguments);");
			let params = args.map(function (arg) {
				arg = arg.trim();
				contracts.assertIsValidParameterName(arg);

				return {
					type: "Identifier",
					name: arg
				};
			});

			let callee = {
				type: "FunctionDeclaration",
				params: params,
				body: ast
			};

			var fn = objectFactory.createFunction(callee);
			var wrappedFunc = function () {
				var thisArg = this.node || globalObject;
				if (this.isNew) {
					thisArg = objectFactory.createObject(funcInstance);
				}

				var executionResult = func.getFunctionResult(env, fn, params, arguments, thisArg, callee);

				if (this.isNew) {
					return thisArg;
				}

				return executionResult && executionResult.result || undef;
			};

			wrappedFunc.nativeLength = callee.params.length;
			funcInstance = objectFactory.createFunction(wrappedFunc);
			funcInstance.bindScope(env.globalScope);
		} else {
			funcInstance = objectFactory.createFunction(function () {});
		}

		funcInstance.putValue("constructor", funcClass);
		return funcInstance;
	};

	// the prototype of a function is actually callable and evaluates as a function
	var proto = new NativeFunctionType(function () {});

	funcCtor.nativeLength = 1;
	funcClass = objectFactory.createFunction(funcCtor, proto, frozen);
	funcClass.putValue("constructor", funcClass);

	globalObject.define("Function", funcClass);

	proto.define("length", objectFactory.createPrimitive(0), frozen);

	// function itself is a function
	funcClass.setPrototype(proto);

	proto.define("toString", objectFactory.createBuiltInFunction(function () {
		if (this.node.native) {
			return objectFactory.createPrimitive("function () { [native code] }");
		}

		return objectFactory.createPrimitive("function () { [user code] }");
	}, 0, "Function.prototype.toString"));

	proto.define("call", objectFactory.createBuiltInFunction(function (thisArg, ...args) {
		var params = this.node.native ? [] : this.node.node.params;
		var callee = this.node.native ? this.node : this.node.node;
		thisArg = defineThis(env, this.node, thisArg);
		this.node.bindThis(thisArg);

		return func.executeFunction(env, this.node, params, args, thisArg, callee);
	}, 1, "Function.prototype.call"));

	proto.define("apply", objectFactory.createBuiltInFunction(function (thisArg, argsArray) {
		if (argsArray) {
			if (argsArray.className !== "Arguments" && argsArray.className !== "Array") {
				throw new TypeError("Arguments list was wrong type");
			}
		}

		var args = convert.toArray(argsArray);
		var params = this.node.native ? [] : this.node.node.params;
		var callee = this.node.native ? this.node : this.node.node;
		thisArg = defineThis(env, this.node, thisArg);
		this.node.bindThis(thisArg);

		return func.executeFunction(env, this.node, params, args, thisArg, callee);
	}, 2, "Function.prototype.apply"));

	proto.define("bind", objectFactory.createBuiltInFunction(function (thisArg, ...args) {
		var fn = this.node;
		var params = fn.native ? [] : fn.node.params;
		var callee = fn.native ? fn : fn.node;
		thisArg = defineThis(env, this.node, thisArg);

		var thrower = function () { throw new TypeError("'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them"); };
		var throwProperties = {
			get: undefined,
			getter: thrower,
			set: undefined,
			setter: thrower,
			enumerable: false,
			configurable: false
		};

		var nativeFunc = function (...additionArgs) {
			var mergedArgs = args.concat(additionArgs);
			return func.executeFunction(env, fn, params, mergedArgs, thisArg, callee, this.isNew);
		};

		nativeFunc.nativeLength = Math.max(params.length - args.length, 0);
		var boundFunc = objectFactory.createFunction(nativeFunc);

		boundFunc.defineOwnProperty("caller", throwProperties);
		boundFunc.defineOwnProperty("arguments", throwProperties);
		boundFunc.defineOwnProperty("callee", throwProperties);
		boundFunc.bindScope(this.env.current);
		boundFunc.bindThis(thisArg);

		return boundFunc;
	}, 1, "Function.prototype.bind"));
};
