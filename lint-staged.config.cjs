module.exports = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{cjs,mjs,json,css,md}": ["prettier --write"],
  "*.{yml,yaml}": ["prettier --write"],
};
