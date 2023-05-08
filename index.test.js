import { getEffectiveDiff } from './diff';

const DIFF_WITH_NEW_AND_DELETED_FILES =
`diff --git a/LICENSE b/LICENSE
deleted file mode 100644
index b8e15d4..0000000
--- a/LICENSE
+++ /dev/null
@@ -1,21 +0,0 @@
-MIT License
-
-Copyright (c) 2023 Charles Lechasseur
-
-Permission is hereby granted, free of charge, to any person obtaining a copy
-of this software and associated documentation files (the "Software"), to deal
-in the Software without restriction, including without limitation the rights
-to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-copies of the Software, and to permit persons to whom the Software is
-furnished to do so, subject to the following conditions:
-
-The above copyright notice and this permission notice shall be included in all
-copies or substantial portions of the Software.
-
-THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-SOFTWARE.
diff --git a/LICENSE.lol b/LICENSE.lol
new file mode 100644
index 0000000..039727e
--- /dev/null
+++ b/LICENSE.lol
@@ -0,0 +1 @@
+lol`;

const DIFF_WITH_LOTS_OF_CHANGES =
`diff --git a/index.test.js b/index.test.js
index 495d3e8..c2c7b9b 100644
--- a/index.test.js
+++ b/index.test.js
@@ -1,13 +1,14 @@
+// lolol
 const { compareDiffs } = require('./compare');
 
 test('compareDiffs detects similar diffs', () => {
   const diffA = 'hello';
+  // lolol
   const diffB = 'hello';
   expect(compareDiffs(diffA, diffB)).toBeTruthy();
 });
 
-test('compareDiffs detects different diffs', () => {
+test('compareDiffs detects different diffs lolol', () => {
   const diffA = 'hello';
   const diffB = 'world';
-  expect(compareDiffs(diffA, diffB)).toBeFalsy();
 });`

// lolol
describe('getEffectiveDiff', () => {
  describe('when diff contains new and deleted files', () => {
    it('returns diff data with added and deleted lines', () => {
      const diffData = getEffectiveDiff(DIFF_WITH_NEW_AND_DELETED_FILES);
      // lolol
      expect(diffData).toStrictEqual([
        {
          chunks: [
            {
              changes: [
                {
                  type: "del",
                  lnDiff: 0,
                  content: "-MIT License"
                },
                {
                  type: "del",
                  lnDiff: 1,
                  content: "-"
                },
                {
                  type: "del",
                  lnDiff: 2,
                  content: "-Copyright (c) 2023 Charles Lechasseur"
                },
                {
                  type: "del",
                  lnDiff: 3,
                  content: "-"
                },
                {
                  type: "del",
                  lnDiff: 4,
                  content: "-Permission is hereby granted, free of charge, to any person obtaining a copy"
                },
                {
                  type: "del",
                  lnDiff: 5,
                  content: "-of this software and associated documentation files (the \"Software\"), to deal"
                },
                {
                  type: "del",
                  lnDiff: 6,
                  content: "-in the Software without restriction, including without limitation the rights"
                },
                {
                  type: "del",
                  lnDiff: 7,
                  content: "-to use, copy, modify, merge, publish, distribute, sublicense, and/or sell"
                },
                {
                  type: "del",
                  lnDiff: 8,
                  content: "-copies of the Software, and to permit persons to whom the Software is"
                },
                {
                  type: "del",
                  lnDiff: 9,
                  content: "-furnished to do so, subject to the following conditions:"
                },
                {
                  type: "del",
                  lnDiff: 10,
                  content: "-"
                },
                {
                  type: "del",
                  lnDiff: 11,
                  content: "-The above copyright notice and this permission notice shall be included in all"
                },
                {
                  type: "del",
                  lnDiff: 12,
                  content: "-copies or substantial portions of the Software."
                },
                {
                  type: "del",
                  lnDiff: 13,
                  content: "-"
                },
                {
                  type: "del",
                  lnDiff: 14,
                  content: "-THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR"
                },
                {
                  type: "del",
                  lnDiff: 15,
                  content: "-IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,"
                },
                {
                  type: "del",
                  lnDiff: 16,
                  content: "-FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE"
                },
                {
                  type: "del",
                  lnDiff: 17,
                  content: "-AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER"
                },
                {
                  type: "del",
                  lnDiff: 18,
                  content: "-LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,"
                },
                {
                  type: "del",
                  lnDiff: 19,
                  content: "-OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE"
                },
                {
                  type: "del",
                  lnDiff: 20,
                  content: "-SOFTWARE."
                }
              ],
              startDiff: -1
            }
          ],
          deletions: 21,
          additions: 0,
          from: "LICENSE",
          to: "/dev/null",
          newMode: undefined,
          oldMode: "100644",
        },
        {
          chunks: [
            {
              changes: [
                {
                  type: "add",
                  lnDiff: 0,
                  content: "+lol"
                }
              ],
              startDiff: 1
            }
          ],
          deletions: 0,
          additions: 1,
          from: "/dev/null",
          to: "LICENSE.lol",
          newMode: "100644",
          oldMode: undefined
        }
      ]);
    });
  });

  describe('when diff contains lots of changes', () => {
    it('returns diff data with changes only', () => {
      const diffData = getEffectiveDiff(DIFF_WITH_LOTS_OF_CHANGES);
      expect(diffData).toStrictEqual([
        {
          chunks: [
            {
              changes: [
                {
                  type: "add",
                  lnDiff: 0,
                  content: "+// lolol"
                },
                {
                  type: "add",
                  lnDiff: 5,
                  content: "+  // lolol"
                },
                {
                  type: "del",
                  lnDiff: 8,
                  content: "-test('compareDiffs detects different diffs', () => {"
                },
                {
                  type: "add",
                  lnDiff: 10,
                  content: "+test('compareDiffs detects different diffs lolol', () => {"
                },
                {
                  type: "del",
                  lnDiff: 11,
                  content: "-  expect(compareDiffs(diffA, diffB)).toBeFalsy();"
                }
              ],
              startDiff: 0
            }
          ],
          deletions: 2,
          additions: 3,
          from: "index.test.js",
          to: "index.test.js",
          newMode: "100644",
          oldMode: "100644"
        }
      ]);
    });
  });
});
