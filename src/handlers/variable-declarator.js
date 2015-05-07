var typeRegistry = require("../types/type-registry");

module.exports = function (context) {
	var id = context.node.id.name;
	var value;

	if (context.node.init) {
		value = context.create(context.node.init).execute().result;
	}

	value = value || typeRegistry.get("UNDEFINED");
	context.scope.setProperty(id, value);

	return context.result(value, id);
};
