import { useEffect, useMemo, useState } from 'react';
import { searchMealPlanRecipes } from './api/accountMealPlanApi';

const WEEKDAY_LABELS = [
  '\uC77C',
  '\uC6D4',
  '\uD654',
  '\uC218',
  '\uBAA9',
  '\uAE08',
  '\uD1A0',
];

const MEAL_TYPE_OPTIONS = [
  { value: 'BREAKFAST', label: '\uC544\uCE68' },
  { value: 'LUNCH', label: '\uC810\uC2EC' },
  { value: 'DINNER', label: '\uC800\uB141' },
  { value: 'SNACK', label: '\uAC04\uC2DD' },
  { value: 'CUSTOM', label: '\uC9C1\uC811 \uC785\uB825' },
];

const SOURCE_LABELS = {
  AI: 'AI \uC2DD\uB2E8',
  RECIPE: '\uB808\uC2DC\uD53C',
  MANUAL: '\uC9C1\uC811 \uCD94\uAC00',
};

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatMonthLabel(monthKey) {
  const matched = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!matched) {
    return monthKey || '';
  }
  return `${matched[1]}\uB144 ${Number(matched[2])}\uC6D4`;
}

function shiftMonth(monthKey, offset) {
  const [year, month] = String(monthKey).split('-').map(Number);
  const nextDate = new Date(year, month - 1 + offset, 1);
  return `${nextDate.getFullYear()}-${padNumber(nextDate.getMonth() + 1)}`;
}

function formatDateLabel(dateKey) {
  const matched = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return dateKey || '';
  }

  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

function getMealTypeLabel(mealType) {
  const matchedOption = MEAL_TYPE_OPTIONS.find((option) => option.value === mealType);
  return matchedOption ? matchedOption.label : mealType || '\uC2DD\uB2E8';
}

