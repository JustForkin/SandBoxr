var objectFactory = require("../types/object-factory");
var utils = require("../utils");
var contracts = require("../utils/contracts");

var protoMethods = ["charAt", "charCodeAt", "concat", "indexOf", "lastIndexOf", "localeCompare", "slice", "substr", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toString", "toUpperCase", "trim", "valueOf"];
var slice = Array.prototype.slice;
var propertyConfig = { configurable: true, enumerable: false, writable: true };

module.exports = function (globalScope) {
	var stringClass = objectFactory.createFunction(function (value) {
		var stringValue = String(utils.toPrimitive(this, value, "string"));
		var newValue = objectFactory.createPrimitive(stringValue);

		// called as new
		if (this.isNew) {
			// convert to object
			newValue.type = "object";
			newValue.isPrimitive = false;
			// return utils.createWrappedPrimitive(this.node, value);
		}

		return newValue;
		// return objectFactory.createPrimitive(value);
	}, globalScope);

	var proto = stringClass.proto;

	proto.defineOwnProperty("search", objectFactory.createFunction(function (regex) {
		return objectFactory.createPrimitive(this.node.value.search(regex.source));
	}), propertyConfig);

	proto.defineOwnProperty("substring", objectFactory.createFunction(function (start, end) {
		contracts.assertIsNotConstructor(this, "substring");

		var value = utils.toPrimitive(this, this.node, "string");
		var length = value.length;

		start = utils.toInteger(this, start);
		end = contracts.isNullOrUndefined(end) ? length : utils.toInteger(this, end);

		return objectFactory.createPrimitive(value.substring(start, end));
	}), propertyConfig);

	protoMethods.forEach(function (name) {
		var fn = String.prototype[name];
		if (fn) {
			proto.defineOwnProperty(name, objectFactory.createFunction(utils.wrapNative(fn)), propertyConfig);
		}
	}, propertyConfig);

	stringClass.defineOwnProperty("fromCharCode", objectFactory.createFunction(function (charCode) {
		var context = this;
		var args = slice.call(arguments).map(function (arg) { return utils.toPrimitive(context, arg); });
		return objectFactory.createPrimitive(String.fromCharCode.apply(null, args));
	}), propertyConfig);

	proto.defineOwnProperty("split", objectFactory.createFunction(function (separator, limit) {
		separator = separator && (separator.source || separator.value);
		limit = limit && limit.toNumber();

		var result = this.node.value.split(separator, limit);

		var arr = objectFactory.create("Array");
		result.forEach(function (value, index) {
			arr.putValue(index, objectFactory.createPrimitive(value));
		});

		return arr;
	}), propertyConfig);

	proto.defineOwnProperty("replace", objectFactory.createFunction(function (regexOrSubstr, substrOrFn) {
		var match = regexOrSubstr && (regexOrSubstr.source || regexOrSubstr.value);

		if (substrOrFn && substrOrFn.type === "function") {
			var executionContext = this;
			var wrappedReplacer = function () {
				var scope = executionContext.scope.createScope();
				var args = slice.call(arguments).map(function (arg) { return objectFactory.createPrimitive(arg); });

				utils.loadArguments(substrOrFn.node.params, args, scope);
				var result = executionContext.create(substrOrFn.node.body, substrOrFn.node, scope).execute().result;
				return result && result.value;
			};

			return objectFactory.createPrimitive(this.node.value.replace(match, wrappedReplacer));
		}

		return objectFactory.createPrimitive(this.node.value.replace(match, substrOrFn && substrOrFn.value));
	}), propertyConfig);

	proto.defineOwnProperty("match", objectFactory.createFunction(function (regex) {
		var results = this.node.toString().match(regex && regex.source);
		if (results) {
			var matches = objectFactory.create("Array");
			results.forEach(function (value, index) {
				matches.putValue(index, objectFactory.createPrimitive(value));
			});

			return matches;
		}

		return globalScope.getValue("null");
	}), propertyConfig);

	proto.defineOwnProperty("trim", objectFactory.createFunction(function () {
		contracts.assertIsNotNullOrUndefined(this.node, "String.prototype.trim");

		var value = utils.toPrimitive(this, this.node, "string");
		return objectFactory.createPrimitive(value.trim());
	}), propertyConfig);

	globalScope.defineOwnProperty("String", stringClass, { enumerable: false });
};
