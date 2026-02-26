'use client';

import { useMemo } from 'react';
import { PieChart as PieIcon, TrendingUp } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useContainerDimensions } from '@/hooks/useContainerDimensions';
import { formatCurrency } from '@/lib/formatCurrency';

// Earth tone colors that match the app theme
const EXPENSE_COLORS = [
  '#d15b4e', // error/expense - Fixed Expenses
  '#c4785e', // terracotta - Rent
  '#e8945a', // accent - Food
  '#d4a54a', // warning - Dogs
  '#8b7355', // brown - Holidays
  '#6b8e6b', // sage green - Adventure
  '#5b7b95', // slate - Unexpected
];

const INCOME_COLORS = [
  '#5a9e6f', // success - Salary
  '#6ba3c7', // slate-light - Investments
  '#7d8471', // sage - Extra
];

export function ExpenseDonutChart({ expenseByCat, currency, totalExpenses }) {
  const { ref, ready } = useContainerDimensions();

  const data = useMemo(() => {
    return Object.entries(expenseByCat)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenseByCat]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-slate" />
            <CardTitle>Expense Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-warm-gray text-center py-8">
            No expenses in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-error" />
          <CardTitle>Expense Breakdown</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="h-[250px] min-h-[250px]">
          {ready && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${formatCurrency(percent * 100, 0)}%` : ''
                  }
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `${currency} ${formatCurrency(value)}`,
                    '',
                  ]}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e8e0d5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    EXPENSE_COLORS[index % EXPENSE_COLORS.length],
                }}
              />
              <span className="text-stone truncate">{entry.name}</span>
              <span className="text-charcoal font-semibold ml-auto">
                {currency} {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SpendingTrendChart({ rows, currency, startDate, endDate }) {
  const { ref, ready } = useContainerDimensions();

  const data = useMemo(() => {
    // Group transactions by date
    const byDate = {};

    // Initialize all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      byDate[key] = { date: key, income: 0, expenses: 0 };
    }

    // Aggregate transactions
    for (const r of rows) {
      const key = r.txn_date;
      if (!byDate[key]) continue;
      if (r.amount > 0) {
        byDate[key].income += Number(r.amount);
      } else {
        byDate[key].expenses += Math.abs(Number(r.amount));
      }
    }

    // Convert to array and format dates
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [rows, startDate, endDate]);

  // If too many days, aggregate by week
  const chartData = useMemo(() => {
    if (data.length <= 14) return data;

    // Aggregate by week
    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
      const weekData = data.slice(i, i + 7);
      const income = weekData.reduce((s, d) => s + d.income, 0);
      const expenses = weekData.reduce((s, d) => s + d.expenses, 0);
      weeks.push({
        label: weekData[0].label,
        income,
        expenses,
      });
    }
    return weeks;
  }, [data]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate" />
            <CardTitle>Spending Trend</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-warm-gray text-center py-8">
            No transactions in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate" />
          <CardTitle>Spending Trend</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="h-[250px] min-h-[250px]">
          {ready && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={0} barCategoryGap="20%">
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6b6560' }}
                  axisLine={{ stroke: '#e8e0d5' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b6560' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${formatCurrency(v / 1000, 0)}k` : v
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${currency} ${formatCurrency(value)}`,
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e8e0d5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => (
                    <span className="text-stone capitalize">{value}</span>
                  )}
                />
                <Bar dataKey="income" fill="#5a9e6f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#d15b4e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IncomeVsExpenseChart({ totalIncome, totalExpenses, currency }) {
  const { ref, ready } = useContainerDimensions();

  const data = [
    { name: 'Income', value: totalIncome, fill: '#5a9e6f' },
    { name: 'Expenses', value: totalExpenses, fill: '#d15b4e' },
  ];

  const net = totalIncome - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="h-[120px] min-h-[120px]">
          {ready && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" barSize={28}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b6560' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value) => [
                    `${currency} ${formatCurrency(value)}`,
                    '',
                  ]}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e8e0d5',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div
          className={`text-center mt-2 p-2 rounded-lg ${net >= 0 ? 'bg-success/10' : 'bg-error/10'}`}
        >
          <span className="text-sm text-stone">Net: </span>
          <span
            className={`font-bold ${net >= 0 ? 'text-success' : 'text-error'}`}
          >
            {currency} {formatCurrency(net)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
