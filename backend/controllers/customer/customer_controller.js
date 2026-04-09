const Customer = require("../../models/customer/customer_model");

/* CREATE */
exports.createCustomer = async (req, res) => {

  try {

    const result = await Customer.create(req.body);

    res.json({
      success: true,
      data: result.customer,
      isNew: result.isNew
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

/* GET ALL */
exports.getCustomers = async (req, res) => {

  try {

    const data = await Customer.getAll();

    res.json({
      success: true,
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

/* GET BY PHONE */
exports.getCustomerByPhone = async (req, res) => {

  try {

    const phone = req.params.phone;

    const data = await Customer.getByPhone(phone);

    res.json({
      success: true,
      data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};

/* 🔥 SEARCH (AUTOCOMPLETE) */
exports.searchCustomers = async (req, res) => {

  try {

    const keyword = req.params.phone;

    const data = await Customer.searchByPhone(keyword);

    res.json({
      success: true,
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};