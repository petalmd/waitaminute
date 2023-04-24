const { copyFileSync, rmSync } = require('fs');

const cwd = process.cwd();
copyFileSync(`${cwd}/dist_post/index.js`, `${cwd}/dist/post.js`);
copyFileSync(`${cwd}/dist_post/licenses.txt`, `${cwd}/dist/licenses-post.txt`);
rmSync(`${cwd}/dist_post`, { force: true, recursive: true });
