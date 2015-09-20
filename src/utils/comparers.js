import * as convert from "./convert";

function neg (value) {
	if (value === undefined) {
		return false;
	}

	return !value;
}

function pos (value) {
	return !!value;
}

const comparers = {
	areSame (a, b) {
		if (a.type !== b.type) {
			return false;
		}

		if (a.isPrimitive && b.isPrimitive) {
			if (a.value == null) {
				return true;
			}

			if (a.type === "number") {
				if (isNaN(a.value) && isNaN(b.value)) {
					return true;
				}

				if (a.value === 0) {
					// this will account for negative zero
					return 1 / a.value === 1 / b.value;
				}
			}

			return a.value === b.value;
		}

		return a === b;
	},

	*implicitEquals (env, a, b) {
		/* eslint-disable eqeqeq */
		if (a.isPrimitive && b.isPrimitive) {
			return a.value == b.value;
		}

		if ((a.type === "object" && b.type === "object") || (a.type === "function" && b.type === "function")) {
			return a === b;
		}

		let primitiveA = yield convert.toPrimitive(env, a);
		let primitiveB = yield convert.toPrimitive(env, b);

		if ((typeof primitiveA === "number" || typeof primitiveB === "number") || (typeof primitiveA === "boolean" || typeof primitiveB === "boolean")) {
			return Number(primitiveA) === Number(primitiveB);
		}

		if (typeof primitiveA === "string") {
			return primitiveA === (yield convert.toPrimitive(env, b, "string"));
		}

		if (typeof primitiveB === "string") {
			return (yield convert.toPrimitive(env, a, "string")) === primitiveB;
		}

		// use native implicit comarison
		return primitiveA == primitiveB;
		/* eslint-enable eqeqeq */
	},

	strictEquals (env, a, b) {
		if (a.isPrimitive && b.isPrimitive) {
			return a.value === b.value;
		}

		if (a.isPrimitive || b.isPrimitive) {
			return false;
		}

		return a === b;
	},

	*relationalCompare (env, a, b, leftFirst) {
		let primitiveA, primitiveB;
		if (leftFirst) {
			primitiveA = yield convert.toPrimitive(env, a, "number");
			primitiveB = yield convert.toPrimitive(env, b, "number");
		} else {
			primitiveB = yield convert.toPrimitive(env, b, "number");
			primitiveA = yield convert.toPrimitive(env, a, "number");
		}

		if (typeof primitiveA === "string" && typeof primitiveB === "string") {
			return primitiveA < primitiveB;
		}

		primitiveA = Number(primitiveA);
		primitiveB = Number(primitiveB);

		if (isNaN(primitiveA) || isNaN(primitiveB)) {
			return undefined;
		}

		return primitiveA < primitiveB;
	},

	*["=="] () { return yield this.implicitEquals(...arguments); },
	*["!="] () { return !(yield this.implicitEquals(...arguments)); },

	["==="] () { return this.strictEquals(...arguments); },
	["!=="] () { return !this.strictEquals(...arguments); },

	*["<"] (env, a, b) { return pos(yield this.relationalCompare(env, a, b, true)); },
	*["<="] (env, a, b) { return neg(yield this.relationalCompare(env, b, a, false)); },
	*[">"] (env, a, b) { return pos(yield this.relationalCompare(env, b, a, false)); },
	*[">="] (env, a, b) { return neg(yield this.relationalCompare(env, a, b, true)); }
};

export default comparers;