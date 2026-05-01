const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We want to replace '$' with '₹' where it represents currency.
      // Cases:
      // 1. In JSX text: >$50< or >${value}< -> >₹50< or >₹{value}<
      // 2. In template literals: \`... $${value} ...\` -> \`... ₹${value} ...\`
      // 3. Inside curly braces: {'$'} -> {'₹'}
      
      // Let's replace `$${` with `₹${`
      content = content.replace(/\$\$\{/g, '₹${');
      
      // Let's replace `>$` with `>₹`
      content = content.replace(/>\$/g, '>₹');
      
      // Let's replace `'$'` with `'₹'`
      content = content.replace(/'\$'/g, "'₹'");
      
      // Let's replace `"$"` with `"₹"`
      content = content.replace(/"\$"/g, '"₹"');

      // Let's replace `\$` followed by a number
      content = content.replace(/\$([0-9])/g, '₹$1');

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
