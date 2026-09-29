const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /function applyRolePermissions\(role\) \{[\s\S]*?\/\* Investor — 100% read-only/;
const newCode = `function applyRolePermissions(role) {
    const existingStyle = document.getElementById('investor-styles');
    if (existingStyle) existingStyle.remove();

    const isSupportStaff = role === 'supervisor' || role === 'support_staff' || role === 'Support Staff';

    /* Super Admin & CEO — sees everything */
    if (['ceo', 'super_admin'].includes(role)) {
      document.getElementById('activity-btn').style.display = 'inline-flex';
      document.getElementById('nav-spendings').style.display = 'flex';
      document.getElementById('card-spendings').style.display = 'flex';
      return;
    }

    /* Hide Add User button for non-super admins */
    document.getElementById('add-user-btn').style.display = 'none';

    /* Admin — hide earnings stats + Excel export buttons */
    if (role === 'admin') {
      document.getElementById('nav-settings')?.style.setProperty('display', 'none');
      document.getElementById('nav-coupons')?.style.setProperty('display', 'none');
      document.getElementById('launch-date-section')?.style.setProperty('display', 'none');
      
      const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
      if (revenueCard) revenueCard.style.display = 'none';
      const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
      if (profitCard) profitCard.style.display = 'none';
      const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
      if (totalProfitCard) totalProfitCard.style.display = 'none';

      document.querySelectorAll('[onclick*="exportExcel"]').forEach(btn => btn.style.display = 'none');
      document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');
      document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
      document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
      document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');
    }

    /* Support Staff — restrict to only Orders, Messages, Products */
    if (isSupportStaff) {
      ['nav-dashboard','nav-subscribers','nav-roles','nav-settings','nav-coupons','nav-spendings','nav-invoices','nav-abandoned','nav-live','nav-reviews'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      const socBtn = document.getElementById('add-social-order-btn');
      if (socBtn) socBtn.style.display = 'none';

      const revenueCard = document.getElementById('s-revenue')?.closest('.stat-card');
      if (revenueCard) revenueCard.style.display = 'none';
      const profitCard = document.getElementById('s-profit')?.closest('.stat-card');
      if (profitCard) profitCard.style.display = 'none';
      const totalProfitCard = document.getElementById('s-total-profit')?.closest('.stat-card');
      if (totalProfitCard) totalProfitCard.style.display = 'none';

      document.querySelectorAll('.cost-cell, .profit-col').forEach(el => el.style.display = 'none');
      document.getElementById('lifetime-earnings-wrap')?.style.setProperty('display', 'none');
      document.getElementById('daily-statements-wrap')?.style.setProperty('display', 'none');
      document.getElementById('monthly-statements-wrap')?.style.setProperty('display', 'none');

      /* Redirect to orders page since dashboard is hidden */
      showPage('orders');
    }

    /* Investor — 100% read-only`;

html = html.replace(/function applyRolePermissions\(role\) \{[\s\S]*?\/\* Investor ?" 100% read-only/, newCode);
fs.writeFileSync('admin/index.html', html);
console.log('Fixed applyRolePermissions completely');
