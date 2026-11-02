require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectVisitBatch, toggleVisitSelection, VISIT_REVIEW_BATCH_LIMIT } = require('../../src/screens/Characterizations/components/visitReviewSelection.ts');
const { dateToBrazilian, brazilianToDate } = require('../../src/screens/Characterizations/components/visitDates.ts');
const items = Array.from({ length: 160 }, (_, index) => ({ eligible: index % 4 !== 0, entry: { operation: { operationId: `operation-${index}` } } }));

test('selects a maximum of 100 eligible changes while preserving existing exceptions without mutating UI input', () => {
  const selected = { 'operation-157': true, 'operation-159': true, 'operation-155': false };
  const frozen = JSON.stringify(selected), beforeItems = JSON.stringify(items);
  const result = selectVisitBatch(items, selected);
  assert.equal(Object.values(result).filter(Boolean).length, VISIT_REVIEW_BATCH_LIMIT);
  assert.equal(result['operation-157'], true); assert.equal(result['operation-159'], true);
  for (const item of items.filter((item) => !item.eligible)) assert.notEqual(result[item.entry.operation.operationId], true);
  assert.equal(JSON.stringify(selected), frozen); assert.equal(JSON.stringify(items), beforeItems);
});
test('does not add a 101st item and allows deselecting one to choose an explicit exception', () => {
  const selected = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`operation-${index}`, true]));
  const blocked = toggleVisitSelection(selected, 'exception');
  assert.equal(blocked.limitReached, true); assert.equal(blocked.selected, selected); assert.equal('exception' in selected, false);
  const freed = toggleVisitSelection(selected, 'operation-5');
  assert.equal(freed.limitReached, false); assert.equal(freed.selected['operation-5'], false); assert.equal(selected['operation-5'], true);
  const exception = toggleVisitSelection(freed.selected, 'exception');
  assert.equal(exception.limitReached, false); assert.equal(exception.selected.exception, true);
  assert.equal(Object.values(exception.selected).filter(Boolean).length, 100);
});
test('an empty or wholly ineligible list does not automatically select hidden pending work', () => {
  assert.deepEqual(selectVisitBatch([]), {});
  assert.deepEqual(selectVisitBatch(items.map((item) => ({ ...item, eligible: false }))), {});
});
test('date entry preserves civil dates, leap days and the Brazilian display format while rejecting impossible dates', () => {
  for (const [iso, display] of [['2026-10-24', '24/10/2026'], ['2024-02-29', '29/02/2024'], ['1900-01-01', '01/01/1900'], ['2200-12-31', '31/12/2200']]) {
    assert.equal(dateToBrazilian(iso), display); assert.equal(brazilianToDate(display), iso);
  }
  for (const invalid of ['29/02/2026', '31/04/2026', '00/10/2026', '12/13/2026', '2/1/2026', '2026-10-24', '01/01/1899', '01/01/2201']) assert.equal(brazilianToDate(invalid), undefined);
});
