const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Bảng màu ANSI định dạng Terminal sắc nét
const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  GRAY: '\x1b[90m',
  BG_GREEN: '\x1b[42m\x1b[30m',
  BG_RED: '\x1b[41m\x1b[37m',
};

let totalChecked = 0;
let failedFiles = [];

function checkDir(dir, baseDirName) {
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
if (failedFiles.length === 0) {
  console.log(`${COLORS.BG_GREEN}${COLORS.BOLD} PASS ${COLORS.RESET} ${COLORS.GREEN}${COLORS.BOLD}Đã kiểm tra thành công ${totalChecked}/${totalChecked} tệp JS. Tất cả cú pháp hợp lệ 100%!${COLORS.RESET}\n`);
} else {
  console.error(`${COLORS.BG_RED}${COLORS.BOLD} FAIL ${COLORS.RESET} ${COLORS.RED}${COLORS.BOLD}Phát hiện ${failedFiles.length} tệp có lỗi cú pháp:${COLORS.RESET}\n`);
  for (const fail of failedFiles) {
    console.error(`  ${COLORS.RED}❌ ${fail.file}${COLORS.RESET}\n${COLORS.YELLOW}${fail.error}${COLORS.RESET}`);
  }
  process.exit(1);
}
