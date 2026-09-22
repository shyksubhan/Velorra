const fs = require('fs');
const path = require('path');
const ordersPath = path.join(__dirname, 'backend/routes/orders.js');
let ordersCode = fs.readFileSync(ordersPath, 'utf8');

if (!ordersCode.includes('autoGenerateAndEmailInvoice')) {
  ordersCode = ordersCode.replace("const { sendOrderConfirmation", "const { autoGenerateAndEmailInvoice } = require('../utils/autoInvoice');\nconst { sendOrderConfirmation");
  
  const targetOrders = "store.emit('order_status_changed', { id: req.params.id, status });";
  ordersCode = ordersCode.replace(targetOrders, targetOrders + "\n    if (status === 'Confirmed') {\n      autoGenerateAndEmailInvoice(req.params.id).catch(e => console.error(e));\n    }");
  
  fs.writeFileSync(ordersPath, ordersCode, 'utf8');
}

const socialPath = path.join(__dirname, 'backend/routes/socialOrders.js');
let socialCode = fs.readFileSync(socialPath, 'utf8');

if (!socialCode.includes('autoGenerateAndEmailInvoice')) {
  socialCode = socialCode.replace("const store            = require('../utils/store');", "const store            = require('../utils/store');\nconst { autoGenerateAndEmailInvoice } = require('../utils/autoInvoice');");
  
  const targetSocial1 = "store.emit('order_status_changed', { id: req.params.id, status });";
  socialCode = socialCode.replace(targetSocial1, targetSocial1 + "\n    if (status === 'Confirmed') {\n      autoGenerateAndEmailInvoice(req.params.id).catch(e => console.error(e));\n    }");
  
  const targetSocial2 = "store.emit('new_social_order', { id: order.id });";
  socialCode = socialCode.replace(targetSocial2, targetSocial2 + "\n    if (order.status === 'Confirmed') {\n      autoGenerateAndEmailInvoice(order.id).catch(e => console.error(e));\n    }");
  
  fs.writeFileSync(socialPath, socialCode, 'utf8');
}

console.log('Added auto-invoice hooks to orders.js and socialOrders.js');
