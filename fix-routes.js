const fs = require('fs');
let serverJS = fs.readFileSync('backend/server.js', 'utf8');

// 1. Extract the Highlights code
const highlightsCodeRegex = /\/\* \?\? GET \/api\/highlights \?\? \*\/[\s\S]*?\} catch\(e\) \{\}\n\s+\}\n\s+\}\);\n/g;

let highlightsMatch = serverJS.match(highlightsCodeRegex);
if (!highlightsMatch) {
  // try broader regex if it fails
  console.log("Could not find highlights block using regex 1. Trying broader search...");
  const fallbackRegex = /app\.get\('\/api\/highlights'[\s\S]*?\}\);\n/g;
  highlightsMatch = serverJS.match(fallbackRegex);
}

if (highlightsMatch) {
  const highlightsCode = highlightsMatch[0];
  // 2. Remove it from the current location
  serverJS = serverJS.replace(highlightsCode, '');
  
  // 3. Inject it before Catch-all
  const catchAllComment = '/* 🧲 Catch-all 🧲 */';
  const catchAllAlt = "/* Catch-all"; // in case emoji is corrupted
  
  const injectLocation = serverJS.indexOf(catchAllComment) !== -1 ? catchAllComment : (serverJS.indexOf(catchAllAlt) !== -1 ? catchAllAlt : "app.get('*', (req, res) => {");
  
  if (injectLocation !== -1) {
    serverJS = serverJS.replace(injectLocation, `/* --- HIGHLIGHTS API --- */\n${highlightsCode}\n\n${injectLocation}`);
    fs.writeFileSync('backend/server.js', serverJS, 'utf8');
    console.log("Successfully moved highlights routes before catch-all!");
  } else {
    console.log("Could not find catch-all injection point.");
  }
} else {
  console.log("Could not extract highlights code from server.js");
}
