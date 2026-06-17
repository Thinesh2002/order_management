const axios = require("axios");
const generateDarazSign = require("../../../utils/darazSign");
const accountModel = require("../../../models/daraz/account/daraz_account_model");

/**
 * Daraz OAuth Callback
 * Example:
 * /api/daraz/auth/callback?code=AUTH_CODE&account_code=ACCOUNT_CODE
 */
const createAccessToken = async (req, res) => {
    try {
        const code = req.query.code;
        const account_code = req.query.account_code || req.query.state;

        if (!code || !account_code) {
            return res.status(400).json({
                success: false,
                message: "Authorization code or account code missing"
            });
        }

        const account = await accountModel.getAccountByCode(account_code);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found"
            });
        }

        const apiPath = "/auth/token/create";
        const timestamp = Date.now().toString();

        const appKey = account.app_key || process.env.DARAZ_APP_KEY;
        const appSecret = account.app_secret || process.env.DARAZ_APP_SECRET;
        const apiBase = account.api_base || process.env.DARAZ_API_BASE;

        if (!appKey || !appSecret || !apiBase) {
            return res.status(400).json({
                success: false,
                message: "Daraz app_key, app_secret, or api_base missing"
            });
        }

        const signParams = {
            app_key: appKey,
            code,
            sign_method: "sha256",
            timestamp
        };

        const sign = generateDarazSign(apiPath, signParams, appSecret);

        const response = await axios.post(
            `${apiBase}${apiPath}`,
            null,
            {
                params: {
                    ...signParams,
                    sign
                },
                timeout: 20000
            }
        );

        if (response.data && response.data.access_token) {
            const tokenData = {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in,
                refresh_expires_in: response.data.refresh_expires_in
            };

            await accountModel.updateAccountTokens(account_code, tokenData);

            if (accountModel.updateTokenCheckStatus) {
                await accountModel.updateTokenCheckStatus(account_code, {
                    token_status: "ACTIVE",
                    token_message: "Token created successfully",
                    seller_name: null
                });
            }

            return res.json({
                success: true,
                message: "Token created and saved successfully",
                data: response.data
            });
        }

        if (accountModel.updateTokenCheckStatus) {
            await accountModel.updateTokenCheckStatus(account_code, {
                token_status: "FAILED",
                token_message: "Token create failed",
                seller_name: null
            });
        }

        return res.status(400).json({
            success: false,
            message: "Token create failed",
            error: response.data
        });

    } catch (error) {
        console.log("DARAZ TOKEN CREATE ERROR:", error.response?.data || error.message);

        return res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });
    }
};

/**
 * Refresh access token by account code
 */
const refreshAccessToken = async (account_code) => {
    try {
        const account = await accountModel.getAccountByCode(account_code);

        if (!account || !account.refresh_token) {
            return null;
        }

        const apiPath = "/auth/token/refresh";
        const timestamp = Date.now().toString();

        const appKey = account.app_key || process.env.DARAZ_APP_KEY;
        const appSecret = account.app_secret || process.env.DARAZ_APP_SECRET;
        const apiBase = account.api_base || process.env.DARAZ_API_BASE;

        if (!appKey || !appSecret || !apiBase) {
            console.log(`CONFIG ERROR FOR ${account_code}: Missing app_key/app_secret/api_base`);
            return null;
        }

        const signParams = {
            app_key: appKey,
            refresh_token: account.refresh_token,
            sign_method: "sha256",
            timestamp
        };

        const sign = generateDarazSign(apiPath, signParams, appSecret);

        const response = await axios.post(
            `${apiBase}${apiPath}`,
            null,
            {
                params: {
                    ...signParams,
                    sign
                },
                timeout: 20000
            }
        );

        if (response.data && response.data.access_token) {
            const tokenData = {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token || account.refresh_token,
                expires_in: response.data.expires_in,
                refresh_expires_in: response.data.refresh_expires_in
            };

            await accountModel.updateAccountTokens(account_code, tokenData);

            return response.data.access_token;
        }

        console.log("REFRESH FAILED RESPONSE:", response.data);
        return null;

    } catch (error) {
        console.log("REFRESH ERROR:", error.response?.data || error.message);
        return null;
    }
};

const isTokenError = (data) => {
    return (
        data?.code === "IllegalAccessToken" ||
        data?.code === "InvalidAccessToken" ||
        data?.error_code === "IllegalAccessToken" ||
        data?.error_code === "InvalidAccessToken"
    );
};

const saveTokenStatus = async (account_code, statusData) => {
    if (typeof accountModel.updateTokenCheckStatus === "function") {
        await accountModel.updateTokenCheckStatus(account_code, statusData);
    }
};

/**
 * Reusable token checker
 * Manual API and cron both use this function.
 */
