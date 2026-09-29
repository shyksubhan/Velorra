const fs = require('fs');
let code = fs.readFileSync('routes/coupons.js', 'utf8');

// The file uses requireRole. We want to switch it to requireAdmin.
code = code.replace(/const \{ requireRole \}  = require\('\.\.\/middleware\/auth'\);/, "const { requireRole, requireAdmin } = require('../middleware/auth');");

code = code.replace(/requireRole\('super_admin'\)/g, "requireAdmin");

fs.writeFileSync('routes/coupons.js', code);
console.log('Fixed coupons routes permissions');
