const axios = require("axios");
const generateDarazSign = require("../../../utils/darazSign");

const createAccessToken = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        message: "Authorization code missing"
      });
    }

    const apiPath = "/auth/token/create";
    const timestamp = Date.now().toString();

    // 🔥 IMPORTANT: sign_method INCLUDED in sign
    const signParams = {
      app_key: process.env.DARAZ_APP_KEY,
      code: code,
      sign_method: "sha256",
      timestamp: timestamp
    };

    const sign = generateDarazSign(
      apiPath,
      signParams,
      process.env.DARAZ_APP_SECRET
    );

    const response = await axios.post(
      "https://api.daraz.lk/rest/auth/token/create",
      null,
      {
        params: {
          ...signParams,
          sign: sign
        }
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error("DARAZ ERROR:", error.response?.data);
    return res.status(500).json(
      error.response?.data || { message: error.message }
    );
  }
};

module.exports = { createAccessToken };
