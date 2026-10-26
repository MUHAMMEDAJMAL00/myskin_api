"use strict";

const { Op }           = require("sequelize");
const { PayrollRun, PayrollRunLine, PayrollAdvance, Employee, SalaryPayment, sequelize } = require("../../database/index");
const ledger   = require("../accountLedger/accountLedger.service");
const fLedger  = require("../shared/financialLedger.service");
const AppError = require("../../utils/AppError");

// ─── helpers ─────────────────────────────────────────────────────────────────

function currentMonth() { return new Date().toISOString().slice(0, 7); }

// Returns outstanding advance total for an employee
async function getOutstandingAdvance(employee_id, store_id) {
  const rows = await PayrollAdvance.findAll({
    where: { employee_id, store_id, status: "Outstanding" },
    attributes: ["amount"],
  });
  return rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
}

// ─── Payroll dashboard summary ────────────────────────────────────────────────

const getSummary = async (store_id, salary_month) => {
  const month = salary_month || currentMonth();
  const employees = await Employee.findAll({
    where: { store_id, is_active: 1 },
    order: [["name", "ASC"]],
  });

  // PayrollRun records for this month (full payroll flow)
  const runMap = {};
  const runs = await PayrollRun.findAll({
    where: { store_id, salary_month: month },
    include: [{ model: PayrollRunLine, as: "lines" }],
  });
  runs.forEach((r) => { runMap[r.employee_id] = r; });

  // SalaryPayment records for this month (simple salary flow)
  const spRows = await SalaryPayment.findAll({
    where: { store_id, salary_month: month },
    attributes: ["employee_id", "amount"],
  });
  const spMap = {};
  spRows.forEach((sp) => {
    spMap[sp.employee_id] = (spMap[sp.employee_id] || 0) + parseFloat(sp.amount || 0);
  });

  const rows = await Promise.all(employees.map(async (emp) => {
    const run            = runMap[emp.id] || null;
    const adv            = await getOutstandingAdvance(emp.id, store_id);
    const paidViaSalary  = spMap[emp.id] || 0;
    const monthly        = parseFloat(emp.monthly_salary || 0);

    let status;
    const runStatus = run ? run.status : null;
    if (runStatus === "Paid") {
      status = "Paid";
    } else if (paidViaSalary > 0 && (monthly <= 0 || paidViaSalary >= monthly)) {
      status = "Paid";
    } else if (runStatus === "Cancelled") {
      status = "Cancelled";
    } else {
      status = "Pending";
    }

    return {
      ...emp.toJSON(),
      salary_month:        month,
      outstanding_advance: adv,
      payroll_run:         run ? run.toJSON() : null,
      paid_via_salary:     paidViaSalary,
      status,
    };
  }));

  const totalGross = rows.reduce((s, r) => s + parseFloat((r.payroll_run && r.payroll_run.gross_salary) || r.monthly_salary || 0), 0);
  const totalPaid  = rows.filter(r => r.status === "Paid").reduce((s, r) => {
    if (r.payroll_run) return s + parseFloat(r.payroll_run.net_payable || 0);
    return s + parseFloat(r.paid_via_salary || 0);
  }, 0);
  const totalPend  = rows.filter(r => r.status === "Pending").reduce((s, r) => s + parseFloat(r.monthly_salary || 0), 0);
  const totalAdv   = rows.reduce((s, r) => s + r.outstanding_advance, 0);

  return {
    month,
    stats: { total_payroll: totalGross, total_paid: totalPaid, total_pending: totalPend, total_advance: totalAdv },
    employees: rows,
  };
};

// ─── Single salary run ────────────────────────────────────────────────────────