function buildCalendarCells(monthKey, entryList) {
  const [year, month] = String(monthKey).split('-').map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0);
  const firstWeekday = firstDate.getDay();
  const totalDays = lastDate.getDate();
  const previousMonthLastDate = new Date(year, month - 1, 0);
  const entryMap = new Map();

  (entryList || []).forEach((entry) => {
    const current = entryMap.get(entry.mealDate) || [];
    current.push(entry);
    entryMap.set(entry.mealDate, current);
  });

  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    const day = previousMonthLastDate.getDate() - firstWeekday + index + 1;
    const date = new Date(year, month - 2, day);
    const dateKey = `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
      date.getDate()
    )}`;
    cells.push({
      dateKey,
      day,
      entries: entryMap.get(dateKey) || [],
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${padNumber(month)}-${padNumber(day)}`;
    cells.push({
      dateKey,
      day,
      entries: entryMap.get(dateKey) || [],
      isCurrentMonth: true,
    });
  }

  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month, nextMonthDay);
    const dateKey = `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
      date.getDate()
    )}`;
    cells.push({
      dateKey,
      day: nextMonthDay,
      entries: entryMap.get(dateKey) || [],
      isCurrentMonth: false,
    });
    nextMonthDay += 1;
  }

  return cells;
}

function buildInitialForm(selectedDate) {
  return {
    mealDate: selectedDate || '',
    mealType: 'DINNER',
    entryTitle: '',
    entryDescription: '',
    servings: 1,
  };
}

export default function MealScheduleView({
  month,
  entries,
  plans,
  loading,
  error,
  selectedDate,
  onSelectDate,
  onChangeMonth,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onDeletePlan,
  onCreateRecipeEntry,
  onOpenMealPlanAi,
}) {
  const calendarCells = useMemo(() => buildCalendarCells(month, entries), [month, entries]);
  const selectedEntries = useMemo(
    () => (entries || []).filter((entry) => entry.mealDate === selectedDate),
    [entries, selectedDate]
  );
  const monthlyPlanCount = Array.isArray(plans) ? plans.length : 0;

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState(() => buildInitialForm(selectedDate));
  const [entryFormError, setEntryFormError] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  const [isRecipePanelOpen, setIsRecipePanelOpen] = useState(false);
  const [recipeKeyword, setRecipeKeyword] = useState('');
  const [recipeMealType, setRecipeMealType] = useState('DINNER');
  const [recipeServings, setRecipeServings] = useState(1);
  const [recipeItems, setRecipeItems] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState('');
  const [recipeSubmittingNo, setRecipeSubmittingNo] = useState(null);

  useEffect(() => {
    if (!isEditorOpen || editingEntry) {
      return;
    }

    setEntryForm((current) => ({
      ...current,
      mealDate: selectedDate || current.mealDate,
    }));
  }, [isEditorOpen, editingEntry, selectedDate]);

  useEffect(() => {
    if (!isRecipePanelOpen) {
      return;
    }

    setRecipeLoading(true);
    setRecipeError('');
    searchMealPlanRecipes({
      keyword: recipeKeyword,
      page: 1,
      pageSize: 8,
    })
      .then((response) => {
        setRecipeItems(Array.isArray(response.items) ? response.items : []);
      })
      .catch((loadError) => {
        setRecipeItems([]);
        setRecipeError(loadError.message || '\uB808\uC2DC\uD53C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
      })
      .finally(() => {
        setRecipeLoading(false);
      });
  }, [isRecipePanelOpen, recipeKeyword]);

  function openCreateForm() {
    setEditingEntry(null);
    setEntryForm(buildInitialForm(selectedDate));
    setEntryFormError('');
    setIsEditorOpen(true);
  }

  function openEditForm(entry) {
    setEditingEntry(entry);
    setEntryForm({
      mealDate: entry.mealDate || selectedDate,
      mealType: entry.mealType || 'DINNER',
      entryTitle: entry.entryTitle || '',
      entryDescription: entry.entryDescription || '',
      servings: entry.servings || 1,
    });
    setEntryFormError('');
    setIsEditorOpen(true);
  }

  async function handleEntrySubmit(event) {
    event.preventDefault();
    setEntryFormError('');
    setSubmittingEntry(true);

    try {
      if (editingEntry?.entryNo) {
        await onUpdateEntry?.(editingEntry.entryNo, entryForm);
      } else {
        await onCreateEntry?.(entryForm);
      }
      setIsEditorOpen(false);
      setEditingEntry(null);
      setEntryForm(buildInitialForm(selectedDate));
    } catch (submitError) {
      setEntryFormError(submitError.message || '\uC2DD\uB2E8\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setSubmittingEntry(false);
    }
  }

  async function handleRecipeAdd(recipeNo) {
    if (!recipeNo || recipeSubmittingNo) {
      return;
    }

    setRecipeError('');
    setRecipeSubmittingNo(recipeNo);

    try {
      await onCreateRecipeEntry?.({
        recipeNo,
        mealDate: selectedDate,
        mealType: recipeMealType,
        servings: recipeServings,
      });
      setIsRecipePanelOpen(false);
    } catch (submitError) {
      setRecipeError(submitError.message || '\uB808\uC2DC\uD53C \uC2DD\uB2E8\uC744 \uCD94\uAC00\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setRecipeSubmittingNo(null);
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <div className="page-title-row">
            <h1>{'\uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC'}</h1>
          </div>
          <p className="meal-schedule-head-copy">
            {
              '\uB9DE\uCDA4 \uC2DD\uB2E8\uACFC \uB808\uC2DC\uD53C\uB97C \uB2EC\uB825\uC5D0 \uBAA8\uC544\uB450\uACE0, \uB0A0\uC9DC\uBCC4\uB85C \uC2DD\uB2E8\uC744 \uC815\uB9AC\uD560 \uC218 \uC788\uC5B4\uC694.'
            }
          </p>
        </div>
        <div className="meal-schedule-head-actions">
          <button type="button" className="btn-outline" onClick={onOpenMealPlanAi}>
            {'\uB9DE\uCDA4 \uC2DD\uB2E8 AI\uB85C \uC774\uB3D9'}
          </button>
          <button type="button" className="btn-outline" onClick={() => setIsRecipePanelOpen(true)}>
            {'\uB808\uC2DC\uD53C \uCD94\uAC00'}
          </button>
          <button type="button" className="btn" onClick={openCreateForm}>
            {'\uC9C1\uC811 \uCD94\uAC00'}
          </button>
        </div>
      </section>

      <section className="section meal-schedule-section">
        <div className="meal-schedule-summary">
          <div className="meal-schedule-summary__item">
            <span>{'\uC774\uBC88 \uB2EC \uC2DD\uB2E8 \uC218'}</span>
            <strong>{`${entries.length}\uAC1C`}</strong>
          </div>
          <div className="meal-schedule-summary__item">
            <span>{'\uAC00\uC838\uC628 \uC2DD\uB2E8 \uBB36\uC74C'}</span>
            <strong>{`${monthlyPlanCount}\uAC1C`}</strong>
          </div>
          <div className="meal-schedule-summary__item">
            <span>{'\uC120\uD0DD\uD55C \uB0A0\uC9DC'}</span>
            <strong>{selectedDate ? formatDateLabel(selectedDate) : '-'}</strong>
          </div>
        </div>

        <div className="meal-schedule-calendar card">
          <div className="meal-schedule-calendar__head">
            <button
              type="button"
              className="btn-outline"
              onClick={() => onChangeMonth?.(shiftMonth(month, -1))}
            >
              {'\uC774\uC804 \uB2EC'}
            </button>
            <strong>{formatMonthLabel(month)}</strong>
            <button
              type="button"
              className="btn-outline"
              onClick={() => onChangeMonth?.(shiftMonth(month, 1))}
            >
              {'\uB2E4\uC74C \uB2EC'}
            </button>
          </div>

          <div className="meal-schedule-calendar__weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="meal-schedule-calendar__grid">
            {calendarCells.map((cell) => (
              <button
                key={cell.dateKey}
                type="button"
                className={`meal-schedule-calendar__cell ${
                  selectedDate === cell.dateKey ? 'is-selected' : ''
                } ${cell.isCurrentMonth ? '' : 'is-outside-month'}`}
                onClick={() => onSelectDate?.(cell.dateKey)}
              >
                <span className="meal-schedule-calendar__day">{cell.day}</span>
                <div className="meal-schedule-calendar__chips">
                  {cell.entries.slice(0, 3).map((entry) => (
                    <span
                      key={entry.entryNo}
                      className={`meal-schedule-chip is-${String(entry.sourceType || '').toLowerCase()}`}
                    >
                      {`${getMealTypeLabel(entry.mealType)} \u00B7 ${entry.entryTitle}`}
                    </span>
                  ))}
                  {cell.entries.length > 3 ? (
                    <span className="meal-schedule-chip is-more">+{cell.entries.length - 3}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="meal-schedule-detail-grid">
          <article className="card meal-schedule-detail-card">
            <div className="section-head">
              <div className="section-title">{'\uC120\uD0DD\uD55C \uB0A0\uC9DC \uC2DD\uB2E8'}</div>
              <small>{selectedDate ? formatDateLabel(selectedDate) : '\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.'}</small>
            </div>

            {loading ? <p className="meal-schedule-feedback">{'\uC2DD\uB2E8\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.'}</p> : null}
            {!loading && error ? <p className="meal-schedule-feedback is-error">{error}</p> : null}
            {!loading && !error && !selectedEntries.length ? (
              <p className="meal-schedule-feedback">{'\uC774 \uB0A0\uC9DC\uC5D0\uB294 \uC544\uC9C1 \uB4F1\uB85D\uB41C \uC2DD\uB2E8\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
            ) : null}

            {!loading && !error && selectedEntries.length ? (
              <div className="meal-schedule-entry-list">
                {selectedEntries.map((entry) => (
                  <article key={entry.entryNo} className="meal-schedule-entry-card">
                    <div className="meal-schedule-entry-card__head">
                      <div>
                        <span
                          className={`meal-schedule-source-badge is-${String(entry.sourceType || '').toLowerCase()}`}
                        >
                          {SOURCE_LABELS[entry.sourceType] || entry.sourceType}
                        </span>
                        <strong>{entry.entryTitle}</strong>
                      </div>
                      <span>{getMealTypeLabel(entry.mealType)}</span>
                    </div>

                    {entry.entryDescription ? (
                      <p className="meal-schedule-entry-card__copy">{entry.entryDescription}</p>
                    ) : null}

                    <div className="meal-schedule-entry-card__meta">
                      <span>{`${entry.servings || 1}\uC778\uBD84`}</span>
                      {entry.recipeNo ? (
                        <a href={`#/recipes/${entry.recipeNo}`}>{'\uB808\uC2DC\uD53C \uBCF4\uAE30'}</a>
                      ) : null}
                    </div>

                    {Array.isArray(entry.ingredients) && entry.ingredients.length ? (
                      <div className="meal-schedule-entry-card__ingredients">
                        {entry.ingredients.slice(0, 5).map((ingredient) => (
                          <span
                            key={
                              ingredient.entryIngredientNo ||
                              `${entry.entryNo}-${ingredient.ingredientName}`
                            }
                          >
                            {ingredient.ingredientName}
                            {ingredient.amountText ? ` ${ingredient.amountText}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="meal-schedule-entry-card__actions">
                      <button type="button" className="btn-outline" onClick={() => openEditForm(entry)}>
                        {'\uC218\uC815'}
                      </button>
                      {entry.planNo ? (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => onDeletePlan?.(entry.planNo)}
                        >
                          {'\uC2DD\uB2E8 \uBB36\uC74C \uC0AD\uC81C'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn-outline is-danger"
                        onClick={() => onDeleteEntry?.(entry.entryNo)}
                      >
                        {'\uC0AD\uC81C'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </article>

          <article className="card meal-schedule-detail-card">
            <div className="section-head">
              <div className="section-title">{'\uC774\uBC88 \uB2EC \uC2DD\uB2E8 \uBB36\uC74C'}</div>
            </div>

            {!plans?.length ? (
              <p className="meal-schedule-feedback">{'\uAC00\uC838\uC628 \uC2DD\uB2E8 \uBB36\uC74C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
            ) : (
              <div className="meal-schedule-plan-list">
                {plans.map((plan) => (
                  <article key={plan.planNo} className="meal-schedule-plan-card">
                    <strong>{plan.planTitle}</strong>
                    <span>
                      {formatDateLabel(plan.startDate)} ~ {formatDateLabel(plan.endDate)}
                    </span>
                    {plan.planSummary ? <p>{plan.planSummary}</p> : null}
                    <button
                      type="button"
                      className="btn-outline is-danger"
                      onClick={() => onDeletePlan?.(plan.planNo)}
                    >
                      {'\uC774 \uC2DD\uB2E8 \uC0AD\uC81C'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      {isEditorOpen ? (
        <section className="meal-schedule-side-panel">
          <form className="card meal-schedule-form" onSubmit={handleEntrySubmit}>
            <div className="section-head">
              <div className="section-title">
                {editingEntry ? '\uC2DD\uB2E8 \uC218\uC815' : '\uC9C1\uC811 \uC2DD\uB2E8 \uCD94\uAC00'}
              </div>
              <button type="button" className="btn-outline" onClick={() => setIsEditorOpen(false)}>
                {'\uB2EB\uAE30'}
              </button>
            </div>

            <label>
              <span>{'\uB0A0\uC9DC'}</span>
              <input
                type="date"
                value={entryForm.mealDate}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    mealDate: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>{'\uC2DD\uC0AC \uC2DC\uAC04'}</span>
              <select
                value={entryForm.mealType}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    mealType: event.target.value,
                  }))
                }
              >
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{'\uC2DD\uB2E8 \uC774\uB984'}</span>
              <input
                type="text"
                value={entryForm.entryTitle}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    entryTitle: event.target.value,
                  }))
                }
                placeholder={'\uC608: \uB2ED\uAC00\uC2B4\uC0B4 \uC0D0\uB7EC\uB4DC'}
              />
            </label>

            <label>
              <span>{'\uC124\uBA85'}</span>
              <textarea
                value={entryForm.entryDescription}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    entryDescription: event.target.value,
                  }))
                }
                rows={4}
                placeholder={'\uAC04\uB2E8\uD55C \uBA54\uBAA8\uB97C \uB0A8\uAE38 \uC218 \uC788\uC5B4\uC694.'}
              />
            </label>

            <label>
              <span>{'\uC778\uBD84'}</span>
              <input
                type="number"
                min="1"
                value={entryForm.servings}
                onChange={(event) =>
                  setEntryForm((current) => ({
                    ...current,
                    servings: event.target.value,
                  }))
                }
              />
            </label>

            {entryFormError ? <p className="meal-schedule-feedback is-error">{entryFormError}</p> : null}

            <button type="submit" className="btn" disabled={submittingEntry}>
              {submittingEntry
                ? '\uC800\uC7A5 \uC911...'
                : editingEntry
                  ? '\uC218\uC815 \uC800\uC7A5'
                  : '\uC2DD\uB2E8 \uCD94\uAC00'}
            </button>
          </form>
        </section>
      ) : null}

      {isRecipePanelOpen ? (
        <section className="meal-schedule-side-panel">
          <div className="card meal-schedule-form">
            <div className="section-head">
              <div className="section-title">{'\uB808\uC2DC\uD53C\uB85C \uC2DD\uB2E8 \uCD94\uAC00'}</div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setIsRecipePanelOpen(false)}
              >
                {'\uB2EB\uAE30'}
              </button>
            </div>

            <label>
              <span>{'\uB0A0\uC9DC'}</span>
              <input type="date" value={selectedDate || ''} readOnly />
            </label>

            <label>
              <span>{'\uC2DD\uC0AC \uC2DC\uAC04'}</span>
              <select value={recipeMealType} onChange={(event) => setRecipeMealType(event.target.value)}>
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{'\uC778\uBD84'}</span>
              <input
                type="number"
                min="1"
                value={recipeServings}
                onChange={(event) => setRecipeServings(Math.max(1, Number(event.target.value || 1)))}
              />
            </label>

            <label>
              <span>{'\uB808\uC2DC\uD53C \uAC80\uC0C9'}</span>
              <input
                type="text"
                value={recipeKeyword}
                onChange={(event) => setRecipeKeyword(event.target.value)}
                placeholder={'\uB808\uC2DC\uD53C \uC774\uB984\uC73C\uB85C \uAC80\uC0C9'}
              />
            </label>

            {recipeError ? <p className="meal-schedule-feedback is-error">{recipeError}</p> : null}

            <div className="meal-schedule-recipe-results">
              {recipeLoading ? (
                <p className="meal-schedule-feedback">{'\uB808\uC2DC\uD53C\uB97C \uCC3E\uB294 \uC911\uC785\uB2C8\uB2E4.'}</p>
              ) : null}
              {!recipeLoading && !recipeItems.length ? (
                <p className="meal-schedule-feedback">{'\uAC80\uC0C9\uB41C \uB808\uC2DC\uD53C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
              ) : null}
              {!recipeLoading &&
                recipeItems.map((recipe) => (
                  <article key={recipe.recipeNo} className="meal-schedule-recipe-card">
                    <div>
                      <strong>{recipe.recipeName}</strong>
                      <span>{recipe.cookTime || '\uC870\uB9AC \uC2DC\uAC04 \uC815\uBCF4 \uC5C6\uC74C'}</span>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleRecipeAdd(recipe.recipeNo)}
                      disabled={recipeSubmittingNo === recipe.recipeNo}
                    >
                      {recipeSubmittingNo === recipe.recipeNo
                        ? '\uCD94\uAC00 \uC911...'
                        : '\uC2DD\uB2E8\uC5D0 \uB123\uAE30'}
                    </button>
                  </article>
                ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
