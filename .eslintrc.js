module.exports = {
  parser: "@babel/eslint-parser",
  extends: "airbnb-base",
  env: {
    node: true,
    mocha: true,
  },
  globals: {
    expect: false,
    describe: false,
  },
  rules: {
    "consistent-return": 0,
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/*.test.js"],
      },
    ],
    "max-len": 0,
    "no-console": 0,
    "no-param-reassign": 0,
    "no-plusplus": 0,
    "no-underscore-dangle": 0,
    "no-use-before-define": [2, "nofunc"],
    "space-before-function-paren": 0,
  },
};
