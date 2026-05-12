const axios = require("axios");
const crypto = require("crypto");

const accountModel = require("../../../models/daraz/account/daraz_account_model");

const generateSignature = (
    apiPath,
    params,
    appSecret
) => {

    const sortedKeys =
        Object.keys(params).sort();

    let signString = apiPath;

    for (let key of sortedKeys) {
        signString += key + params[key];
    }

    return crypto
        .createHmac(
            "sha256",
            appSecret
        )
        .update(signString)
        .digest("hex")
        .toUpperCase();
};

exports.checkDarazTokens = async (
    req,
    res
) => {

    try {

        const accounts =
            await accountModel.getAllAccounts();

        const results = [];

        for (let account of accounts) {

            try {

                const apiPath =
                    "/seller/get";

                const params = {
                    app_key:
                        account.app_key,

                    access_token:
                        account.access_token,

                    timestamp:
                        Date.now().toString(),

                    sign_method:
                        "sha256"
                };

                params.sign =
                    generateSignature(
                        apiPath,
                        params,
                        account.app_secret
                    );

                const response =
                    await axios.get(
                        `${account.api_base}${apiPath}`,
                        {
                            params,
                            timeout: 20000
                        }
                    );

                const data =
                    response.data;

                if (
                    data.code ===
                    "IllegalAccessToken"
                ) {

                    results.push({
                        account_name:
                            account.account_name,

                        account_code:
                            account.account_code,

                        status:
                            "EXPIRED",

                        message:
                            "Access token expired"
                    });

                    console.log(
                        `EXPIRED ${account.account_name}`
                    );

                } else if (
                    data.code === "0" ||
                    data.success === true ||
                    data.data
                ) {

                    results.push({
                        account_name:
                            account.account_name,

                        account_code:
                            account.account_code,

                        status:
                            "ACTIVE",

                        message:
                            "Access token working",

                        seller:
                            data.data?.name ||
                            null
                    });

                    console.log(
                        `ACTIVE ${account.account_name}`
                    );

                } else {

                    results.push({
                        account_name:
                            account.account_name,

                        account_code:
                            account.account_code,

                        status:
                            "ERROR",

                        message:
                            data.message ||
                            "Unknown error"
                    });

                    console.log(
                        `ERROR ${account.account_name}`
                    );
                }

            } catch (error) {

                const errorData =
                    error.response?.data;

                if (
                    errorData?.code ===
                    "IllegalAccessToken"
                ) {

                    results.push({
                        account_name:
                            account.account_name,

                        account_code:
                            account.account_code,

                        status:
                            "EXPIRED",

                        message:
                            "Access token expired"
                    });

                    console.log(
                        `EXPIRED ${account.account_name}`
                    );

                } else {

                    results.push({
                        account_name:
                            account.account_name,

                        account_code:
                            account.account_code,

                        status:
                            "ERROR",

                        message:
                            error.message
                    });

                    console.log(
                        `ERROR ${account.account_name}`
                    );
                }
            }
        }

        res.json({
            success: true,

            total_accounts:
                results.length,

            results
        });

    } catch (error) {

        console.log(
            "TOKEN CHECK ERROR",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};