const createRun = async (data, user_id, store_id) => {
  const { employee_id, salary_month, gross_salary, allowances = [], deductions = [], advance_deducted = 0, payment_method, payment_date, notes } = data;

  const emp = await Employee.findOne({ where: { id: employee_id, store_id } });
  if (!emp) throw new AppError("Employee not found", 404);

  const existing = await PayrollRun.findOne({ where: { employee_id, salary_month, store_id } });
  if (existing && existing.status === "Paid") throw new AppError(`Salary already processed for ${emp.name} in ${salary_month}`, 400);
  if (existing) await existing.destroy(); // soft-delete cancelled/pending run so new Paid run can be created

  const totalAllow = allowances.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const totalDeduct = deductions.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const advDeduct   = parseFloat(advance_deducted || 0);
  const netPayable  = parseFloat(gross_salary || 0) + totalAllow - totalDeduct - advDeduct;

  return sequelize.transaction(async (t) => {
    const run = await PayrollRun.create({
      store_id, employee_id, salary_month,
      gross_salary:     parseFloat(gross_salary || 0),
      total_allowances: totalAllow,
      total_deductions: totalDeduct,
      advance_deducted: advDeduct,
      net_payable:      netPayable,
      payment_method:   payment_method || "Cash",
      payment_date:     payment_date || new Date().toISOString().slice(0, 10),
      status:           "Paid",
      notes:            notes || null,
      created_by:       user_id,
    }, { transaction: t });

    const lines = [
      ...allowances.map(a => ({ payroll_run_id: run.id, line_type: "allowance", label: a.label, amount: parseFloat(a.amount || 0) })),
      ...deductions.map(d => ({ payroll_run_id: run.id, line_type: "deduction", label: d.label, amount: parseFloat(d.amount || 0) })),
    ];
    if (lines.length) await PayrollRunLine.bulkCreate(lines, { transaction: t });

    // Mark outstanding advances as Recovered if advance was deducted
    if (advDeduct > 0) {
      await PayrollAdvance.update(
        { status: "Recovered" },
        { where: { employee_id, store_id, status: "Outstanding" }, transaction: t }
      );
    }

    // Post journal entry: Debit Salary Expense, Credit Cash/Bank
    await fLedger.postNamedJE({
      store_id,
      reference_type: "PayrollRun",
      reference_id:   run.id,
      date:           run.payment_date,
      description:    `Salary — ${emp.name} (${salary_month})`,
      namedLines: [
        { mappingKey: "salary_expense",                              debit: netPayable, credit: 0 },
        { mappingKey: fLedger.paymentMethodToMappingKey(payment_method || "Cash"), debit: 0, credit: netPayable },
      ],
      user_id,
    }, t);

    // Operational sub-ledger entries (mirrors the JE for party-based reporting)
    const moneyParty = (payment_method || "Cash").toLowerCase() === "cash" ? "cash" : "bank";
    await ledger.writeEntries([
      {
        store_id, party_type: "salary", party_id: employee_id,
        transaction_type: "salary_payment", reference_type: "payroll_run",
        reference_id: run.id, debit: netPayable, credit: 0,
        description: `Salary — ${emp.name} (${salary_month})`,
        transaction_date: run.payment_date, created_by: user_id,
      },
      {
        store_id, party_type: moneyParty,
        transaction_type: "salary_payment", reference_type: "payroll_run",
        reference_id: run.id, debit: 0, credit: netPayable,
        description: `Salary paid to ${emp.name}`,
        transaction_date: run.payment_date, created_by: user_id,
      },
    ], t);

    return run;
  });
};

// ─── Bulk salary run ─────────────────────────────────────────────────────────

