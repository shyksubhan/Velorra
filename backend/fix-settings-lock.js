const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /style\.innerHTML = '\.cost-cell, \.profit-col \{ display: none !important; \}';/;
const newCode = `style.innerHTML = \`
      .cost-cell, .profit-col { display: none !important; }
      #page-settings .settings-section:not(#my-profile-section) {
          position: relative;
          pointer-events: none;
          opacity: 0.5;
      }
      #page-settings .settings-section:not(#my-profile-section)::after {
          content: "\\f023 Access Denied";
          font-family: "Font Awesome 6 Free";
          font-weight: 900;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.5rem;
          color: var(--muted);
          background: var(--bg);
          padding: 15px 30px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          border: 1px solid var(--border);
          z-index: 10;
      }
    \`;`;

html = html.replace(regex, newCode);
fs.writeFileSync('admin/index.html', html);
console.log('Added CSS locks for settings sections');
