async function fetchOrders() {
    try {
        const res = await fetch('http://localhost:5001/api/social-orders?status=Pending', {
            headers: { 'Authorization': 'Bearer placeholder' }
        });
        const data = await res.json();
        console.log("Filtered length:", data.orders ? data.orders.length : data);
    } catch(e) {
        console.error(e);
    }
}
fetchOrders();
