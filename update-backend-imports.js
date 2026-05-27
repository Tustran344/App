const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, 'app');
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walk(file);
    } else if (file.endsWith('.tsx')) {
      files.push(file);
    }
  }
}
walk(root);
const marker = "const BACKEND_BASE_URL = 'http://localhost:3000';";
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(marker)) continue;
  const rel = path.relative(path.dirname(file), path.join(root, 'lib', 'backend.ts'));
  const relImport = rel.startsWith('.') ? rel.replace(/\\/g, '/') : './' + rel.replace(/\\/g, '/');
  const importLine = `import { BACKEND_BASE_URL } from '${relImport}';`;
  text = text.replace(marker, '');
  if (!text.includes(importLine)) {
    const lines = text.split(/\r?\n/);
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) insertIndex = i + 1;
    }
    lines.splice(insertIndex, 0, importLine);
    text = lines.join('\n');
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('Updated', file);
}
