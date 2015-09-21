import {execute as exec} from "../utils/func";
import * as contracts from "../utils/contracts";
import {each} from "../utils/async";

function setDescriptor (env, obj, name, descriptor) {
	let strict = env.isStrict();

	if (descriptor.get) {
		contracts.assertAreValidArguments(descriptor.get.node.params, strict);
		descriptor.getter = function* () {
			return yield exec(env, descriptor.get, descriptor.get.node.params, [], this, descriptor.get.node);
		};
	}

	if (descriptor.set) {
		contracts.assertAreValidArguments(descriptor.set.node.params, strict);
		descriptor.setter = function* () {
			yield exec(env, descriptor.set, descriptor.set.node.params, arguments, this, descriptor.set.node);
		};
	}

	obj.defineOwnProperty(name, descriptor);
}

function createDescriptor (value) {
	return { value: value, configurable: true, enumerable: true, writable: true };
}

export default function* ObjectExpression (context) {
	let obj = context.env.objectFactory.createObject();
	let descriptors = Object.create(null);

	yield* each(context.node.properties, function* (property) {
		let value = (yield context.create(property.value).execute()).result.getValue();
		let name = property.key.name || property.key.value;

		switch (property.kind) {
			case "get":
			case "set":
				descriptors[name] = descriptors[name] || createDescriptor();
				descriptors[name][property.kind] = value;
				break;

			default:
				obj.defineOwnProperty(name, createDescriptor(value));
				break;
		}
	});

	for (let prop in descriptors) {
		setDescriptor(context.env, obj, prop, descriptors[prop]);
	}

	return context.result(obj);
}
