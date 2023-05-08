// lolol
const { compareDiffs } = require('./compare');

test('compareDiffs detects similar diffs', () => {
  const diffA = 'hello';
  // lolol
  const diffB = 'hello';
  expect(compareDiffs(diffA, diffB)).toBeTruthy();
});

test('compareDiffs detects different diffs lolol', () => {
  const diffA = 'hello';
  const diffB = 'world';
});
