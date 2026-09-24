const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(full);
    } else if (entry.name.endsWith('.js')) {
      try {
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
      } catch (err) {
        console.error(`❌ Syntax error in file: ${full}\n`, err.stderr?.toString() || err.message);
        process.exit(1);
      }
    }
  }
}

console.log('🔍 Checking JS syntax across src/ and tests/ ...');
checkDir(path.join(__dirname, '../src'));
checkDir(path.join(__dirname, '../tests'));
console.log('✅ All JavaScript files passed syntax check!');
