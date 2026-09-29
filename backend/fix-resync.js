const fs = require('fs');
let js = fs.readFileSync('routes/admin.js', 'utf8');

const route = `
router.post('/resync', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    if (!isFirebaseAvailable()) return res.status(503).json({ error: 'Firebase not connected.' });
    const db = getDB();
    const [ordersSnap, socialSnap, spendingsSnap, invoicesSnap, productsSnap] = await Promise.all([
      db.collection('orders').get(),
      db.collection('socialOrders').get(),
      db.collection('spendings').get(),
      db.collection('invoices').get(),
      db.collection('products').get()
    ]);
    
    store.orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    store.socialOrders = socialSnap.docs.map(d => ({ id: d.id, ...d.data(), isSocial: true }));
    store.spendings = spendingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    store.invoices = invoicesSnap.docs.map(d => d.data());
    store.products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync.' });
  }
});
`;

if (!js.includes('/resync')) {
  js = js.replace("module.exports = router;", route + "\nmodule.exports = router;");
  fs.writeFileSync('routes/admin.js', js);
  console.log('Added /resync route');
}
