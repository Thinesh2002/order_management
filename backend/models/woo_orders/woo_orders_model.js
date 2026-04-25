const axios = require("axios");

const WC_API_URL = process.env.WC_API_URL;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

const getOrders = async (params = {}) => {
  try {
    const response = await axios.get(`${WC_API_URL}/orders`, {
      params: {
        consumer_key: WC_CONSUMER_KEY,
        consumer_secret: WC_CONSUMER_SECRET,
        per_page: params.per_page || 20,
        page: params.page || 1,
        status: params.status || undefined,
      },
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

module.exports = {
  getOrders,
};