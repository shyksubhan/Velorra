const fs = require('fs');
let html = fs.readFileSync('backend/admin/index.html', 'utf8');

const oldFunc = `async function uploadHighlight(input) {
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

const newFunc = `async function uploadHighlight(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
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
        console.error("Upload error:", e);
        toast(\`Error uploading image \${i+1}\`, "error");
      }
      // Add a small delay so we don't spam Cloudinary/Backend too hard
      await new Promise(r => setTimeout(r, 600));
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
console.log("Updated uploadHighlight with Array.from and delay");