const checkAndUpdateDarazTokens = async () => {
    const accounts = await accountModel.getAllAccounts();
    const results = [];

    for (const account of accounts) {
        let currentAccessToken = account.access_token;
        let tokenWasRefreshed = false;
        let isTokenValid = false;
        let sellerName = null;
        let errorMessage = "Unknown error";

        const appKey = account.app_key || process.env.DARAZ_APP_KEY;
        const appSecret = account.app_secret || process.env.DARAZ_APP_SECRET;
        const apiBase = account.api_base || process.env.DARAZ_API_BASE;

        if (!appKey || !appSecret || !apiBase) {
            const statusData = {
                token_status: "CONFIG_ERROR",
                token_message: "Missing app_key, app_secret, or api_base",
                seller_name: null
            };

            await saveTokenStatus(account.account_code, statusData);

            results.push({
                account_name: account.account_name,
                account_code: account.account_code,
                status: statusData.token_status,
                message: statusData.token_message,
                seller: null
            });

            continue;
        }

        if (!currentAccessToken) {
            const newAccessToken = await refreshAccessToken(account.account_code);

            if (newAccessToken) {
                currentAccessToken = newAccessToken;
                tokenWasRefreshed = true;
            } else {
                const statusData = {
                    token_status: "AUTH_REQUIRED",
                    token_message: "No access token or refresh token expired. Please authorize this account again.",
                    seller_name: null
                };

                await saveTokenStatus(account.account_code, statusData);

                results.push({
                    account_name: account.account_name,
                    account_code: account.account_code,
                    status: statusData.token_status,
                    message: statusData.token_message,
                    seller: null
                });

                continue;
            }
        }

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const apiPath = "/seller/get";
                const timestamp = Date.now().toString();

                const signParams = {
                    app_key: appKey,
                    access_token: currentAccessToken,
                    sign_method: "sha256",
                    timestamp
                };

                const sign = generateDarazSign(apiPath, signParams, appSecret);

                const response = await axios.get(
                    `${apiBase}${apiPath}`,
                    {
                        params: {
                            ...signParams,
                            sign
                        },
                        timeout: 20000
                    }
                );

                const data = response.data;

                if (isTokenError(data)) {
                    if (attempt === 1) {
                        const newAccessToken = await refreshAccessToken(account.account_code);

                        if (newAccessToken) {
                            currentAccessToken = newAccessToken;
                            tokenWasRefreshed = true;
                            continue;
                        }
                    }

                    errorMessage = "Access token expired and refresh failed";
                    break;
                }

                if (data.code === "0" || data.success === true || data.data) {
                    isTokenValid = true;
                    sellerName =
                        data.data?.name ||
                        data.data?.seller_name ||
                        data.data?.shop_name ||
                        null;
                    break;
                }

                errorMessage =
                    data.message ||
                    data.error_msg ||
                    JSON.stringify(data);

                break;

            } catch (error) {
                const errorData = error.response?.data;

                if (isTokenError(errorData)) {
                    if (attempt === 1) {
                        const newAccessToken = await refreshAccessToken(account.account_code);

                        if (newAccessToken) {
                            currentAccessToken = newAccessToken;
                            tokenWasRefreshed = true;
                            continue;
                        }
                    }

                    errorMessage = "Access token expired and refresh failed";
                    break;
                }

                errorMessage =
                    errorData?.message ||
                    errorData?.error_msg ||
                    error.message;

                break;
            }
        }

        const finalStatus = isTokenValid ? "ACTIVE" : "EXPIRED";

        const finalMessage = isTokenValid
            ? tokenWasRefreshed
                ? "Access token refreshed and active"
                : "Access token working"
            : errorMessage;

        await saveTokenStatus(account.account_code, {
            token_status: finalStatus,
            token_message: finalMessage,
            seller_name: sellerName
        });

        results.push({
            account_name: account.account_name,
            account_code: account.account_code,
            status: finalStatus,
            message: finalMessage,
            seller: sellerName
        });
    }

    return {
        success: true,
        total_accounts: results.length,
        active_accounts: results.filter(item => item.status === "ACTIVE").length,
        expired_accounts: results.filter(item => item.status === "EXPIRED").length,
        auth_required_accounts: results.filter(item => item.status === "AUTH_REQUIRED").length,
        config_error_accounts: results.filter(item => item.status === "CONFIG_ERROR").length,
        results
    };
};

/**
 * Manual check API
 * GET /api/daraz/tokens/check
 */
const checkDarazTokens = async (req, res) => {
    try {
        const data = await checkAndUpdateDarazTokens();
        return res.json(data);
    } catch (error) {
        console.log("TOKEN CHECK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Only show saved token status from DB
 * GET /api/daraz/tokens/status
 */
const getDarazTokenStatuses = async (req, res) => {
    try {
        if (typeof accountModel.getTokenStatuses !== "function") {
            return res.status(500).json({
                success: false,
                error: "getTokenStatuses function missing in daraz_account_model.js"
            });
        }

        const statuses = await accountModel.getTokenStatuses();

        return res.json({
            success: true,
            total_accounts: statuses.length,
            results: statuses
        });

    } catch (error) {
        console.log("TOKEN STATUS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    createAccessToken,
    refreshAccessToken,
    checkAndUpdateDarazTokens,
    checkDarazTokens,
    getDarazTokenStatuses
};