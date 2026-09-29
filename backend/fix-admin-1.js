const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Completely wipe and rewrite applyRolePermissions
const startMarker = "function applyRolePermissions(role) {";
const endMarker = "function isSupportStaff() {"; // wait, I'll define isSupportStaff globally

const cleanHtml = html.replace(/function applyRolePermissions\(role\) \{[\s\S]*?\/\* \?\?\?\?\?\?\?\?\?\?\?\?\?\?\?\?\?\? USERS & ROLES/g, 
`function isSupportStaff() {
  const role = currentUser?.role || '';
  return role === 'supervisor' || role === 'support_staff' || role.toLowerCase().trim().replace(/_/g, ' ') === 'support staff';
}

function applyRolePermissions(role) {
  const existingStyle = document.getElementById('investor-styles');
  if (existingStyle) existingStyle.remove();

  if (!document.getElementById('support-staff-styles')) {
    const style = document.createElement('style');
    style.id = 'support-staff-styles';
    style.innerHTML = '.cost-cell, .profit-col { display: none !important; }';
    document.head.appendChild(style);
  }
  document.getElementById('support-staff-styles').disabled = !isSupportStaff();

  /* Super Admin & CEO sees everything */
  if (['ceo', 'super_admin'].includes(role)) {
    document.getElementById('activity-btn')?.style.setProperty('display', 'inline-flex');
    document.getElementById('nav-spendings')?.style.setProperty('display', 'flex');
    document.getElementById('card-spendings')?.style.setProperty('display', 'flex');
    return;
  }

  /* Non-CEO/SuperAdmins don't see the Add User button */
  document.getElementById('add-user-btn')?.style.setProperty('display', 'none');

  /* Admin */
  if (role === 'admin') {
    document.getElementById('nav-settings')?.style.setProperty('display', 'none');
    document.getElementById('nav-coupons')?.style.setProperty('display', 'none');
    document.getElementById('launch-date-section')?.style.setProperty('display', 'none');
    document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
    document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
    document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');
    document.querySelectorAll('[onclick*="exportExcel"]').forEach(btn => btn.style.display = 'none');
    document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');
    const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
    if (revenueCard) revenueCard.style.display = 'none';
    const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
    if (profitCard) profitCard.style.display = 'none';
    const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
    if (totalProfitCard) totalProfitCard.style.display = 'none';
  }

  /* Support Staff */
  if (isSupportStaff()) {
    const socBtn = document.getElementById('add-social-order-btn');
    if (socBtn) socBtn.style.display = 'none';
    
    document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
    document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
    document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');

    const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
    if (revenueCard) revenueCard.style.display = 'none';
    const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
    if (profitCard) profitCard.style.display = 'none';
    const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
    if (totalProfitCard) totalProfitCard.style.display = 'none';
  }

  /* Investor - 100% read-only */
  if (role === 'investor') {
    document.getElementById('nav-spendings')?.style.setProperty('display', 'flex');
    document.getElementById('card-spendings')?.style.setProperty('display', 'flex');
    const style = document.createElement('style');
    style.id = 'investor-styles';
    style.innerHTML = \`
      .action-btn, button[onclick*="delete"], button[onclick*="save"], button[onclick*="create"],
      button[onclick*="toggleUserStatus"], button[onclick*="exportExcel"],
      #add-user-btn, #add-social-order-btn, .product-actions button {
          display: none !important;
      }
      .status-select { pointer-events: none; opacity: 0.8; }
    \`;
    document.head.appendChild(style);
  }
}

/* ?????????????????? USERS & ROLES`);

fs.writeFileSync('admin/index.html', cleanHtml);
console.log('Fixed applyRolePermissions completely!');
