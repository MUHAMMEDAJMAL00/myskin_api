const service = require("./customerPayments.service");

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await service.getAll({ store_id: req.storeId, page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getDueCustomers = async (req, res, next) => {
  try {
    const data = await service.getDueCustomers(req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getByCustomer = async (req, res, next) => {
  try {
    const data = await service.getByCustomer(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getDueSales = async (req, res, next) => {
  try {
    const data = await service.getDueSales(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user.id, req.storeId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLedger = async (req, res, next) => {
  try {
    const data = await service.getLedger(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await service.getOne(req.params.id, req.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
