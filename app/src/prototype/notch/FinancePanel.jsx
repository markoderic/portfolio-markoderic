import React, { useState } from "react";
import LineChart from "../charts/LineChart";
import {
  financeResult,
  balanceSeries,
  occurrences,
  dateAdd,
  netIncome,
  sum,
  investmentValue,
  investmentCost,
} from "./financeModel";
const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
export const financeNames = {
  bills: "Bill",
  budgets: "Budget",
  savings: "Deposit",
  savingsGoals: "Savings goal",
  debts: "Debt or card",
  investments: "Investment",
  incomeRules: "Recurring income",
};
export const financeFields = {
  accounts: [
    [
      "type",
      "Account type",
      "select",
      ["Checking", "Savings", "Cash", "Other"],
    ],
  ],
  spending: [
    [
      "paymentMethod",
      "Payment method",
      "select",
      ["Debit card", "Cash", "Credit card"],
    ],
    ["accountId", "Account", "accounts"],
    ["debtId", "Card", "debts"],
    ["necessary", "Necessary", "checkbox"],
  ],
  income: [
    ["type", "Income type", "select", ["manual", "hourly"]],
    ["hourlyWage", "Hourly wage", "number"],
    ["hours", "Hours", "number"],
    ["payDate", "Pay date", "date"],
    ["taxMode", "Tax mode", "select", ["none", "manual", "auto"]],
    ["manualTaxAmount", "Manual tax amount", "number"],
    ["deductionPercent", "Deduction %", "number"],
    ["annualGrossIncome", "Annual gross (auto estimate)", "number"],
    ["w2Income", "W-2 income", "checkbox"],
  ],
  bills: [
    ["amount", "Amount", "number"],
    ["dueDate", "First due date", "date"],
    [
      "frequency",
      "Frequency",
      "select",
      ["monthly", "weekly", "yearly", "custom", "one-time"],
    ],
    ["customDays", "Custom days", "number"],
    ["billType", "Type", "select", ["bill", "subscription"]],
    ["category", "Category", "text"],
  ],
  budgets: [
    ["category", "Category", "text"],
    ["amount", "Monthly limit", "number"],
  ],
  savings: [
    ["amount", "Amount", "number"],
    ["date", "Date", "date"],
    ["accountId", "Account", "accounts"],
    ["goalId", "Goal", "savingsGoals"],
  ],
  savingsGoals: [
    ["initialAmount", "Initial savings", "number"],
    ["targetAmount", "Target amount", "number"],
    ["targetDate", "Target date", "date"],
  ],
  debts: [
    ["balance", "Current balance", "number"],
    ["originalBalance", "Original balance", "number"],
    ["interestRate", "APR %", "number"],
    ["minimumPayment", "Minimum payment", "number"],
    ["dueDate", "Due date", "date"],
    ["targetPayoffDate", "Target payoff", "date"],
    ["debtType", "Type", "select", ["credit-card", "loan", "other"]],
  ],
  investments: [
    ["type", "Type", "select", ["stock", "fund", "crypto", "other"]],
    ["amountInvested", "Amount invested", "number"],
    ["currentValue", "Current value (blank = cost)", "number"],
    ["shares", "Shares", "number"],
    ["costBasis", "Cost per share", "number"],
    ["currentPrice", "Current price per share", "number"],
  ],
  incomeRules: [
    ["amount", "Amount", "number"],
    ["nextDate", "Next payday", "date"],
    [
      "frequency",
      "Frequency",
      "select",
      ["weekly", "biweekly", "monthly", "custom"],
    ],
    ["customDays", "Custom days", "number"],
  ],
};
export function FinanceFields({ collection, v, set, state }) {
  return (
    <>
      {(financeFields[collection] || []).map(([key, label, type, options]) => (
        <label key={key}>
          {label}
          {type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!v[key]}
              onChange={(e) => set(key, e.target.checked)}
            />
          ) : type === "select" || Array.isArray(state[type]) ? (
            <select
              value={v[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            >
              <option value="">Choose…</option>
              {(
                options || state[type].map((x) => [x.id, x.title || x.name])
              ).map((x) => {
                const [id, text] = Array.isArray(x) ? x : [x, x];
                return (
                  <option key={id} value={id}>
                    {text}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type={type}
              value={v[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
              min={type === "number" ? 0 : undefined}
              step={type === "number" ? "any" : undefined}
            />
          )}
        </label>
      ))}
      {collection === "income" && v.taxMode === "auto" && (
        <small>
          Sample estimate from the inspected native Ohio tax model. Enable and
          configure it under Finance → Tax settings.
        </small>
      )}
    </>
  );
}
export default function FinancePanel({
  state,
  dispatch,
  edit,
  initialSection = "overview",
}) {
  const [section, setSection] = useState(initialSection),
    [days, setDays] = useState(30),
    [pay, setPay] = useState(null),
    [amount, setAmount] = useState(""),
    [account, setAccount] = useState("");
  const result = financeResult(state, state.today, dateAdd(state.today, days)),
    series = balanceSeries(state, days);
  const periodResult = financeResult(
    state,
    dateAdd(state.today, -days + 1),
    state.today,
  );
  const rows = (collection, extra) => (
    <section className="n-card">
      <header>
        <strong>
          {{
            incomeRules: "Recurring income",
            savingsGoals: "Savings goals",
            debts: "Cards and loans",
          }[collection] || collection[0].toUpperCase() + collection.slice(1)}
        </strong>
        <button onClick={() => edit(collection)}>+ Add</button>
      </header>
      {state[collection].map((x) => (
        <div className="finance-record" key={x.id}>
          <button onClick={() => edit(collection, x)}>
            <strong>{x.title}</strong>
            <small>
              {x.date || x.nextDate || x.dueDate || x.targetDate || x.type}
            </small>
          </button>
          <span>
            {money(
              x.amount ?? x.balance ?? x.targetAmount ?? investmentValue(x),
            )}
          </span>
          {extra?.(x)}
        </div>
      ))}
    </section>
  );
  const upcoming = state.bills.flatMap((b) => {
    const list = occurrences(
      b,
      dateAdd(state.today, -45),
      dateAdd(state.today, 45),
    );
    return (
      list.find((o) => !o.paid) || list.find((o) => o.date >= state.today) || []
    );
  });
  return (
    <div className="finance-panel">
      {section !== "overview" && (
        <button className="n-back" onClick={() => setSection("overview")}>
          ‹ Finance
        </button>
      )}
      {section === "overview" && (
        <>
          <section className="n-card">
            <header><strong>Current money</strong>      <label className="finance-period">
        Period
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 30, 90].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </label>
</header>
            <strong className="n-money">{money(result.current)}</strong>
            <LineChart
              rows={series}
              metrics={[
                { key: "cash", label: "Cash balance" },
              ]}
              compact
              title="Money over time"
              provenance="Fictional sample ledger · recalculates after edits"
            />
          </section>
          <div className="n-stat-grid">
            <section className="n-card">
              <strong>{money(result.daily)}</strong>
              <small>Safe to spend a day</small>
            </section>
            <section className="n-card">
              <strong>{money(result.billsDue)}</strong>
              <small>Bills still due</small>
            </section>
          </div>
          <div className="n-segment">
            <button onClick={() => edit("spending")}>Money out</button>
            <button onClick={() => edit("income")}>Money in</button>
          </div>
          <section className="n-card">
            <header>Upcoming bills</header>
            {upcoming.map((o) => (
              <div className="finance-record" key={`${o.bill.id}-${o.date}`}>
                <button onClick={() => edit("bills", o.bill)}>
                  {o.bill.title}
                  <small>{o.date}</small>
                </button>
                <span>{money(o.amount)}</span>
                <button
                  disabled={o.paid}
                  onClick={() =>
                    dispatch({ type: "payBill", id: o.bill.id, date: o.date })
                  }
                >
                  {o.paid ? "Paid" : "Mark paid"}
                </button>
              </div>
            ))}
          </section>
          <section className="n-card">
            <header><strong>Spending by category</strong></header>
            {Object.entries(state.spending.filter(e=>e.date >= dateAdd(state.today, -days+1) && e.date <= state.today).reduce((totals,e)=>({...totals,[e.category || "Other"]:(totals[e.category || "Other"] || 0)+Number(e.amount || 0)}),{})).map(([category,amount])=><div className="n-category-spend" key={category}><span>{category}</span><strong>{money(amount)}</strong><progress aria-label={`${category} spending share`} value={amount} max={Math.max(amount, state.spending.filter(e=>e.date >= dateAdd(state.today,-days+1) && e.date <= state.today).reduce((total,e)=>total+Number(e.amount||0),0)) || 1}/></div>)}
          </section>
          <section className="n-card">
            {[
              ["accounts", "Accounts"],
              ["income", "Income"],
              ["bills", "Bills and subscriptions"],
              ["spending", "Spending and budgets"],
              ["savings", "Savings and goals"],
              ["debts", "Debt and cards"],
              ["investments", "Investments"],
              ["forecast", "Forecast"],
              ["tax", "Tax settings"],
            ].map(([id, label]) => (
              <button
                className="finance-navigation"
                key={id}
                onClick={() => setSection(id)}
              >
                {label}
                <span>›</span>
              </button>
            ))}
          </section>
        </>
      )}
      {section === "accounts" && (
        <>
          {rows("accounts")}
          <section className="n-card">
            <h2>Net worth {money(result.netWorth)}</h2>
            <LineChart
              rows={series}
              metrics={[{ key: "netWorth", label: "Net worth" }]}
              title="Net worth"
              provenance="Sample cash + current holdings − debt; native historical-payment adjustment"
            />
          </section>
        </>
      )}
      {section === "income" && (
        <>
          <section className="n-card">
            <h2>Net income {money(periodResult.net)}</h2>
            <p>
              Gross {money(periodResult.gross)} · estimated deductions{" "}
              {money(periodResult.tax)}
            </p>
            <LineChart
              rows={series}
              metrics={[{ key: "income", label: "Net income" }]}
              title="Income history"
              provenance="Fictional sample ledger"
            />
          </section>
          {rows("income", (e) => (
            <small>Net {money(netIncome(e, state.settings.tax))}</small>
          ))}
          {rows("incomeRules", (r) => (
            <button
              disabled={r.nextDate > state.today}
              onClick={() => dispatch({ type: "postIncome", id: r.id })}
            >
              Post due payday
            </button>
          ))}
        </>
      )}
      {section === "bills" && (
        <>
          {rows("bills", (b) => (
            <div>
              {occurrences(
                b,
                dateAdd(state.today, -45),
                dateAdd(state.today, 45),
              ).map((o) => (
                <button
                  key={o.date}
                  disabled={o.paid}
                  onClick={() =>
                    dispatch({ type: "payBill", id: b.id, date: o.date })
                  }
                >
                  {o.date} · {o.paid ? "Paid" : "Mark paid"}
                </button>
              ))}
            </div>
          ))}
        </>
      )}
      {section === "spending" && (
        <>
          {rows("spending")}
          <section className="n-card">
            <h2>Monthly budgets</h2>
            <button onClick={() => edit("budgets")}>+ Budget</button>
            {state.budgets.map((b) => {
              const spent = sum(
                state.spending.filter(
                  (e) =>
                    e.category === b.category &&
                    e.date.slice(0, 7) === state.today.slice(0, 7),
                ),
              );
              return (
                <div className="budget-row" key={b.id}>
                  <button onClick={() => edit("budgets", b)}>
                    {b.category}
                  </button>
                  <span>
                    {money(spent)} / {money(b.amount)}
                  </span>
                  <progress
                    value={Math.min(spent, Number(b.amount))}
                    max={Number(b.amount) || 1}
                  />
                  <small>
                    {money(Math.abs(Number(b.amount) - spent))}{" "}
                    {spent > Number(b.amount) ? "over" : "left"}
                  </small>
                </div>
              );
            })}
          </section>
          <LineChart
            rows={series}
            metrics={[{ key: "spending", label: "Spending" }]}
            title="Daily spending"
            provenance="Fictional sample ledger · includes credit purchases"
          />
        </>
      )}
      {section === "savings" && (
        <>
          {rows("savings")}
          {rows("savingsGoals", (g) => {
            const saved =
              Number(g.initialAmount || 0) +
              sum(
                state.savings.filter(
                  (e) => e.goalId === g.id && e.date <= state.today,
                ),
              );
            return (
              <div>
                <progress
                  value={Math.min(saved, Number(g.targetAmount))}
                  max={Number(g.targetAmount) || 1}
                />
                <small>
                  {money(saved)} saved ·{" "}
                  {money(Math.max(0, Number(g.targetAmount) - saved))} remaining
                </small>
                <button
                  onClick={() =>
                    edit("savings", {
                      goalId: g.id,
                      title: `Deposit for ${g.title}`,
                    })
                  }
                >
                  Add deposit
                </button>
              </div>
            );
          })}
        </>
      )}
      {section === "debts" && (
        <>
          {rows("debts", (d) => (
            <div>
              <button
                onClick={() => {
                  setPay(d.id);
                  setAmount(String(d.minimumPayment || ""));
                }}
              >
                Record payment
              </button>
              {(d.paymentHistory || []).map((p) => (
                <small key={p.id}>
                  {p.date} · {money(p.amount)}
                </small>
              ))}
            </div>
          ))}
          {pay && (
            <form
              className="n-card n-form"
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({
                  type: "payDebt",
                  id: pay,
                  date: state.today,
                  amount,
                  accountId: account,
                  paymentId: crypto.randomUUID(),
                });
                setPay(null);
              }}
            >
              <h2>Record sample payment</h2>
              <label>
                Amount
                <input
                  type="number"
                  min="0.01"
                  step=".01"
                  max={state.debts.find((d) => d.id === pay)?.balance}
                  value={amount}
                  required
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Account
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Save payment</button>
              <button type="button" onClick={() => setPay(null)}>
                Cancel
              </button>
            </form>
          )}
        </>
      )}
      {section === "investments" && (
        <>
          {rows("investments", (i) => (
            <small>
              Cost {money(investmentCost(i))} · gain{" "}
              {money(investmentValue(i) - investmentCost(i))}
            </small>
          ))}
          <small>Manual fictional holdings. No live market prices.</small>
        </>
      )}
      {section === "forecast" && (
        <section className="n-card">
          <h2>Where the period lands</h2>
          {[
            ["Current cash", result.current],
            ["Bills", -result.billsDue],
            ["Overdue bills", -result.overdue],
            ["Debt payments", -result.debtPayments],
            ["Projected balance", result.forecast],
            ["Lowest balance", result.lowest],
            ["Safe to spend", result.safe],
          ].map(([label, value]) => (
            <div className="finance-record" key={label}>
              <strong>{label}</strong>
              <span>{money(value)}</span>
            </div>
          ))}
          <h3>Scheduled flows</h3>
          {result.events.map((e, i) => (
            <div key={i} className="finance-record">
              <span>{e.date}</span>
              <span>{money(e.amount)}</span>
            </div>
          ))}
        </section>
      )}
      {section === "tax" && (
        <section className="n-card n-form">
          <h2>Sample tax settings</h2>
          <p>
            Native-source Ohio estimate model. Income defaults to no automatic
            deduction.
          </p>
          <label>
            <input
              type="checkbox"
              checked={!!state.settings.tax?.autoOhio}
              onChange={(e) =>
                dispatch({
                  type: "setting",
                  value: {
                    tax: { ...state.settings.tax, autoOhio: e.target.checked },
                  },
                })
              }
            />
            Enable Ohio automatic estimate
          </label>
          {[
            ["paycheckFrequency", "Pay frequency"],
            ["municipalTaxRate", "Municipal %"],
            ["schoolDistrictTaxRate", "School district %"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "paycheckFrequency" ? (
                <select
                  value={state.settings.tax?.[key] || "biweekly"}
                  onChange={(e) =>
                    dispatch({
                      type: "setting",
                      value: {
                        tax: { ...state.settings.tax, [key]: e.target.value },
                      },
                    })
                  }
                >
                  {[
                    "weekly",
                    "biweekly",
                    "semimonthly",
                    "monthly",
                    "annual",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step=".01"
                  value={state.settings.tax?.[key] || 0}
                  onChange={(e) =>
                    dispatch({
                      type: "setting",
                      value: {
                        tax: {
                          ...state.settings.tax,
                          [key]: Math.max(
                            0,
                            Math.min(100, Number(e.target.value)),
                          ),
                        },
                      },
                    })
                  }
                />
              )}
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
