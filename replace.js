const fs = require('fs');
let code = fs.readFileSync('src/extension.ts', 'utf8');
code = code.replace(/\[Connect AI\]/g, '[ARON AI]').replace(/\[Connect AI Bridge\]/g, '[ARON AI Bridge]');
fs.writeFileSync('src/extension.ts', code, 'utf8');
