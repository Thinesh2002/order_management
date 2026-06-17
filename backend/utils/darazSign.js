const crypto = require("crypto");

const generateDarazSign = (apiPath, params, appSecret) => {
    if (!apiPath || !params || !appSecret) {
        throw new Error("Missing apiPath, params, or appSecret for Daraz signature");
    }

    const sortedKeys = Object.keys(params)
        .filter(key => key !== "sign")
        .sort();

    let baseString = apiPath;

    sortedKeys.forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            baseString += key + String(params[key]);
        }
    });

    return crypto
        .createHmac("sha256", appSecret)
        .update(baseString, "utf8")
        .digest("hex")
        .toUpperCase();
};

module.exports = generateDarazSign;