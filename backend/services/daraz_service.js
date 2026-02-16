const axios = require("axios");

exports.fetchOrders = async (account) => {
  try {
    const response = await axios.get(
      `${account.api_base}/orders/get`,
      {
        params: {
          access_token: account.access_token,
          app_key: account.app_key,
          timestamp: Date.now(),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Daraz Fetch Error:", error.message);
    return null;
  }
};
