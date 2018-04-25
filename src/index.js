// @flow
const recast = require("recast");

import type {
  ObjectExpression,
  Node,
  Value,
  ObjectValue,
  ArrayExpression,
  Builders,
  Property
} from "./types.js.flow";

const b: Builders = recast.types.builders;

const unknown = Symbol("unknown");

function isObject(value: Value): %checks {
  return typeof value === "object" && value != null && !isArray(value);
}
function isLiteral(value: Value): %checks {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    value == null
  );
}
function isArray(value: Value): %checks {
  return Array.isArray(value);
}
function isSymbol(value: Value): %checks {
  return value === unknown;
}

const typeMatch = (node: Node, value: Value) => {
  return (
    (node.type === "ObjectExpression" && isObject(value)) ||
    (node.type === "Literal" && isLiteral(value)) ||
    (node.type === "ArrayExpression" && isArray(value)) ||
    (node.type === "Identifier" && isSymbol(value))
  );
};

function toObject(node: ObjectExpression): ObjectValue {
  return node.properties.reduce((obj, property) => {
    const key = getPropName(property);

    if (typeof key !== "string") {
      throw TypeError("key for object must be a string");
    }
    obj[key] = toValue(property.value);

    return obj;
  }, {});
}

function toArray(node: ArrayExpression) {
  return node.elements.map(toValue);
}

function toValue(node: Node): Value {
  if (node.type === "Literal") {
    return node.value;
  } else if (node.type === "ObjectExpression") {
    return toObject(node);
  } else if (node.type === "ArrayExpression") {
    return toArray(node);
  }

  return unknown;
}

const literalToNode = b.literal;
const objectToNode = (value: ObjectValue) => {
  return b.objectExpression(
    Object.keys(value).map(key =>
      b.property("init", b.literal(key), toNode(value[key]))
    )
  );
};
const arrayToNode = (value: Array<Value>) =>
  b.arrayExpression(value.map(toNode));

const toNode = (value: Value): Node => {
  if (isArray(value)) {
    return arrayToNode(value);
  } else if (isLiteral(value)) {
    return literalToNode(value);
  } else if (isObject(value)) {
    return objectToNode(value);
  }

  throw new TypeError(`value type '${typeof value}' not supported`);
};

const getPropName = (property: Property) => {
  if (property.key.type === "Literal") {
    return property.key.value;
  }
  return property.key.name;
};

const isPropNamed = (name: string) => (property: Property) =>
  getPropName(property) === name;

function updateNode(node: Node, source: Value) {
  if (isObject(source) && node.type === "ObjectExpression") {
    for (let key of Object.keys(source)) {
      const property = node.properties.find(isPropNamed(key));
      const value = source[key];
      if (property) {
        if (typeMatch(property.value, value)) {
          updateNode(property.value, value);
        } else {
          property.value = toNode(value);
        }
      } else {
        node.properties.push(b.property("init", b.literal(key), toNode(value)));
      }
    }

    const refined: ObjectValue = source;
    node.properties = node.properties.filter(prop =>
      refined.hasOwnProperty(getPropName(prop))
    );
  } else if (isLiteral(source) && node.type === "Literal") {
    node.value = source;
  } else if (isArray(source) && node.type === "ArrayExpression") {
    node.elements.length = source.length;
    for (let idx = 0; idx < source.length; idx++) {
      if (node.elements[idx] && typeMatch(node.elements[idx], source[idx])) {
        updateNode(node.elements[idx], source[idx]);
      } else {
        node.elements[idx] = toNode(source[idx]);
      }
    }
  } else if (node.type === "Identifier" && isSymbol(source)) {
    // do nothing
  } else {
    throw TypeError(`types do not match ${typeof source} to ${node.type}`);
  }
}

function filterExportedObject(node) {
  return (
    node.type === "ExpressionStatement" &&
    node.expression.type === "AssignmentExpression" &&
    // left = module.exports
    node.expression.left.type === "MemberExpression" &&
    node.expression.left.object.name === "module" &&
    node.expression.operator === "=" &&
    node.expression.left.property.name === "exports" &&
    // // right is an object
    node.expression.right.type === "ObjectExpression"
  );
}

function updateExportedObject<T>(
  source: string,
  updater: T => ?ObjectValue
): string {
  const ast = recast.parse(source);

  // get the object
  const assignment = ast.program.body.filter(filterExportedObject);
  if (assignment.length === 0) {
    throw TypeError("module.exports is not of type 'object'");
  }
  const objNode = assignment[0].expression.right;
  const obj = toValue(objNode);

  const newObj = updater(((obj: any): T)); // unsafely cast to T for consumer
  const updatedObj = typeof newObj === "object" ? newObj : obj;

  updateNode(objNode, updatedObj);

  return recast.print(ast).code;
}

module.exports = updateExportedObject;