const createBulkRun = async (items, user_id, store_id) => {
  return sequelize.transaction(async (t) => {
    const results = [];
    for (const item of items) {
      const emp = await Employee.findOne({ where: { id: item.employee_id, store_id } });
      if (!emp) throw new AppError(`Employee #${item.employee_id} not found`, 404);

      const existing = await PayrollRun.findOne({ where: { employee_id: item.employee_id, salary_month: item.salary_month, store_id }, transaction: t });
      if (existing) throw new AppError(`Salary already processed for ${emp.name} in ${item.salary_month}`, 400);

      const gross       = parseFloat(item.gross_salary || emp.monthly_salary || 0);
      const advDeduct   = parseFloat(item.advance_deducted || 0);
      const netPayable  = gross - advDeduct;

      const run = await PayrollRun.create({
        store_id,
        employee_id:      item.employee_id,
        salary_month:     item.salary_month,
        gross_salary:     gross,
        total_allowances: 0,
        total_deductions: 0,
        advance_deducted: advDeduct,
        net_payable:      netPayable,
        payment_method:   item.payment_method || "Cash",
        payment_date:     item.payment_date || new Date().toISOString().slice(0, 10),
        status:           "Paid",
        notes:            item.notes || null,
        created_by:       user_id,
      }, { transaction: t });

      if (advDeduct > 0) {
        await PayrollAdvance.update(
          { status: "Recovered" },
          { where: { employee_id: item.employee_id, store_id, status: "Outstanding" }, transaction: t }
        );
      }

      await fLedger.postNamedJE({
        store_id,
        reference_type: "PayrollRun",
        reference_id:   run.id,
        date:           run.payment_date,
        description:    `Salary — ${emp.name} (${item.salary_month})`,
        namedLines: [
          { mappingKey: "salary_expense",                                    debit: netPayable, credit: 0 },
          { mappingKey: fLedger.paymentMethodToMappingKey(item.payment_method || "Cash"), debit: 0, credit: netPayable },
        ],
        user_id,
      }, t);

      const bulkMoneyParty = (item.payment_method || "Cash").toLowerCase() === "cash" ? "cash" : "bank";
      await ledger.writeEntries([
        {
          store_id, party_type: "salary", party_id: item.employee_id,
          transaction_type: "salary_payment", reference_type: "payroll_run",
          reference_id: run.id, debit: netPayable, credit: 0,
          description: `Salary — ${emp.name} (${item.salary_month})`,
          transaction_date: run.payment_date, created_by: user_id,
        },
        {
          store_id, party_type: bulkMoneyParty,
          transaction_type: "salary_payment", reference_type: "payroll_run",
          reference_id: run.id, debit: 0, credit: netPayable,
          description: `Salary paid to ${emp.name}`,
          transaction_date: run.payment_date, created_by: user_id,
        },
      ], t);

      results.push(run);
    }
    return results;
  });
};

// ─── List runs ────────────────────────────────────────────────────────────────

