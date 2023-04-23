// Compares two diffs to see if they are equivalent.
const compareDiffs = function(diffA, diffB) {
  // Maybe we'll need to be smarter in the future, but for now we're just
  // comparing them using ===.
  return diffA === diffB;
}

exports.compareDiffs = compareDiffs;

