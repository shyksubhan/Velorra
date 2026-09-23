const fs = require('fs');

let html = fs.readFileSync('backend/admin/index.html', 'utf8');

// 1. Add multiple attribute to the input
html = html.replace(
  '<input type="file" id="highlight-upload" accept="image/*" style="display:none;" onchange="uploadHighlight(this)" />',
  '<input type="file" id="highlight-upload" accept="image/*" multiple style="display:none;" onchange="uploadHighlight(this)" />'
);

// 2. Replace the uploadHighlight function
const oldFunc = `async function uploadHighlight(input) {
    const file = input.files?.[0];
    if (!file) return;
    const status = document.getElementById("hl-status");
    status.innerText = "Uploading image...";
    try {
      const resImg = await uploadFileToServer(file);
      const resHl = await apiFetch("/admin/highlights", {
        method: "POST",
        body: JSON.stringify({ url: resImg.url })
      });
      if (resHl.ok) {
        toast("Highlight added!", "success");
        loadHighlights();
      } else {
        toast("Failed to add highlight", "error");
      }
    } catch(e) {
      toast("Error uploading", "error");
    }
    status.innerText = "";
    input.value = "";
  }`;

const newFunc = `async function uploadHighlight(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    const status = document.getElementById("hl-status");
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      status.innerText = \`Uploading image \${i + 1} of \${files.length}...\`;
      try {
        const resImg = await uploadFileToServer(file);
        const resHl = await apiFetch("/admin/highlights", {
          method: "POST",
          body: JSON.stringify({ url: resImg.url })
        });
        if (resHl.ok) {
          successCount++;
        } else {
          toast(\`Failed to add highlight \${i+1}\`, "error");
        }
      } catch(e) {
        toast(\`Error uploading image \${i+1}\`, "error");
      }
    }
    
    if (successCount > 0) {
      toast(\`\${successCount} highlight(s) added!\`, "success");
      loadHighlights();
    }
    
    status.innerText = "";
    input.value = "";
  }`;

html = html.replace(oldFunc, newFunc);

fs.writeFileSync('backend/admin/index.html', html, 'utf8');
console.log("Updated backend/admin/index.html");
