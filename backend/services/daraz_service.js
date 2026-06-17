const axios = require("axios");
const crypto = require("crypto");

const generateSignature = (apiPath, params, appSecret) => {
    const sortedKeys = Object.keys(params).sort();
    let signString = apiPath;
    for (let key of sortedKeys) {
        signString += key + params[key];
    }
    return crypto
        .createHmac("sha256", appSecret)
        .update(signString)
        .digest("hex")
        .toUpperCase();
};

exports.fetchOrders = async (account) => {
  try {
    const apiPath = "/orders/get";
    const timestamp = Date.now().toString();
    
    const params = {
      access_token: account.access_token,
      app_key: account.app_key,
      sign_method: "sha256",
      timestamp: timestamp,
      created_after: "2026-06-10T00:00:00+0530" // Sariyana time filter-ai add seiyungal
    };

    params.sign = generateSignature(apiPath, params, account.app_secret);

    const response = await axios.get(
      `${account.api_base}${apiPath}`,
      {
        params: params
      }
    );

    return response.data;
  } catch (error) {
    console.error("Daraz Fetch Error:", error.response?.data || error.message);
    return null;
  }
};