const axios = require("axios");

const generateDarazSign = require("../../../utils/darazSign");

const createAccessToken = async (
    req,
    res
) => {

    try {

        const { code } = req.query;

        if (!code) {

            return res.status(400).json({
                success: false,
                message:
                    "Authorization code missing"
            });
        }

        const apiPath =
            "/auth/token/create";

        const timestamp =
            Date.now().toString();

        const signParams = {
            app_key:
                process.env.DARAZ_APP_KEY,

            code,

            sign_method:
                "sha256",

            timestamp
        };

        const sign =
            generateDarazSign(
                apiPath,
                signParams,
                process.env
                    .DARAZ_APP_SECRET
            );

        const response =
            await axios.post(
                `https://api.daraz.lk/rest${apiPath}`,
                null,
                {
                    params: {
                        ...signParams,
                        sign
                    }
                }
            );

        return res.json({
            success: true,
            data: response.data
        });

    } catch (error) {

        console.log(
            "DARAZ ERROR:",
            error.response?.data ||
            error.message
        );

        return res.status(500).json({
            success: false,
            error:
                error.response?.data ||
                error.message
        });
    }
};

module.exports = {
    createAccessToken
};