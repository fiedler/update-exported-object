# update-exported-object

A function to update an object exports as module.exports in a JavaScript file.

A typical case where this might be useful is if your application has a
configuration file written in JavaScript and you still want to programically be
able to update the configuration.

## Usage

```js
// myapp.config.js

module.exports = {
  setting1: true,
  someList: ["one", "two"],
  onSomething: doSomething
};

function doSomething() {
  // logic
}

// In application code

const updateExportedObject = require("update-exported-object");

const configSourceCode = fs.readFileSync(CONFIG_PATH, "utf8");
const newSourceCode = updateExportedObject(fileContents, obj => {
  obj.someList.push("three");
});
fs.writeFileSync(CONFIG_PATH, newSourceCode);
```

## API

Function signature (with Flow type annotation):

```js
function updateExportedObject<T>(source: string, updater: T => ?ObjectValue): string;
```

A single function is exported that takes a string containing source code and a function that is passed an object. The function passed as an argument can mutate the object or return a completely new object. A new source code string is returned.

The string is parsed to an AST using [recast](https://www.npmjs.com/package/recast) which also later prints this AST back to source code.

## Types

The source code that needs to be updated must contain `module.exports = {...}`. The property values of the objects and of decending objects can be of type `string`, `number`, `boolean`, `object` or it can be an Array or the value null. The same rule applies for elements in an Array.

Anything that is not covered by this rule will have the value `Symbol(unknown)` in the generated object. If this is left unchanged so is the source code of this value. In the example in the Usage section the following object is given to the function:

```js
{
  setting1: true,
  someList: ["one", "two"],
  onSomething: Symbol(unknown)
}
```
