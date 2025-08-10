module.exports = {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix --no-warn-ignored --max-warnings=0",
    "prettier --write",
  ],
  "*.{cjs,mjs,json,css,md}": ["prettier --write"],
  "*.{yml,yaml}": ["prettier --write"],
};
