const axios = require("axios");

const BASE_URL = "https://portal.transexpress.lk/api";

const loginTransExpress = async () => {
  try {
    const response = await axios.post(
      `${BASE_URL}/login/client`,
      {
        email: process.env.TRANS_EXPRESS_EMAIL,
        password: process.env.TRANS_EXPRESS_PASSWORD,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return response.data.token;
  } catch (error) {
    console.log("Login Failed");

    return null;
  }
};

const checkTransExpressAPI = async () => {
  try {
    // LOGIN
    const token = await loginTransExpress();

    if (!token) {
      return {
        success: false,
        message: "Login failed",
      };
    }

    // API CHECK
    await axios.get(`${BASE_URL}/provinces`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      success: true,
      message: "API is working",
      checked_at: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: "API is not working",
      error: error.response?.data || error.message,
      checked_at: new Date(),
    };
  }
};

const manualCheckAPI = async (req, res) => {
  const result = await checkTransExpressAPI();

  if (result.success) {
    return res.status(200).json(result);
  }

  return res.status(500).json(result);
};

module.exports = {
  checkTransExpressAPI,
  manualCheckAPI,
};