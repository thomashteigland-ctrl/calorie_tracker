import { displayName, formatMacro, type Food } from "../types/food";

type Props = {
  food: Food;
  selected: boolean;
  onSelect: () => void;
};

export function FoodCard({ food, selected, onSelect }: Props) {
  const subtitle = food.name_en && food.name_no !== food.name_en ? food.name_en : null;

  return (
    <button
      type="button"
      className={`food-card${selected ? " food-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="food-card__title">{displayName(food)}</div>
      {subtitle ? <div className="food-card__subtitle">{subtitle}</div> : null}
      <div className="food-card__macros">
        <span>{formatMacro(food.calories_per_100g, "kcal")}</span>
        <span>P {formatMacro(food.protein_per_100g)}</span>
        <span>C {formatMacro(food.carbs_per_100g)}</span>
        <span>F {formatMacro(food.fat_per_100g)}</span>
      </div>
      <div className="food-card__meta">per 100 g · {food.source}</div>
    </button>
  );
}
