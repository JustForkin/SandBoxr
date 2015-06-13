var objectFactory = require("../types/object-factory");
var utils = require("../utils");
var util = require("../util");

var slice = Array.prototype.slice;
var propertyConfig = { enumerable: false };

module.exports = function (globalScope, options) {
	var functionClass = objectFactory.createFunction(function () {
		var context = this;
		if (options.parser && arguments.length > 0) {
			var args = slice.call(arguments).map(function (arg) { return utils.toPrimitive(context, arg, "string"); });
			var body = options.parser("(function () {" + args.pop() + "}).apply(this, arguments);");

			var fnNode = {
				type: "FunctionDeclaration",
				params: args.map(function (arg) {
					return {
						type: "Identifier",
						name: arg
					};
				}),
				body: body
			};

			var fn = objectFactory.createFunction(fnNode, globalScope);
			fn.setProperty("constructor", functionClass);
			return fn;
		}

		if (this.isNew) {
			this.node.setProperty("constructor", functionClass);
			return this.node;
		}

		return objectFactory.createObject();
	}, globalScope);

	var proto = functionClass.proto;
	proto.defineProperty("toString", objectFactory.createFunction(utils.wrapNative(Function.prototype.toString)), propertyConfig);
	proto.defineProperty("valueOf", objectFactory.createFunction(utils.wrapNative(Function.prototype.valueOf)), propertyConfig);

	proto.defineProperty("call", objectFactory.createFunction(function (thisArg) {
		var args = slice.call(arguments, 1);
		var params = this.node.native ? [] : this.node.node.params;
		var callee = this.node.native ? this.node : this.node.node;

		return utils.executeFunction(this, this.node, params, args, thisArg, callee);
		// utils.loadArguments(this.node.node.params, args, scope);
		// return this.create(this.node.node.body, this.node, scope).execute().result;
	}), propertyConfig);

	proto.defineProperty("apply", objectFactory.createFunction(function (thisArg, argsArray) {
		var args = util.toArray(argsArray);
		var params = this.node.native ? [] : this.node.node.params;
		var callee = this.node.native ? this.node : this.node.node;

		return utils.executeFunction(this, this.node, params, args, thisArg, callee);
	}), propertyConfig);

	proto.defineProperty("bind", objectFactory.createFunction(function (thisArg) {
		var args = slice.call(arguments, 1);
		var callee = this.node;

		return objectFactory.createFunction(function () {
			var scope = this.scope.createScope(thisArg);
			utils.loadArguments(callee.node.params, args.concat(slice.call(arguments)), scope);
			return this.create(callee.node.body, callee, scope).execute().result;
		});
	}), propertyConfig);

	globalScope.defineProperty("Function", functionClass, { enumerable: false });
};
