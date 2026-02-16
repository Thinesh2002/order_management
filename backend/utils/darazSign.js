const crypto = require("crypto");

const generateDarazSign = (apiPath, params, appSecret) => {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== "sign")
    .sort();

  let baseString = apiPath;

  sortedKeys.forEach(key => {
    baseString += key + params[key];
  });

  console.log("SIGN STRING:", baseString);

  return crypto
    .createHmac("sha256", appSecret)
    .update(baseString)
    .digest("hex")
    .toUpperCase();
};

module.exports = generateDarazSign;
