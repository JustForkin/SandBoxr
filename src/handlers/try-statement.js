var objectFactory = require("../types/object-factory");

module.exports = function (context) {
	var result;

	try {
		result = context.create(context.node.block).execute();
	} catch (err) {
		if (context.node.handler) {
			var scope = context.scope.createScope();
			scope.setProperty(context.node.handler.param.name, objectFactory.createPrimitive(err));

			result = context.create(context.node.handler.body, context.node.handler, scope).execute();
		}
	} finally {
		if (context.node.finalizer) {
			result = context.create(context.node.finalizer).execute();
		}
	}

	return result;
};
