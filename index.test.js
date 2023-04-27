const { compareDiffs } = require('./compare');
// lolol
test('compareDiffs detects similar diffs', () => {
  const diffA = 'hello';
  const diffB = 'hello';
  expect(compareDiffs(diffA, diffB)).toBeTruthy();
});

test('compareDiffs detects different diffs', () => {
  const diffA = 'hello'; // lolol
  const diffB = 'world';
  expect(compareDiffs(diffA, diffB)).toBeFalsy();
});
// lolol