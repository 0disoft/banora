import createStudy from '../recipes/create-study.json';
import inspectBranches from '../recipes/inspect-branches.json';
import reviewPreview from '../recipes/review-preview.json';
import scoreAgreed from '../recipes/score-agreed.json';
import occupiedPoint from '../recipes/occupied-point.json';

const recipes = [
  {
    name: 'create-study',
    purpose: 'Create, annotate, search and checkpoint a study.',
    expected: 'success',
    request: createStudy,
  },
  {
    name: 'inspect-branches',
    purpose: 'Inspect a collection and search without editing.',
    expected: 'success',
    request: inspectBranches,
  },
  {
    name: 'review-preview',
    purpose: 'Preview two guarded comment changes without applying.',
    expected: 'success',
    request: reviewPreview,
  },
  {
    name: 'score-agreed',
    purpose: 'Score an explicitly agreed position using area rules.',
    expected: 'success',
    request: scoreAgreed,
  },
  {
    name: 'occupied-point',
    purpose: 'Reproduce an occupied-point failure with no partial result.',
    expected: 'command-failed',
    request: occupiedPoint,
  },
] as const;

export function listRecipes() {
  return {
    schemaVersion: 'banora.cli-recipes/v1',
    ok: true,
    recipes: recipes.map(({ name, purpose, expected }) => ({ name, purpose, expected })),
  };
}
/** Fixed authored requests; no file lookup, evaluation, execution or implicit user data. */
export function getRecipe(name: string): unknown | undefined {
  const recipe = recipes.find((item) => item.name === name);
  return recipe ? structuredClone(recipe.request) : undefined;
}
