import { last28Days, todayLocalDate } from "../lib/dates";

type Props = {
  selectedDate: string;
  loggedDates: Set<string>;
  onSelectDate: (iso: string) => void;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function TrackingCalendar({ selectedDate, loggedDates, onSelectDate }: Props) {
  const days = last28Days();
  const today = todayLocalDate();

  // Align first column to Monday
  const firstDow = (new Date(days[0] + "T12:00:00").getDay() + 6) % 7;
  const padded = [...Array(firstDow).fill(null), ...days];

  return (
    <section className="tracking-calendar" aria-label="Tracking overview">
      <h2 className="tracking-calendar__title">Tracking</h2>
      <p className="tracking-calendar__hint">Green = logged · tap a day to view</p>
      <div className="tracking-calendar__weekdays">
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="tracking-calendar__grid">
        {padded.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              type="button"
              className={[
                "tracking-calendar__day",
                loggedDates.has(iso) ? "tracking-calendar__day--logged" : "",
                iso === selectedDate ? "tracking-calendar__day--selected" : "",
                iso === today ? "tracking-calendar__day--today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(iso)}
              title={iso}
            >
              {Number(iso.slice(8, 10))}
            </button>
          ) : (
            <span key={`pad-${i}`} className="tracking-calendar__day tracking-calendar__day--pad" />
          ),
        )}
      </div>
    </section>
  );
}
