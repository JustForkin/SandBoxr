var ObjectType = require("../types/object-type");
var objectFactory = require("../types/object-factory");
var keywords = require("../keywords");

function Scope (parent, thisNode) {
	ObjectType.call(this);

	this.parent = parent;
	this.thisNode = thisNode;

	if (parent) {
		this.thisNode = this.thisNode || parent.thisNode;
		this.global = parent.global;
		this.version = parent.version;
		this.strict = parent.strict;
	} else {
		this.thisNode = this.thisNode || this;
		this.global = this;
		this.version = "es5";
		this.strict = false;
	}
}

Scope.prototype = Object.create(ObjectType.prototype);
Scope.prototype.constructor = Scope;

Scope.prototype.start = function () {
	objectFactory.startScope(this);
};

Scope.prototype.end = function () {
	objectFactory.endScope();
};

Scope.prototype.getProperty = function (name) {
	var current = this;

	while (current) {
		if (name in current.properties) {
			return current.properties[name].getValue(current);
		}

		current = current.parent;
	}

	return undefined;
};

Scope.prototype.defineProperty = function (name, value, descriptor, throwOnError) {
	if (throwOnError) {
		if (keywords.isReserved(name, this)) {
			throw new SyntaxError("Unexpected token " + name);
		}
	}

	// add to current scope
	ObjectType.prototype.defineProperty.call(this, name, value, descriptor || { configurable: false });
};

Scope.prototype.setProperty = function (name, value, descriptor) {
	// look for existing in scope and traverse up scope
	var current = this;
	while (current) {
		if (name in current.properties) {
			ObjectType.prototype.setProperty.call(current, name, value);
			return;
		}

		current = current.parent;
	}

	this.defineProperty(name, value, descriptor);
};

Scope.prototype.hasProperty = function (name) {
	var current = this;
	while (current) {
		if (name in current.properties) {
			return true;
		}

		current = current.parent;
	}

	return false;
};

Scope.prototype.createScope = function (thisNode) {
	return new Scope(this, thisNode);
};

Scope.prototype.withObject = function (obj) {
	var scope = new Scope(this);
	scope.properties = obj.properties;
	return scope;
};

Scope.prototype.createPrimitive = function (value) {
	return objectFactory.createPrimitive(value);
};

Scope.prototype.createObject = function (value) {
	return objectFactory.createObject(value);
};

Scope.prototype.createFunction = function (fnOrNode) {
	return objectFactory.createFunction(fnOrNode);
};

Scope.prototype.setStrict = function (strict) {
	this.strict = strict;
};

module.exports = Scope;