const getRuns = async (store_id, { page = 1, limit = 20, salary_month, employee_id, search } = {}) => {
  const where = { store_id };
  if (salary_month) where.salary_month = salary_month;
  if (employee_id)  where.employee_id  = parseInt(employee_id, 10);

  const empWhere = {};
  if (search) empWhere.name = { [Op.like]: `%${search}%` };

  const { count, rows } = await PayrollRun.findAndCountAll({
    where,
    include: [
      { model: Employee,       as: "employee",  where: Object.keys(empWhere).length ? empWhere : undefined, required: !!search, attributes: ["id", "name", "role"] },
      { model: PayrollRunLine, as: "lines" },
    ],
    order:  [["payment_date", "DESC"]],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
};

const getRunById = async (id, store_id) => {
  const run = await PayrollRun.findOne({
    where: { id, store_id },
    include: [
      { model: Employee,       as: "employee", attributes: ["id", "name", "role", "phone"] },
      { model: PayrollRunLine, as: "lines" },
    ],
  });
  if (!run) throw new AppError("Payroll run not found", 404);
  return run;
};

// ─── Advances ─────────────────────────────────────────────────────────────────

const getAdvances = async (store_id, { page = 1, limit = 20, status, employee_id, search } = {}) => {
  const where = { store_id };
  if (status)      where.status      = status;
  if (employee_id) where.employee_id = parseInt(employee_id, 10);

  const empWhere = {};
  if (search) empWhere.name = { [Op.like]: `%${search}%` };

  const { count, rows } = await PayrollAdvance.findAndCountAll({
    where,
    include: [{ model: Employee, as: "employee", where: Object.keys(empWhere).length ? empWhere : undefined, required: !!search, attributes: ["id", "name", "role"] }],
    order:  [["date", "DESC"]],
    limit:  parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    distinct: true,
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
};

const createAdvance = async (data, user_id, store_id) => {
  const { employee_id, amount, date, payment_method, notes } = data;
  const emp = await Employee.findOne({ where: { id: employee_id, store_id } });
  if (!emp) throw new AppError("Employee not found", 404);

  return sequelize.transaction(async (t) => {
    const advance = await PayrollAdvance.create({
      store_id, employee_id,
      amount:         parseFloat(amount),
      date:           date || new Date().toISOString().slice(0, 10),
      payment_method: payment_method || "Cash",
      notes:          notes || null,
      status:         "Outstanding",
      created_by:     user_id,
    }, { transaction: t });

    // Debit Staff Advances, Credit Cash/Bank
    await fLedger.postNamedJE({
      store_id,
      reference_type: "PayrollAdvance",
      reference_id:   advance.id,
      date:           advance.date,
      description:    `Advance to ${emp.name}`,
      namedLines: [
        { mappingKey: "staff_advances",                              debit: parseFloat(amount), credit: 0 },
        { mappingKey: fLedger.paymentMethodToMappingKey(payment_method || "Cash"), debit: 0, credit: parseFloat(amount) },
      ],
      user_id,
    }, t);

    // Operational sub-ledger entries for advance
    const advMoneyParty = (payment_method || "Cash").toLowerCase() === "cash" ? "cash" : "bank";
    await ledger.writeEntries([
      {
        store_id, party_type: "salary", party_id: employee_id,
        transaction_type: "advance_payment", reference_type: "payroll_advance",
        reference_id: advance.id, debit: parseFloat(amount), credit: 0,
        description: `Advance to ${emp.name}`,
        transaction_date: advance.date, created_by: user_id,
      },
      {
        store_id, party_type: advMoneyParty,
        transaction_type: "advance_payment", reference_type: "payroll_advance",
        reference_id: advance.id, debit: 0, credit: parseFloat(amount),
        description: `Advance paid to ${emp.name}`,
        transaction_date: advance.date, created_by: user_id,
      },
    ], t);

    return advance;
  });
};

const cancelRun = async (id, store_id, user_id) => {
  const run = await PayrollRun.findOne({
    where: { id, store_id },
    include: [{ model: Employee, as: "employee", attributes: ["id", "name"] }],
  });
  if (!run) throw new AppError("Payroll run not found", 404);
  if (run.status === "Cancelled") throw new AppError("Payroll run is already cancelled", 409);

  await sequelize.transaction(async (t) => {
    const oldStatus = run.status;
    if (oldStatus === "Cancelled") return;

    await run.update({ status: "Cancelled" }, { transaction: t });

    // Restore advance to Outstanding if it was deducted
    if (parseFloat(run.advance_deducted) > 0) {
      await PayrollAdvance.update(
        { status: "Outstanding" },
        { where: { employee_id: run.employee_id, store_id, status: "Recovered" }, transaction: t },
      );
    }

    const netPayable = parseFloat(run.net_payable);
    const empName = run.employee ? run.employee.name : `#${run.employee_id}`;

    // Reverse JE: Dr Cash/Bank, Cr Salary Expense
    await fLedger.postNamedJE({
      store_id,
      reference_type: "PayrollRunCancellation",
      reference_id: run.id,
      date: new Date(),
      description: `Payroll cancellation — ${empName} (${run.salary_month})`,
      namedLines: [
        { mappingKey: fLedger.paymentMethodToMappingKey(run.payment_method || "Cash"), debit: netPayable, credit: 0 },
        { mappingKey: "salary_expense", debit: 0, credit: netPayable },
      ],
      user_id,
    }, t);

    const moneyParty = (run.payment_method || "Cash").toLowerCase() === "cash" ? "cash" : "bank";
    await ledger.writeEntries([
      {
        store_id, party_type: "salary", party_id: run.employee_id,
        transaction_type: "salary_reversal", reference_type: "payroll_run",
        reference_id: run.id, debit: 0, credit: netPayable,
        description: `Payroll cancelled — ${empName}`,
        transaction_date: new Date(), created_by: user_id,
      },
      {
        store_id, party_type: moneyParty,
        transaction_type: "salary_reversal", reference_type: "payroll_run",
        reference_id: run.id, debit: netPayable, credit: 0,
        description: `Payroll reversal — ${empName}`,
        transaction_date: new Date(), created_by: user_id,
      },
    ], t);
  });

  return getRunById(id, store_id);
};

module.exports = { getSummary, createRun, createBulkRun, cancelRun, getRuns, getRunById, getAdvances, createAdvance, getOutstandingAdvance };
