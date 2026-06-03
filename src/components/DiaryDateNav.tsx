import { useState } from "react";
import { addDays, formatNavDate, monthGrid, parseIsoMonth, todayLocalDate } from "../lib/dates";

type Props = {
  selectedDate: string;
  closedDates: Set<string>;
  onSelectDate: (iso: string) => void;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function DiaryDateNav({ selectedDate, closedDates, onSelectDate }: Props) {
  const today = todayLocalDate();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { year, month } = parseIsoMonth(selectedDate);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  const canGoForward = selectedDate < today;

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="diary-date-nav">
      <div className="diary-date-nav__row">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => onSelectDate(addDays(selectedDate, -1))}
          aria-label="Previous day"
        >
          ←
        </button>
        <button
          type="button"
          className="diary-date-nav__date-btn"
          onClick={() => setCalendarOpen((o) => !o)}
          aria-expanded={calendarOpen}
        >
          {formatNavDate(selectedDate, today)}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          disabled={!canGoForward}
          onClick={() => onSelectDate(addDays(selectedDate, 1))}
          aria-label="Next day"
        >
          →
        </button>
      </div>

      {calendarOpen ? (
        <div className="diary-calendar-picker">
          <div className="diary-calendar-picker__month-nav">
            <button type="button" className="btn btn--ghost btn--small" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <span>{monthLabel}</span>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
          <div className="diary-calendar-picker__weekdays">
            {WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="diary-calendar-picker__grid">
            {monthGrid(viewYear, viewMonth).flat().map((iso, i) =>
              iso ? (
                <button
                  key={iso}
                  type="button"
                  disabled={iso > today}
                  className={[
                    "diary-calendar-picker__day",
                    closedDates.has(iso) ? "diary-calendar-picker__day--closed" : "",
                    iso === today && !closedDates.has(iso) ? "diary-calendar-picker__day--today-open" : "",
                    iso === today ? "diary-calendar-picker__day--today" : "",
                    iso === selectedDate ? "diary-calendar-picker__day--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onSelectDate(iso);
                    setCalendarOpen(false);
                  }}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              ) : (
                <span key={`pad-${i}`} className="diary-calendar-picker__day diary-calendar-picker__day--pad" />
              ),
            )}
          </div>
          <p className="diary-calendar-picker__legend">
            <span className="legend-dot legend-dot--closed" /> Closed
            <span className="legend-dot legend-dot--today" /> Open
          </p>
        </div>
      ) : null}
    </div>
  );
}
