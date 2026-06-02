import { displayName, formatMacro, type Food } from "../types/food";

type Props = {
  food: Food;
};

export function FoodDetail({ food }: Props) {
  return (
    <section className="food-detail" aria-label="Selected food">
      <h2>{displayName(food)}</h2>
      {food.name_en && food.name_no ? <p className="food-detail__en">{food.name_en}</p> : null}

      <dl className="macro-grid">
        <div>
          <dt>Calories</dt>
          <dd>{formatMacro(food.calories_per_100g, "kcal")}</dd>
        </div>
        <div>
          <dt>Protein</dt>
          <dd>{formatMacro(food.protein_per_100g)}</dd>
        </div>
        <div>
          <dt>Carbs</dt>
          <dd>{formatMacro(food.carbs_per_100g)}</dd>
        </div>
        <div>
          <dt>Fat</dt>
          <dd>{formatMacro(food.fat_per_100g)}</dd>
        </div>
      </dl>

      <p className="food-detail__hint">
        Daily logging and goals come next — this screen is for searching and verifying your food
        database.
      </p>
    </section>
  );
}
