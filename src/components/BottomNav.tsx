type Tab = "diary" | "progress";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <button
        type="button"
        className={active === "diary" ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item"}
        onClick={() => onChange("diary")}
      >
        Diary
      </button>
      <button
        type="button"
        className={active === "progress" ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item"}
        onClick={() => onChange("progress")}
      >
        Progress
      </button>
    </nav>
  );
}
