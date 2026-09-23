const fs = require('fs');
let serverJS = fs.readFileSync('backend/server.js', 'utf8');

const postRegex = /const \{ requireRole, requireAdmin \} = require\('\.\/middleware\/auth'\);\s+app\.post\('\/api\/admin\/highlights'[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to add highlight' \}\);\s+\}\s+\}\);/g;

const deleteRegex = /app\.delete\('\/api\/admin\/highlights\/:id'[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to delete highlight' \}\);\s+\}\s+\}\);/g;

let postMatch = serverJS.match(postRegex);
let deleteMatch = serverJS.match(deleteRegex);

let codeToMove = '';

if (postMatch) {
  codeToMove += postMatch[0] + '\n\n';
  serverJS = serverJS.replace(postMatch[0], '');
}

if (deleteMatch) {
  codeToMove += deleteMatch[0] + '\n\n';
  serverJS = serverJS.replace(deleteMatch[0], '');
}

if (codeToMove) {
  serverJS = serverJS.replace('/* --- HIGHLIGHTS API --- */\n', '/* --- HIGHLIGHTS API --- */\n' + codeToMove);
  fs.writeFileSync('backend/server.js', serverJS, 'utf8');
  console.log("Successfully moved POST and DELETE highlights routes!");
} else {
  console.log("Could not find POST or DELETE blocks.");
}
