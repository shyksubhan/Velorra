const fs = require('fs');
const html = fs.readFileSync('admin/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const scriptContent = scriptMatch[1];
  try {
    new Function(scriptContent);
    console.log('Script is syntactically valid!');
  } catch (e) {
    console.error('Syntax error found:', e.message);
  }
} else {
  console.log('No script tag found.');
}
