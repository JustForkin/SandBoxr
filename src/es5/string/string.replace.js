import { assertIsNotNullOrUndefined } from "../../utils/contracts";
import { isNullOrUndefined } from "../../utils/checks";
import { UNDEFINED } from "../../types/primitive-type";
import { toString } from "../../utils/native";
import { exhaust as x } from "../../utils/async";
import { getMethod } from "../../utils/helpers";

export default function ($target, env, factory) {
  $target.define("replace", factory.createBuiltInFunction(function* (regexOrSubstr, substrOrFn) {
    assertIsNotNullOrUndefined(this.object, "String.prototype.replace");

    let replaceKey = env.getSymbol("replace");
    if (replaceKey && !isNullOrUndefined(regexOrSubstr)) {
      let replaceMethod = getMethod(regexOrSubstr, replaceKey);
      if (replaceMethod) {
        return yield replaceMethod.call(regexOrSubstr, [this.object, substrOrFn]);
      }
    }

    let stringValue = yield toString(this.object);

    let matcher;
    if (regexOrSubstr && regexOrSubstr.className === "RegExp") {
      matcher = regexOrSubstr.source;
    } else {
      matcher = yield toString(regexOrSubstr);
    }

    let replacer;
    if (substrOrFn && substrOrFn.type === "function") {
      replacer = function (...args) {
        let thisArg = substrOrFn.isStrict() || substrOrFn.isStrict() ? UNDEFINED : env.global;
        let mappedArgs = args.map(arg => factory.createPrimitive(arg));
        let replacedValue = x(substrOrFn.call(thisArg, mappedArgs));
        return replacedValue ? x(toString(replacedValue)) : undefined;
      };
    } else {
      replacer = yield toString(substrOrFn);
    }

    return factory.create("String", stringValue.replace(matcher, replacer));
  }, 2, "String.prototype.replace"));
}
