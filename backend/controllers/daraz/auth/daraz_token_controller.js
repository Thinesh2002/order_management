const axios = require("axios");
const crypto = require("crypto");

const accountModel = require("../../../models/daraz/account/daraz_account_model");

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

const refreshDarazToken = async (account) => {
    try {
        const apiPath = "/auth/token/refresh";
        const params = {
            app_key: account.app_key,
            timestamp: Date.now().toString(),
            sign_method: "sha256",
            refresh_token: account.refresh_token
        };

        params.sign = generateSignature(apiPath, params, account.app_secret);

        const response = await axios.post(
            `${account.api_base}${apiPath}`,
            null,
            { params, timeout: 20000 }
        );

        if (response.data && response.data.access_token) {
            const updatedData = {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || account.refresh_token,
                expires_in: response.data.expires_in,
                refresh_expires_in: response.data.refresh_expires_in
            };

            await accountModel.updateAccountTokens(account.account_code, updatedData);
            return updatedData.access_token;
        }
        return null;
    } catch (error) {
        console.log(`REFRESH ERROR FOR ${account.account_name}:`, error.message);
        return null;
    }
};

exports.createDarazTokenByCode = async (req, res) => {
    try {
        const { account_code, auth_code } = req.body;
        if (!account_code || !auth_code) {
            return res.status(400).json({ success: false, error: "Missing required parameters" });
        }

        const account = await accountModel.getAccountByCode(account_code);
        if (!account) {
            return res.status(404).json({ success: false, error: "Account not found" });
        }

        const apiPath = "/auth/token/create";
        const params = {
            app_key: account.app_key,
            timestamp: Date.now().toString(),
            sign_method: "sha256",
            code: auth_code
        };

        params.sign = generateSignature(apiPath, params, account.app_secret);

        const response = await axios.post(
            `${account.api_base}${apiPath}`,
            null,
            { params, timeout: 20000 }
        );

        if (response.data && response.data.access_token) {
            const tokenData = {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in,
                refresh_expires_in: response.data.refresh_expires_in
            };

            await accountModel.updateAccountTokens(account_code, tokenData);

            return res.json({
                success: true,
                message: "Tokens created successfully",
                data: response.data
            });
        } else {
            return res.status(400).json({
                success: false,
                error: response.data.message || "Failed to generate initial token"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
};

exports.checkDarazTokens = async (req, res) => {
    try {
        const accounts = await accountModel.getAllAccounts();
        const results = [];

        for (let account of accounts) {
            let currentAccessToken = account.access_token;
            let tokenWasRefreshed = false;
            let isTokenValid = false;
            let sellerName = null;
            let errorMessage = "Unknown error";

            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const apiPath = "/seller/get";
                    const params = {
                        app_key: account.app_key,
                        access_token: currentAccessToken,
                        timestamp: Date.now().toString(),
                        sign_method: "sha256"
                    };

                    params.sign = generateSignature(apiPath, params, account.app_secret);

                    const response = await axios.get(
                        `${account.api_base}${apiPath}`,
                        { params, timeout: 20000 }
                    );

                    const data = response.data;

                    if (data.code === "IllegalAccessToken") {
                        if (attempt === 1) {
                            const newTokens = await refreshDarazToken(account);
                            if (newTokens) {
                                currentAccessToken = newTokens;
                                tokenWasRefreshed = true;
                                continue;
                            }
                        }
                        errorMessage = "Access token expired and refresh failed";
                        break;
                    } else if (data.code === "0" || data.success === true || data.data) {
                        isTokenValid = true;
                        sellerName = data.data?.name || null;
                        break;
                    } else {
                        errorMessage = data.message || "Unknown API response error";
                        break;
                    }
                } catch (error) {
                    const errorData = error.response?.data;
                    if (errorData?.code === "IllegalAccessToken") {
                        if (attempt === 1) {
                            const newTokens = await refreshDarazToken(account);
                            if (newTokens) {
                                currentAccessToken = newTokens;
                                tokenWasRefreshed = true;
                                continue;
                            }
                        }
                        errorMessage = "Access token expired and refresh failed";
                        break;
                    } else {
                        errorMessage = error.message;
                        break;
                    }
                }
            }

            if (isTokenValid) {
                results.push({
                    account_name: account.account_name,
                    account_code: account.account_code,
                    status: "ACTIVE",
                    message: tokenWasRefreshed ? "Access token refreshed and active" : "Access token working",
                    seller: sellerName
                });
                console.log(`ACTIVE ${account.account_name}`);
            } else {
                results.push({
                    account_name: account.account_name,
                    account_code: account.account_code,
                    status: "EXPIRED",
                    message: errorMessage
                });
                console.log(`EXPIRED/ERROR ${account.account_name}`);
            }
        }

        res.json({
            success: true,
            total_accounts: results.length,
            results
        });

    } catch (error) {
        console.log("TOKEN CHECK ERROR", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};