// Current-source browser port: Finance.swift / Taxes.swift, inspected 2026-09-17.
// All inputs are fictional session records. No bank, price or tax service requests.
const num = (v) => Number(v) || 0;
export const sum = (rows, fn = (r) => num(r.amount)) =>
  rows.reduce((s, r) => s + fn(r), 0);
export const dateAdd = (date, n) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export function monthAdd(date, n) {
  const d = new Date(date + "T12:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  d.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return d.toISOString().slice(0, 10);
}
export function occurrences(b, from, to) {
  if (!b.dueDate || !Number.isFinite(Date.parse(b.dueDate)) || from > to)
    return [];
  const result = [];
  for (let n = 0; n < 20000; n++) {
    const d =
      b.frequency === "weekly"
        ? dateAdd(b.dueDate, 7 * n)
        : b.frequency === "biweekly"
          ? dateAdd(b.dueDate, 14 * n)
          : b.frequency === "custom"
            ? dateAdd(b.dueDate, Math.max(1, num(b.customDays)) * n)
            : b.frequency === "yearly"
              ? monthAdd(b.dueDate, 12 * n)
              : b.frequency === "one-time"
                ? b.dueDate
                : monthAdd(b.dueDate, n);
    if (d > to) break;
    if (d >= from)
      result.push({
        date: d,
        amount: num(b.amount),
        bill: b,
        paid: !!b.paidThrough && d <= b.paidThrough,
      });
    if (b.frequency === "one-time") break;
  }
  return result;
}
export const incomeDate = (e) => e.payDate || e.date;
export const grossIncome = (e) =>
  e.type === "hourly" ? num(e.hourlyWage) * num(e.hours) : num(e.amount);
export function taxEstimate(e, settings = {}) {
  const gross = grossIncome(e);
  if (e.taxMode === "manual")
    return Math.min(
      gross,
      num(e.manualTaxAmount) > 0
        ? num(e.manualTaxAmount)
        : (gross * Math.max(0, Math.min(100, num(e.deductionPercent)))) / 100,
    );
  if (e.taxMode !== "auto" || !settings.autoOhio) return 0;
  const periods =
    { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, annual: 1 }[
      settings.paycheckFrequency
    ] || 26;
  const annual = num(e.annualGrossIncome) || gross * periods,
    taxable = Math.max(0, annual - 16100),
    brackets = [
      [0, 12400, 0.1],
      [12400, 50400, 0.12],
      [50400, 105700, 0.22],
      [105700, 201775, 0.24],
      [201775, 256225, 0.32],
      [256225, 640600, 0.35],
      [640600, Infinity, 0.37],
    ];
  const federal = brackets.reduce(
      (s, [lo, hi, rate]) => s + Math.max(0, Math.min(taxable, hi) - lo) * rate,
      0,
    ),
    fica =
      e.w2Income === false
        ? 0
        : Math.min(annual, 184500) * 0.062 + annual * 0.0145,
    ohio = Math.max(0, annual - 26050) * 0.0275;
  return (
    (federal +
      fica +
      ohio +
      (annual *
        (num(settings.municipalTaxRate) +
          num(settings.schoolDistrictTaxRate))) /
        100) /
    periods
  );
}
export const netIncome = (e, s) =>
  Math.max(0, grossIncome(e) - taxEstimate(e, s));
export const usesCredit = (e) =>
  e.paymentMethod === "Credit card" || (!e.paymentMethod && !!e.debtId);
export const investmentCost = (i) =>
  num(i.shares) > 0 && num(i.costBasis) > 0
    ? num(i.shares) * num(i.costBasis)
    : num(i.amountInvested);
export const investmentValue = (i) =>
  num(i.shares) > 0 && num(i.currentPrice) > 0
    ? num(i.shares) * num(i.currentPrice)
    : i.currentValue !== "" && i.currentValue != null
      ? num(i.currentValue)
      : investmentCost(i);
export function financeResult(s, from = s.today, to = dateAdd(s.today, 30)) {
  const posted = (d) => !!d && d <= s.today,
    inRange = (d) => d >= from && d <= to,
    settings = s.settings.tax || {};
  const payments = (s.debts || []).flatMap((d) => d.paymentHistory || []),
    income = s.income.filter((e) => inRange(incomeDate(e))),
    spending = s.spending.filter((e) => inRange(e.date)),
    savings = s.savings.filter((e) => inRange(e.date));
  const current =
    sum(s.accounts, (a) => num(a.balance)) +
    sum(
      s.income.filter((e) => posted(incomeDate(e))),
      (e) => netIncome(e, settings),
    ) +
    sum(s.savings.filter((e) => posted(e.date))) -
    sum(s.spending.filter((e) => posted(e.date) && !usesCredit(e))) -
    sum(payments.filter((e) => posted(e.date)));
  const bills = s.bills.flatMap((b) => occurrences(b, from, to));
  const overdue =
    from >= s.today
      ? sum(
          s.bills
            .flatMap((b) =>
              occurrences(b, dateAdd(s.today, -45), dateAdd(s.today, -1)),
            )
            .filter((o) => !o.paid),
        )
      : 0;
  const debts = s.debts.flatMap((d) => {
    const months = Math.max(
        1,
        Math.ceil(
          (Date.parse(d.targetPayoffDate) - Date.parse(s.today)) /
            86400000 /
            30,
        ) || 1,
      ),
      target = d.targetPayoffDate ? num(d.balance) / months : 0;
    const amount =
      num(d.balance) > 0
        ? num(d.minimumPayment) || Math.max(num(d.minimumPayment), target)
        : 0;
    return occurrences(
      { dueDate: d.dueDate || from, frequency: "monthly", amount },
      from,
      to,
    );
  });
  const futureIncome = income.filter((e) => incomeDate(e) > s.today),
    futureSpending = spending.filter((e) => e.date > s.today && !usesCredit(e)),
    futureSavings = savings.filter((e) => e.date > s.today);
  const shopping = sum(
      s.shopping.filter((e) => !e.completed),
      (e) => num(e.estimatedPrice),
    ),
    billTotal = sum(bills.filter((b) => !b.paid)),
    debtTotal = sum(debts);
  const forecast =
    current +
    sum(futureIncome, (e) => netIncome(e, settings)) +
    sum(futureSavings) -
    sum(futureSpending) -
    billTotal -
    overdue -
    debtTotal -
    shopping;
  const events = [
    ...futureIncome.map((e) => ({
      date: incomeDate(e),
      amount: netIncome(e, settings),
    })),
    ...futureSavings,
    ...futureSpending.map((e) => ({ ...e, amount: -num(e.amount) })),
    ...bills.filter((b) => !b.paid).map((b) => ({ ...b, amount: -b.amount })),
    ...debts.map((d) => ({ ...d, amount: -d.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let balance = current - overdue,
    lowest = balance;
  for (const e of events) {
    balance += num(e.amount);
    lowest = Math.min(lowest, balance);
  }
  const invested = sum(s.investments, investmentCost),
    investments = sum(s.investments, investmentValue),
    debt = sum(s.debts, (d) => num(d.balance)),
    safe = Math.max(0, Math.min(current, forecast, lowest));
  return {
    current,
    forecast,
    lowest,
    safe,
    daily: safe / Math.max(1, (Date.parse(to) - Date.parse(from)) / 86400000),
    billsDue: billTotal,
    overdue,
    debtPayments: debtTotal,
    debt,
    invested,
    investments,
    netWorth: current + investments - debt,
    gross: sum(income, grossIncome),
    net: sum(income, (e) => netIncome(e, settings)),
    tax: sum(income, (e) => taxEstimate(e, settings)),
    spending: sum(spending),
    savings: sum(savings),
    bills,
    events,
  };
}
export function balanceSeries(s, days = 30) {
  const r = financeResult(s),
    payments = s.debts.flatMap((d) => d.paymentHistory || []),
    flows = [
      ...s.income.map((e) => ({
        date: incomeDate(e),
        amount: netIncome(e, s.settings.tax),
      })),
      ...s.savings,
      ...s.spending
        .filter((e) => !usesCredit(e))
        .map((e) => ({ ...e, amount: -num(e.amount) })),
      ...payments.map((e) => ({ ...e, amount: -num(e.amount) })),
    ].filter((e) => e.date <= s.today);
  return Array.from({ length: Math.max(2, Math.min(370, days)) }, (_, i) => {
    const date = dateAdd(s.today, -(Math.max(2, Math.min(370, days)) - 1 - i));
    const cash =
      date === s.today
        ? r.current
        : (s.balanceHistory?.[date] ??
          r.current - sum(flows.filter((e) => e.date > date)));
    return {
      date,
      cash,
      netWorth:
        cash +
        r.investments -
        r.debt -
        sum(payments.filter((e) => e.date > date && e.date <= s.today)),
      spending: sum(s.spending.filter((e) => e.date === date)),
      income: sum(
        s.income.filter((e) => incomeDate(e) === date),
        (e) => netIncome(e, s.settings.tax),
      ),
    };
  });
}
export function seedFinance(today) {
  return {
    accounts: [
      { id: "ac1", title: "Checking", type: "Checking", balance: 820 },
      { id: "ac2", title: "Savings", type: "Savings", balance: 300 },
    ],
    spending: [
      {
        id: "s1",
        title: "Coffee",
        amount: 4.5,
        category: "Food",
        date: today,
        paymentMethod: "Debit card",
        accountId: "ac1",
      },
      {
        id: "s2",
        title: "Sketchbook",
        amount: 12,
        category: "School",
        date: dateAdd(today, -4),
        paymentMethod: "Debit card",
        accountId: "ac1",
      },
      {
        id: "s3",
        title: "Groceries",
        amount: 38,
        category: "Food",
        date: dateAdd(today, -10),
        paymentMethod: "Cash",
      },
    ],
    income: [
      {
        id: "i1",
        title: "Sample paycheck",
        source: "Sample paycheck",
        type: "manual",
        taxMode: "none",
        amount: 250,
        date: dateAdd(today, -7),
      },
      {
        id: "i2",
        title: "Sample shift",
        type: "hourly",
        hourlyWage: 15,
        hours: 8,
        taxMode: "none",
        date: dateAdd(today, -21),
      },
    ],
    bills: [
      {
        id: "bill1",
        title: "Phone plan",
        amount: 25,
        dueDate: dateAdd(today, 3),
        frequency: "monthly",
        billType: "subscription",
        category: "Utilities",
        paidThrough: "",
      },
    ],
    budgets: [{ id: "budget1", title: "Food", category: "Food", amount: 180 }],
    savings: [
      {
        id: "saving1",
        title: "Birthday savings",
        amount: 40,
        date: dateAdd(today, -3),
        accountId: "ac2",
        goalId: "goal1",
      },
    ],
    savingsGoals: [
      {
        id: "goal1",
        title: "Weekend trip",
        initialAmount: 60,
        targetAmount: 400,
        targetDate: dateAdd(today, 60),
      },
    ],
    debts: [
      {
        id: "debt1",
        title: "Sample card",
        balance: 80,
        originalBalance: 100,
        interestRate: 0,
        minimumPayment: 20,
        dueDate: dateAdd(today, 12),
        debtType: "credit-card",
        paymentHistory: [],
      },
    ],
    investments: [
      {
        id: "inv1",
        title: "Sample holding",
        type: "fund",
        amountInvested: 100,
        currentValue: 105,
      },
    ],
    incomeRules: [
      {
        id: "rule1",
        title: "Sample weekend work",
        amount: 90,
        nextDate: dateAdd(today, 5),
        frequency: "weekly",
        customDays: 7,
      },
    ],
    balanceHistory: {},
  };
}
// Atomic operations keep the history snapshot in the outer reducer.
export function financeMutation(s, a) {
  if (a.type === "payBill") {
    const b = s.bills.find((b) => b.id === a.id);
    if (
      !b ||
      !a.date ||
      occurrences(b, a.date, a.date).length !== 1 ||
      (b.paidThrough && a.date <= b.paidThrough)
    )
      return s;
    return {
      ...s,
      bills: s.bills.map((x) =>
        x.id === b.id ? { ...x, paidThrough: a.date } : x,
      ),
      spending: [
        ...s.spending,
        {
          id: `bill-${b.id}-${a.date}`,
          billId: b.id,
          title: b.title,
          date: a.date < s.today ? a.date : s.today,
          amount: b.amount,
          category: b.category,
          paymentMethod: "Debit card",
          accountId: a.accountId || "",
        },
      ],
    };
  }
  if (a.type === "payDebt") {
    const d = s.debts.find((d) => d.id === a.id),
      amount = num(a.amount);
    if (!d || amount <= 0 || amount > num(d.balance) || a.date > s.today)
      return s;
    return {
      ...s,
      debts: s.debts.map((x) =>
        x.id === d.id
          ? {
              ...x,
              balance: num(x.balance) - amount,
              paymentHistory: [
                ...(x.paymentHistory || []),
                {
                  id: a.paymentId,
                  date: a.date,
                  amount,
                  accountId: a.accountId,
                },
              ],
            }
          : x,
      ),
    };
  }
  if (a.type === "postIncome") {
    const r = s.incomeRules.find((r) => r.id === a.id);
    if (!r || r.nextDate > s.today) return s;
    const id = `income-${r.id}-${r.nextDate}`;
    if (s.income.some((e) => e.id === id)) return s;
    const next = occurrences(
      {
        dueDate: r.nextDate,
        frequency: r.frequency,
        customDays: r.customDays,
        amount: r.amount,
      },
      dateAdd(r.nextDate, 1),
      dateAdd(r.nextDate, 400),
    )[0]?.date;
    if (!next) return s;
    return {
      ...s,
      income: [
        ...s.income,
        {
          id,
          title: r.title,
          source: r.title,
          type: "manual",
          taxMode: "none",
          amount: r.amount,
          date: r.nextDate,
        },
      ],
      incomeRules: s.incomeRules.map((x) =>
        x.id === r.id ? { ...x, nextDate: next } : x,
      ),
    };
  }
  return s;
}
