// @flow

const updateExportedObject = require("../src");

const file = `
  var thereIsSomethingBefore = true;

  module.exports = {
    anObject: {
      oldProperty: 2  // there is a comment here
    },
    anArray: [
      { "hello": "world" }
    ],
    isSomething: true,
    aFunc: callback
  }

  function callback() {

  }
`;

type Something = {
  anObject: {
    oldProperty: number
  },
  anArray: Array<{ [string]: string }>,
  isSomething: boolean,
  aFunc: typeof Symbol
};

test("create object", () => {
  updateExportedObject(file, (obj: Something) => {
    expect(obj.anObject.oldProperty).toBe(2);
    expect(obj["anArray"].length).toBe(1);
    expect(obj.isSomething).toBe(true);
    expect(obj.aFunc.toString()).toBe("Symbol(unknown)");
  });
});

test("invalid javascript", () => {
  expect(() => {
    updateExportedObject("blah blah", () => {});
  }).toThrowError(/Unexpected identifier/);
});

test("no module.exports", () => {
  expect(() => {
    updateExportedObject("var x = 0;", () => {});
  }).toThrowError(/module.exports is not of type 'object'/);
});

test("module.exports is wrong type", () => {
  expect(() => {
    updateExportedObject("module.exports = 1", () => {});
  }).toThrowError(/module.exports is not of type 'object'/);
});

test("update property in object", () => {
  expect(
    updateExportedObject(file, obj => {
      obj.anObject.oldProperty = 1;
      obj.isSomething = false;
      obj.aFunc = { change: "type" };
    })
  ).toMatchSnapshot();
});

test("insert property in object", () => {
  expect(
    updateExportedObject(file, obj => {
      obj.anObject.newProperty = 1;
      obj.isNull = null;
    })
  ).toMatchSnapshot();
});

test("insert property with wrong type", () => {
  expect(() => {
    updateExportedObject(file, obj => {
      obj.newFunc = () => {};
    });
  }).toThrowError(/value type '\w+' not supported/);
});

test("delete property from object", () => {
  expect(
    updateExportedObject(file, obj => {
      delete obj.anObject["oldProperty"];
    })
  ).toMatchSnapshot();
});

test("get element from array", () => {
  updateExportedObject(file, obj => {
    expect(obj.anArray[0].hello).toBe("world");
  });
});

test("set element from array", () => {
  updateExportedObject(file, obj => {
    expect(
      updateExportedObject(file, obj => {
        obj.anArray[0] = { yes: "please" };
      })
    ).toMatchSnapshot();
  });
});

test("splice from array", () => {
  updateExportedObject(file, obj => {
    expect(
      updateExportedObject(file, obj => {
        obj.anArray.splice(0, 1);
      })
    ).toMatchSnapshot();
  });
});

test("push to array", () => {
  updateExportedObject(file, obj => {
    expect(
      updateExportedObject(file, obj => {
        obj.anArray.push("hello");
      })
    ).toMatchSnapshot();
  });
});

test("change type", () => {
  updateExportedObject(file, obj => {
    expect(
      updateExportedObject(file, obj => {
        obj.anArray = 1;
      })
    ).toMatchSnapshot();
  });
});

test("change type in array", () => {
  updateExportedObject(file, obj => {
    expect(
      updateExportedObject(file, obj => {
        obj.anArray[0] = "hej";
      })
    ).toMatchSnapshot();
  });
});
