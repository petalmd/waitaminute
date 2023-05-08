import parseDiff from 'parse-diff';

// Given a string containing diff data, parses the data
// and returns an array containing the "effective diff" -
// the part of the diff that really changed. Each array
// item contains the diff for one file.
export const getEffectiveDiff = (diffData) => {
  const files = parseDiff(diffData);
  return files
            .sort((fileA, fileB) => fileA.to.localeCompare(fileB.to))
            .map((file) => getFileEffectiveDiff(file));
};

const getFileEffectiveDiff = (file) => ({
  chunks: file.chunks.map((chunk) => getChunkEffectiveDiff(chunk)),
  deletions: file.deletions,
  additions: file.additions,
  from: file.from,
  to: file.to,
  newMode: file.newMode,
  oldMode: file.oldMode,
});

const getChunkEffectiveDiff = (chunk) => {
  const { oldStart, newStart } = chunk;
  return {
    changes: chunk.changes
                      .filter((change) => change.type !== 'normal')
                      .map((change) => getChangeEffectiveDiff(change, oldStart, newStart)),
    startDiff: (newStart - oldStart),
  };
};

const getChangeEffectiveDiff = (change, oldStart, newStart) => ({
  type: change.type,
  lnDiff: getChangeEffectiveLineDiff(change, oldStart, newStart),
  content: change.content,
});

const getChangeEffectiveLineDiff = (change, oldStart, newStart) => {
  switch (change.type) {
    case 'del':
      return change.ln - oldStart;
    case 'add':
      return change.ln - newStart;
    default:
      throw new Error(`Unsupported change type: ${change.type}`);
  }
}
