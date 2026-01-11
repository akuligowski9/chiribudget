'use client';

import { useState, useMemo } from 'react';
import TransactionList from '@/components/TransactionList';
import DashboardSummary from '@/components/DashboardSummary';
import { CURRENCIES } from '@/lib/categories';
import { Card, CardContent } from '@/components/ui/card';
import { Select, Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar, BarChart3 } from 'lucide-react';

const RANGE_PRESETS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

function getDateRange(preset, customStart, customEnd) {
  const today = new Date();
  let start, end;

  switch (preset) {
    case 'day':
      start = new Date(today);
      end = new Date(today);
      break;
    case 'week':
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'quarter':
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
      end = new Date(today.getFullYear(), qMonth + 3, 0);
      break;
    case 'year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(today);
      end = customEnd ? new Date(customEnd) : new Date(today);
      break;
    default:
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currency, setCurrency] = useState('USD');

  const { startDate, endDate } = useMemo(
    () => getDateRange(rangePreset, customStart, customEnd),
    [rangePreset, customStart, customEnd]
  );

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text m-0">Dashboard</h1>
      </div>

      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2 items-center">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setRangePreset(preset.value)}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200',
                  rangePreset === preset.value
                    ? 'bg-gradient-to-r from-slate to-slate-light text-white shadow-md shadow-slate/20'
                    : 'bg-white/50 text-stone hover:bg-white/80 hover:text-charcoal border border-white/60'
                )}
              >
                {preset.label}
              </button>
            ))}

            <div className="ml-auto">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-24 h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35 hover:scale-105"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-white text-charcoal">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rangePreset === 'custom' && (
            <div className="flex gap-3 mt-4 flex-wrap">
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-start"
                  className="text-xs font-semibold text-charcoal/70"
                >
                  Start Date
                </label>
                <Input
                  id="custom-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-end"
                  className="text-xs font-semibold text-charcoal/70"
                >
                  End Date
                </label>
                <Input
                  id="custom-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 text-sm text-stone">
            <Calendar className="w-4 h-4 text-slate" />
            <span className="font-medium">{startDate}</span>
            <span className="text-warm-gray">to</span>
            <span className="font-medium">{endDate}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <DashboardSummary
          startDate={startDate}
          endDate={endDate}
          currency={currency}
        />
        <TransactionList
          startDate={startDate}
          endDate={endDate}
          currency={currency}
        />
      </div>
    </main>
  );
}
