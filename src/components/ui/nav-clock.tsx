'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function NavClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [rangeStart, setRangeStart] = useState<number | null>(null); // day number in current view
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Hydration-safe clock
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setRangeStart(null); setRangeEnd(null);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setRangeStart(null); setRangeEnd(null);
  }

  function handleDayClick(day: number) {
    if (rangeStart === null) {
      setRangeStart(day);
      setRangeEnd(null);
    } else if (rangeEnd === null && day !== rangeStart) {
      setRangeEnd(day > rangeStart ? day : rangeStart);
      if (day < rangeStart) setRangeStart(day);
    } else {
      setRangeStart(day);
      setRangeEnd(null);
    }
  }

  function goToday() {
    setCalYear(todayYear);
    setCalMonth(todayMonth);
    setRangeStart(null);
    setRangeEnd(null);
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const isCurrentMonth = calYear === todayYear && calMonth === todayMonth;

  const rangeDays = rangeStart !== null && rangeEnd !== null ? rangeEnd - rangeStart + 1 : null;

  if (!now) {
    // SSR placeholder — same width to avoid layout shift
    return <div className="hidden md:block w-36 h-8" />;
  }

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div ref={ref} className="hidden md:flex flex-col items-center relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:bg-white/70 group"
        aria-label="Open calendar"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold tabular-nums tracking-tight" style={{ color: 'var(--color-text)' }}>
          {timeStr}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          {dateStr}
        </span>
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          className="absolute top-full mt-2 z-50 rounded-2xl shadow-xl border animate-in scale-in duration-150"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            width: 280,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-subtle)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {MONTHS[calMonth]} {calYear}
              </p>
            </div>

            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-subtle)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--color-text-subtle)' }}>
                {d[0]}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = isCurrentMonth && day === todayDay;
              const isStart = rangeStart === day;
              const isEnd = rangeEnd === day;
              const inRange = rangeStart !== null && rangeEnd !== null && day > rangeStart && day < rangeEnd;

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="relative h-8 w-full flex items-center justify-center text-xs font-medium rounded-lg transition-all"
                  style={{
                    backgroundColor: isStart || isEnd
                      ? 'var(--color-primary)'
                      : inRange
                        ? 'var(--color-primary-light)'
                        : isToday
                          ? 'var(--color-primary-mid)'
                          : undefined,
                    color: isStart || isEnd
                      ? 'white'
                      : isToday
                        ? 'var(--color-primary)'
                        : 'var(--color-text)',
                    fontWeight: isToday || isStart || isEnd ? 700 : undefined,
                  }}
                  onMouseEnter={e => { if (!isStart && !isEnd && !inRange && !isToday) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-subtle)'; }}
                  onMouseLeave={e => { if (!isStart && !isEnd && !inRange && !isToday) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="px-4 pb-3 pt-2 border-t flex items-center justify-between gap-2"
            style={{ borderColor: 'var(--color-border-muted)' }}
          >
            {rangeDays !== null ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {rangeDays} {rangeDays === 1 ? 'day' : 'days'}
                </span>
                <button
                  onClick={() => { setRangeStart(null); setRangeEnd(null); }}
                  className="text-[10px] flex items-center gap-0.5 transition-colors"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            ) : rangeStart !== null ? (
              <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                Click another day to calculate
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                Click two days to count
              </span>
            )}

            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:bg-[var(--color-primary-light)]"
                style={{ color: 'var(--color-primary)' }}
              >
                Today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
