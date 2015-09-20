import * as convert from "../utils/convert";

export default function* IfStatement (context) {
	let testValue = (yield context.create(context.node.test).execute()).result.getValue();
	if (convert.toBoolean(testValue)) {
		return yield context.create(context.node.consequent).execute();
	}

	if (context.node.alternate) {
		return yield context.create(context.node.alternate).execute();
	}
}
