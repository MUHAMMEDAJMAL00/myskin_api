"use strict";

const { Op } = require("sequelize");
const { Employee, SalaryPayment, Store, PayrollRun, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");
const ledger  = require("../accountLedger/accountLedger.service");
const fLedger = require("../shared/financialLedger.service");

const getAll = async ({ store_id, search, is_active } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id: parseInt(store_id, 10) };
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active, 10);
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { role: { [Op.like]: `%${search}%` } },
    ];
  }
  return Employee.findAll({ where, order: [["name", "ASC"]] });
};

const getById = async (id, storeId = null) => {
  const where = { id };
  if (storeId != null) where.store_id = parseInt(storeId, 10);
  const employee = await Employee.findOne({
    where,
    include: [{ model: SalaryPayment, as: "salary_payments", required: false }],
  });
  if (!employee) throw new AppError("Employee not found", 404);
  return employee;
};

const create = async (data) => {
  const store = await Store.findByPk(data.store_id, { attributes: ["id"] });
  if (!store) throw new AppError("Store not found", 404);
  return Employee.create(data);
};

const update = async (id, data, storeId = null) => {
  const employee = await getById(id, storeId);
  await employee.update(data);
  return getById(id, storeId);
};

function _toPayrollMethod(method) {
  const m = (method || "cash").toLowerCase();
  if (m === "upi")                                  return "UPI";
  if (m === "bank" || m === "neft" || m === "rtgs") return "Bank";
  if (m === "cheque" || m === "check")              return "Cheque";
  return "Cash";
}

const paySalary = async (employee_id, data, user_id, storeId) => {
  const employee = await getById(employee_id, storeId);
  const amount = parseFloat(data.amount);

  return sequelize.transaction(async (t) => {
    const payment = await SalaryPayment.create(
      {
        store_id: storeId,
        employee_id,
        user_id,
        salary_month: data.salary_month,
        amount,
        payment_method: data.payment_method || "cash",
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        payment_date: data.payment_date || new Date(),
      },
      { transaction: t },
    );

    await ledger.writeEntries(
      [
        {
          store_id: storeId,
          party_type: "salary",
          party_id: employee.id,
          transaction_type: "salary_payment",
          reference_type: "salary",
          reference_id: payment.id,
          debit: amount,
          credit: 0,
          description: `Salary paid to ${employee.name} for ${data.salary_month}`,
          transaction_date: payment.payment_date,
          created_by: user_id,
        },
        {
          store_id: storeId,
          party_type: data.payment_method === "bank" || data.payment_method === "upi" || data.payment_method === "card" ? "bank" : "cash",
          transaction_type: "salary_payment",
          reference_type: "salary",
          reference_id: payment.id,
          debit: 0,
          credit: amount,
          description: `Salary paid to ${employee.name}`,
          transaction_date: payment.payment_date,
          created_by: user_id,
        },
      ],
      t,
    );

    await fLedger.postNamedJE({
      store_id: storeId, reference_type: "salary", reference_id: payment.id,
      date: payment.payment_date,
      description: `Salary — ${employee.name} (${data.salary_month})`,
      namedLines: [
        { mappingKey: "salary_expense",                         debit: amount, credit: 0 },
        { mappingKey: fLedger.paymentMethodToMappingKey(data.payment_method), debit: 0, credit: amount },
      ],
      user_id,
    }, t);

    // Keep payroll history in sync — create or update PayrollRun so the
    // Payroll > History tab reflects payments made through the Salary module.
    const payDate = data.payment_date
      ? new Date(data.payment_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const existingRun = await PayrollRun.findOne({
      where: { employee_id, salary_month: data.salary_month, store_id: storeId },
      transaction: t,
    });
    if (existingRun) {
      const cumulative = parseFloat(existingRun.net_payable || 0) + amount;
      await existingRun.update({ net_payable: cumulative, payment_date: payDate, status: "Paid" }, { transaction: t });
    } else {
      await PayrollRun.create({
        store_id:         storeId,
        employee_id,
        salary_month:     data.salary_month,
        gross_salary:     parseFloat(employee.monthly_salary || amount),
        total_allowances: 0,
        total_deductions: 0,
        advance_deducted: 0,
        net_payable:      amount,
        payment_method:   _toPayrollMethod(data.payment_method),
        payment_date:     payDate,
        status:           "Paid",
        notes:            data.notes || null,
        created_by:       user_id,
      }, { transaction: t });
    }

    return payment;
  });
};

const getSalarySummary = async (employee_id, salary_month, storeId = null) => {
  const employee = await getById(employee_id, storeId);
  const paid = await SalaryPayment.sum("amount", { where: { employee_id, salary_month, store_id: employee.store_id } });
  const monthly = parseFloat(employee.monthly_salary || 0);
  const paidAmount = parseFloat(paid || 0);
  return {
    employee_id: employee.id,
    salary_month,
    monthly_salary: monthly,
    paid_amount: paidAmount,
    pending_salary: Math.max(0, monthly - paidAmount),
  };
};

// ─── All employees with paid/pending for a given month ────────────────────────
const getSalaryStatusAll = async ({ store_id, salary_month } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const month = salary_month || new Date().toISOString().slice(0, 7);
  const where = { store_id: parseInt(store_id, 10) };

  const employees = await Employee.findAll({ where, order: [["name", "ASC"]] });

  return Promise.all(
    employees.map(async (emp) => {
      const paid = (await SalaryPayment.sum("amount", {
        where: { employee_id: emp.id, salary_month: month },
      })) || 0;
      const monthly   = parseFloat(emp.monthly_salary || 0);
      const paidAmt   = parseFloat(paid);
      return {
        ...emp.toJSON(),
        salary_month:   month,
        paid_amount:    paidAmt,
        pending_salary: Math.max(0, monthly - paidAmt),
      };
    }),
  );
};

// ─── Paginated payment history (all employees or one) ─────────────────────────
const getPaymentHistory = async ({ store_id, employee_id, salary_month, page = 1, limit = 50 } = {}) => {
  if (!store_id) throw new AppError("store_id is required", 400);
  const where = { store_id: parseInt(store_id, 10) };
  if (employee_id) where.employee_id = parseInt(employee_id, 10);
  if (salary_month) where.salary_month = salary_month;

  const { count, rows } = await SalaryPayment.findAndCountAll({
    where,
    include: [{ model: Employee, attributes: ["id", "name", "role"] }],
    order:  [["payment_date", "DESC"]],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return {
    total:       count,
    page:        parseInt(page),
    limit:       parseInt(limit),
    total_pages: Math.ceil(count / parseInt(limit)),
    data:        rows,
  };
};

module.exports = { getAll, getById, create, update, paySalary, getSalarySummary, getSalaryStatusAll, getPaymentHistory };
