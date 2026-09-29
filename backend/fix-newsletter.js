const fs = require('fs');
let code = fs.readFileSync('routes/newsletter.js', 'utf8');

code = code.replace(/const \{ requireRole \} = require\('\.\.\/middleware\/auth'\);/, "const { requireRole, requireAdmin } = require('../middleware/auth');");

code = code.replace(/requireRole\('super_admin', 'admin'\)/g, "requireAdmin");

fs.writeFileSync('routes/newsletter.js', code);
console.log('Fixed newsletter routes permissions');
