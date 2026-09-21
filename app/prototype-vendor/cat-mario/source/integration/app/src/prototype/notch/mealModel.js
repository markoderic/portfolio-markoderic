// Meals.swift model: quantities in grams/ml/count; missing nutrients stay unknown.
export const mealIngredients = [
  {
    id: "oats",
    name: "Rolled oats",
    unitKind: "g",
    nutrients: { calories: 380, protein: 13, carbs: 68, fat: 7 },
    sourceTier: "estimated",
  },
  {
    id: "berries",
    name: "Mixed berries",
    unitKind: "g",
    nutrients: { calories: 50, protein: 1, carbs: 12, fat: 0.5 },
    sourceTier: "estimated",
  },
  {
    id: "rice",
    name: "Cooked rice",
    unitKind: "g",
    nutrients: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    sourceTier: "estimated",
  },
];
export const mealRecipes = [
  {
    id: "recipe1",
    title: "Oats and berries",
    slot: "breakfast",
    servingsBase: 1,
    ingredients: [
      { ingredientId: "oats", amount: 60 },
      { ingredientId: "berries", amount: 100 },
    ],
    instructions: ["Cook oats with water.", "Top with berries."],
    effortMin: 10,
  },
  {
    id: "recipe2",
    title: "Rice side",
    slot: "lunch",
    servingsBase: 1,
    ingredients: [{ ingredientId: "rice", amount: 150 }],
    instructions: ["Warm the prepared rice."],
    effortMin: 5,
  },
];
export function recipeNutrition(recipe, servings = 1) {
  const result = {};
  for (const key of ["calories", "protein", "carbs", "fat"]) {
    let total = 0,
      known = true;
    for (const line of recipe.ingredients) {
      const ingredient = mealIngredients.find(
        (x) => x.id === line.ingredientId,
      );
      if (ingredient?.nutrients[key] === undefined) {
        known = false;
        continue;
      }
      total +=
        (ingredient.nutrients[key] * Number(line.amount)) /
        (ingredient.unitKind === "count" ? 1 : 100);
    }
    result[key] = known
      ? (total * servings) / Math.max(1, recipe.servingsBase)
      : null;
  }
  return result;
}
export function mealGroceries(plans) {
  const grouped = {};
  for (const plan of plans) {
    const recipe = mealRecipes.find((r) => r.id === plan.recipeId);
    if (!recipe) continue;
    for (const line of recipe.ingredients)
      grouped[line.ingredientId] =
        (grouped[line.ingredientId] || 0) +
        (Number(line.amount) * Number(plan.servings)) /
          Math.max(1, recipe.servingsBase);
  }
  return Object.entries(grouped).map(([id, amount]) => ({
    ...mealIngredients.find((x) => x.id === id),
    amount: Math.ceil(amount),
  }));
}
export function mealMutation(s, a) {
  if (a.type === "logPlannedMeal") {
    const plan = s.mealPlans.find((p) => p.id === a.id),
      recipe = plan && mealRecipes.find((r) => r.id === plan.recipeId);
    if (!recipe || s.nutrition.some((n) => n.planId === plan.id)) return s;
    const values = recipeNutrition(recipe, Number(plan.servings));
    return {
      ...s,
      nutrition: [
        ...s.nutrition,
        {
          id: `meal-${plan.id}`,
          planId: plan.id,
          title: recipe.title,
          mealName: recipe.title,
          date: plan.date,
          ...values,
        },
      ],
    };
  }
  if (a.type === "mealGroceries") {
    const groceries = mealGroceries(
      s.mealPlans.filter((p) => p.date >= a.from && p.date <= a.to),
    );
    return {
      ...s,
      shopping: [
        ...s.shopping.filter((x) => x.mealWeek !== a.from),
        ...groceries.map((x) => ({
          id: `grocery-${a.from}-${x.id}`,
          mealWeek: a.from,
          title: `${x.name} · ${x.amount} ${x.unitKind}`,
          completed: false,
          listType: "grocery",
          category: "Meals",
        })),
      ],
    };
  }
  return s;
}
