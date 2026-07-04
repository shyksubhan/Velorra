const API = 'http://localhost:3001/api';

async function testActivityTracking() {
  // 1. Login
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin' }) // assuming default
  });
  let data = await res.json();
  const token = data.token;
  if (!token) {
    console.error("Login failed:", data);
    return;
  }
  
  console.log("Logged in!");
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Create Social Order
  res = await fetch(`${API}/social-orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Test Social Customer',
      source: 'instagram',
      total: 1000,
      paymentMethod: 'cod',
      items: [{ name: 'Test Product', price: 1000, qty: 1 }]
    })
  });
  console.log("Social Order:", await res.json());

  // 3. Create Product
  res = await fetch(`${API}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Test Product ' + Date.now(),
      category: 'watches',
      price: 500,
      priceOld: 1000,
      description: 'Test product for activity log',
    })
  });
  let pData = await res.json();
  console.log("Create Product:", pData);
  let pId = pData.product?.id || pData.product?.slug;
  if (!pId && pData.product) pId = pData.product.id || pData.product.slug;
  if(!pId) console.log("Product ID missing");

  // 4. Update Product
  if(pId) {
      res = await fetch(`${API}/products/${pId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ price: 600 })
      });
      console.log("Update Product:", await res.json());

      // 5. Delete Product
      res = await fetch(`${API}/products/${pId}`, {
        method: 'DELETE',
        headers
      });
      console.log("Delete Product:", await res.json());
  }

  // 6. Generate Coupon
  const ccode = 'TESTCOUPON' + Date.now();
  res = await fetch(`${API}/coupons`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: ccode,
      type: 'fixed',
      value: 100
    })
  });
  console.log("Generate Coupon:", await res.json());

  // Fetch activities
  res = await fetch(`${API}/admin/activity-logs?limit=10`, {
    method: 'GET',
    headers
  });
  const activities = await res.json();
  console.log("\n--- RECENT ACTIVITIES ---");
  console.log(JSON.stringify(activities, null, 2));
}

testActivityTracking();
