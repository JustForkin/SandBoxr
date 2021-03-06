import { assertIsMap } from "../utils/contracts";

export default function ($target, env, factory) {
  let getter = function () {
    assertIsMap(this, "Map.prototype.size");
    return factory.createPrimitive(this.data.filter(v => v).length);
  };

  let getterFunc = factory.createGetter(function () {
    return getter.call(this.object);
  }, "size");

  $target.define("size", null, {
    getter: getter,
    get: getterFunc
  });
}
