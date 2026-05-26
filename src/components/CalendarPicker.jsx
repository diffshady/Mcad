import { useEffect, useState } from 'react';
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, addMonths, subMonths,
  setMonth, setYear, getYear,
} from 'date-fns';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function decadeStart(year) { return Math.floor(year / 10) * 10; }

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function CalendarPicker({ value, onChange, tileContent, minDate }) {
  const [current, setCurrent] = useState(value || new Date());
  // view: 'days' | 'months' | 'years'
  const [view, setView] = useState('days');
  const today = new Date();

  useEffect(() => {
    if (value) setCurrent(value);
  }, [value]);

  // ── Day grid ──────────────────────────────────────────────
  const monthStart = startOfMonth(current);
  const startDate  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate    = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
  const days = [];
  let d = startDate;
  while (d <= endDate) { days.push(d); d = addDays(d, 1); }

  // ── Year decade ───────────────────────────────────────────
  const curYear  = getYear(current);
  const decStart = decadeStart(curYear);
  const years    = Array.from({ length: 12 }, (_, i) => decStart + i);

  // ── Handlers ──────────────────────────────────────────────
  const handleClear = () => onChange(null);
  const handleToday = () => { const t = new Date(); setCurrent(t); onChange(t); };

  const prevPeriod = () => {
    if (view === 'days')   setCurrent(c => subMonths(c, 1));
    if (view === 'months') setCurrent(c => setYear(c, getYear(c) - 1));
    if (view === 'years')  setCurrent(c => setYear(c, getYear(c) - 10));
  };
  const nextPeriod = () => {
    if (view === 'days')   setCurrent(c => addMonths(c, 1));
    if (view === 'months') setCurrent(c => setYear(c, getYear(c) + 1));
    if (view === 'years')  setCurrent(c => setYear(c, getYear(c) + 10));
  };

  const headerLabel = view === 'days'
    ? format(current, 'MMMM yyyy')
    : view === 'months'
    ? format(current, 'yyyy')
    : `${decStart} – ${decStart + 11}`;

  return (
    <div className="cal-picker">
      {/* ── Header ── */}
      <div className="cal-header">
        <button type="button" className="cal-month-label" onClick={() => setView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'days')}>
          {headerLabel} ▾
        </button>
        <div className="cal-nav">
          <button type="button" onClick={prevPeriod} title="Previous">↑</button>
          <button type="button" onClick={nextPeriod} title="Next">↓</button>
        </div>
      </div>

      {/* ── Day view ── */}
      {view === 'days' && (
        <>
          <div className="cal-weekdays">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="cal-grid">
            {days.map((day, i) => {
              const isOther    = !isSameMonth(day, current);
              const isToday    = isSameDay(day, today);
              const isSelected = value && isSameDay(day, value);
              const isWeekend  = (day.getDay() === 0 || day.getDay() === 6) && !isOther;
              const isDisabled = minDate && normalizeDate(day) < normalizeDate(minDate);
              return (
                <button key={i} type="button"
                  className={['cal-day', isOther ? 'cal-day--other' : '', isToday ? 'cal-day--today' : '', isSelected ? 'cal-day--selected' : '', isWeekend ? 'cal-day--weekend' : '', isDisabled ? 'cal-day--disabled' : ''].filter(Boolean).join(' ')}
                  onClick={() => !isDisabled && onChange(day)}
                  disabled={isDisabled}
                >
                  {day.getDate()}
                  {tileContent?.({ date: day })}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Month view ── */}
      {view === 'months' && (
        <div className="cal-grid-3">
          {MONTHS.map((m, i) => {
            const isSelected = value && value.getMonth() === i && getYear(value) === curYear;
            const isCurMonth = today.getMonth() === i && getYear(today) === curYear;
            return (
              <button key={m} type="button"
                className={['cal-cell', isSelected ? 'cal-day--selected' : '', isCurMonth && !isSelected ? 'cal-day--today' : ''].filter(Boolean).join(' ')}
                onClick={() => { setCurrent(c => setMonth(c, i)); setView('days'); }}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Year view ── */}
      {view === 'years' && (
        <div className="cal-grid-3">
          {years.map((yr) => {
            const isSelected = value && getYear(value) === yr;
            const isNow      = getYear(today) === yr;
            const isOut      = yr < decStart || yr > decStart + 9;
            return (
              <button key={yr} type="button"
                className={['cal-cell', isOut ? 'cal-day--other' : '', isSelected ? 'cal-day--selected' : '', isNow && !isSelected ? 'cal-day--today' : ''].filter(Boolean).join(' ')}
                onClick={() => { setCurrent(c => setYear(c, yr)); setView('months'); }}
              >
                {yr}
              </button>
            );
          })}
        </div>
      )}

      <div className="cal-footer">
        <button type="button" className="cal-footer-btn" onClick={handleClear}>Clear</button>
        <button type="button" className="cal-footer-btn" onClick={handleToday}>Today</button>
      </div>
    </div>
  );
}
