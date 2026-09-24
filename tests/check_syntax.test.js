const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
};

let totalChecked = 0;
const failedFiles = [];

function checkDir(dir, baseDirName = '') {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath, baseDirName);
    } else if (entry.name.endsWith('.js')) {
      totalChecked++;
      const relativePath = path.relative(path.join(__dirname, '..'), fullPath).replace(/\\/g, '/');

      try {
        execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
        console.log(`  ${COLORS.GREEN}✓${COLORS.RESET} ${COLORS.GRAY}${relativePath}${COLORS.RESET}`);
      } catch (err) {
        failedFiles.push({
          file: relativePath,
          error: err.stderr?.toString() || err.message,
        });
        console.log(`  ${COLORS.RED}✗ ${relativePath}${COLORS.RESET}`);
      }
    }
  }
}

console.log(`\n${COLORS.BOLD}${COLORS.CYAN}🔍 [SYNTAX CHECK] Bắt đầu kiểm tra cú pháp toàn bộ tệp JavaScript (.js)...${COLORS.RESET}\n`);

checkDir(path.join(__dirname, '../src'), 'src');
checkDir(path.join(__dirname, '../tests'), 'tests');

console.log('');
if (failedFiles.length > 0) {
  console.error(`${COLORS.RED}❌ Có ${failedFiles.length}/${totalChecked} tệp bị lỗi cú pháp:${COLORS.RESET}`);
  for (const fail of failedFiles) {
    console.error(`\n- ${COLORS.BOLD}${fail.file}${COLORS.RESET}:\n${fail.error}`);
  }
  process.exit(1);
} else {
  console.log(`${COLORS.BOLD}${COLORS.GREEN}✅ Đã kiểm tra cú pháp thành công ${totalChecked} tệp JavaScript! Không có lỗi.${COLORS.RESET}\n`);
}
