// (c) 2023, Petal
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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
};
