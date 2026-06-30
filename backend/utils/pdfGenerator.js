const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

async function buildPdf(pdfPath, invId, snapshot, liveOrder, company) {
  // Use snapshot for items and totals, but liveOrder for statuses
  const order = snapshot;
  const statusOrder = liveOrder || snapshot;

  let logoBuffer = null;
  let localSvgLogo = null;
  try {
    const localLogoPath = path.join(__dirname, '..', '..', 'images', 'logo.svg');
    if (fs.existsSync(localLogoPath)) {
      localSvgLogo = fs.readFileSync(localLogoPath, 'utf8');
    }
  } catch(e) {}

  if (!localSvgLogo && company.logoUrl && company.logoUrl.startsWith('http')) {
    try {
      const fetch = require('node:http');
      const https = require('node:https');
      const client = company.logoUrl.startsWith('https') ? https : fetch;
      logoBuffer = await new Promise((resolve) => {
        client.get(company.logoUrl, (res) => {
          if (res.statusCode !== 200) return resolve(null);
          const data = [];
          res.on('data', chunk => data.push(chunk));
          res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', () => resolve(null));
      });
    } catch (err) {
      console.error('Failed to fetch remote logo:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Colors
    const C_BLACK = '#0a0a0a';
    const C_GOLD = '#b8883a';
    const C_CREAM = '#fdfbf7';
    const C_TEXT = '#333333';
    const C_MUTED = '#888888';
    const C_BORDER = '#eaeaea';

    // --- HEADER ---
    let startY = 50;
    if (localSvgLogo) {
      try {
        SVGtoPDF(doc, localSvgLogo, 50, startY - 10, { width: 140, height: 50, preserveAspectRatio: 'xMinYMin meet' });
      } catch(e) {
        doc.fontSize(24).fillColor(C_GOLD).font('Helvetica-Bold').text(company.name, 50, startY);
      }
    } else if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, startY - 10, { height: 40 });
      } catch(e) {
        doc.fontSize(24).fillColor(C_GOLD).font('Helvetica-Bold').text(company.name, 50, startY);
      }
    } else {
      doc.fontSize(24).fillColor(C_GOLD).font('Helvetica-Bold').text(company.name, 50, startY);
    }

    // Company Details (under logo)
    doc.fontSize(8).fillColor(C_MUTED).font('Helvetica');
    doc.text(company.website || 'velorrajewelry.com', 50, startY + 40);
    doc.text(company.email || 'support@velorrajewelry.com', 50, startY + 52);
    doc.text(company.phone || '+92 300 1112233', 50, startY + 64);
    
    // Divider
    doc.moveTo(50, startY + 85).lineTo(545, startY + 85).stroke(C_GOLD);

    // Company Info (Right aligned)
    doc.fontSize(24).fillColor(C_BLACK).font('Helvetica-Bold').text('INVOICE', 350, startY, { align: 'right', width: 195 });
    
    const isCod = order.paymentMethod === 'cod';
    if (isCod) {
       doc.rect(470, startY + 28, 75, 14).fillAndStroke(C_BLACK, C_BLACK);
       doc.fontSize(8).fillColor(C_GOLD).font('Helvetica-Bold').text('COD ORDER', 470, startY + 31, { align: 'center', width: 75 });
    }

    doc.fontSize(9).fillColor(C_TEXT).font('Helvetica');
    doc.text(`Invoice / Order No:   ${invId}`, 350, startY + 55, { align: 'right', width: 195 });
    doc.text(`Invoice Date:   ${new Date().toLocaleDateString()}`, 350, startY + 70, { align: 'right', width: 195 });
    doc.text(`Payment Method:   ${isCod ? 'Cash on Delivery (COD)' : 'Online / Card'}`, 350, startY + 85, { align: 'right', width: 195 });
    doc.text(`Invoice Status:   Generated`, 350, startY + 100, { align: 'right', width: 195 });

    // BILL TO (Left aligned styled card)
    let billY = startY + 110;
    doc.rect(50, billY, 250, 85).fillAndStroke(C_CREAM, C_BORDER);
    doc.fillColor(C_BLACK).fontSize(9).font('Helvetica-Bold').text('BILL TO', 65, billY + 15);
    doc.fontSize(9).font('Helvetica').fillColor(C_TEXT);
    doc.text(`${order.delivery?.fname || ''} ${order.delivery?.lname || ''}`, 65, billY + 30);
    doc.fillColor(C_MUTED);
    doc.text(order.delivery?.phone || '', 65, billY + 45);
    doc.text(order.delivery?.email || '', 65, billY + 58);
    doc.text(`${order.delivery?.address || ''}, ${order.delivery?.city || ''}`, 65, billY + 70);

    // --- TABLE HEADER ---
    let y = billY + 115;
    doc.rect(50, y, 495, 25).fillAndStroke(C_CREAM, C_CREAM);
    doc.fillColor(C_BLACK).font('Helvetica-Bold').fontSize(9);
    doc.text('ITEMS', 60, y + 8);
    doc.text('PRICE', 300, y + 8, { width: 80, align: 'right' });
    doc.text('QTY', 390, y + 8, { width: 50, align: 'center' });
    doc.text('TOTAL', 450, y + 8, { width: 85, align: 'right' });
    
    y += 25;

    // --- TABLE ROWS ---
    doc.font('Helvetica').fillColor(C_TEXT);
    (order.items || []).forEach(item => {
      const itemTotal = (item.price * item.qty);
      doc.rect(50, y, 495, 40).fillAndStroke('#ffffff', '#ffffff');
      doc.fillColor(C_TEXT);
      doc.text(item.name, 60, y + 10);
      doc.fillColor(C_MUTED).fontSize(8).text(`SKU: ${item.sku || 'N/A'}`, 60, y + 22);
      doc.fillColor(C_TEXT).fontSize(9);
      doc.text(`PKR ${item.price.toLocaleString()}`, 300, y + 15, { width: 80, align: 'right' });
      doc.text(item.qty.toString(), 390, y + 15, { width: 50, align: 'center' });
      doc.text(`PKR ${itemTotal.toLocaleString()}`, 450, y + 15, { width: 85, align: 'right' });
      y += 40;
      doc.moveTo(50, y).lineTo(545, y).stroke(C_BORDER);
    });
    y += 15;

    // --- TOTALS SUMMARY CARD ---
    doc.rect(340, y, 205, 120).fillAndStroke(C_CREAM, C_BORDER);
    let ty = y + 15;
    
    doc.fontSize(9).fillColor(C_TEXT).font('Helvetica');
    doc.text('Subtotal', 355, ty, { width: 80, align: 'left' });
    doc.text(`PKR ${(order.subtotal || 0).toLocaleString()}`, 445, ty, { width: 85, align: 'right' });
    ty += 20;

    if (order.discount > 0) {
      doc.text('Discount', 355, ty, { width: 80, align: 'left' });
      doc.text(`- PKR ${(order.discount).toLocaleString()}`, 445, ty, { width: 85, align: 'right' });
      ty += 20;
    }

    if ((order.deliveryFee || 0) > 0) {
      doc.text('Delivery Fee', 355, ty, { width: 80, align: 'left' });
      doc.text(`PKR ${(order.deliveryFee || 0).toLocaleString()}`, 445, ty, { width: 85, align: 'right' });
      ty += 20;
    }

    doc.moveTo(355, ty).lineTo(530, ty).stroke(C_BORDER);
    ty += 15;

    doc.fontSize(11).font('Helvetica-Bold').fillColor(C_BLACK);
    doc.text('Grand Total', 355, ty, { width: 80, align: 'left' });
    doc.text(`PKR ${(order.total || 0).toLocaleString()}`, 445, ty, { width: 85, align: 'right' });
    y += 140;

    // --- ADVANCE & COD BOX ---
    const advancePaid = Number(statusOrder.advanceAmount) || Number(order.advanceAmount) || 0;
    const remaining = Math.max(0, (order.total || 0) - advancePaid);
    
    doc.rect(50, y, 280, 85).fillAndStroke(C_CREAM, C_BORDER);
    doc.fillColor(C_BLACK).fontSize(9).font('Helvetica-Bold');
    doc.text('Advance Paid', 65, y + 15);
    doc.text(`PKR ${advancePaid.toLocaleString()}`, 200, y + 15, { width: 110, align: 'left' });
    doc.font('Helvetica').fillColor(C_MUTED);
    doc.text('Advance Method', 65, y + 30);
    doc.text(statusOrder.advanceMethod || order.advanceMethod || '—', 200, y + 30, { width: 110, align: 'left' });
    doc.text('Reference No', 65, y + 45);
    doc.text(statusOrder.advanceRef || order.advanceRef || '—', 200, y + 45, { width: 110, align: 'left' });
    doc.text('Advance Date', 65, y + 60);
    const advDate = statusOrder.advanceDate || order.advanceDate;
    doc.text(advDate ? new Date(advDate).toLocaleDateString() : '—', 200, y + 60, { width: 110, align: 'left' });

    // Highlight Box (Rounded)
    doc.roundedRect(340, y, 205, 85, 4).fillAndStroke(C_BLACK, C_GOLD);
    doc.fillColor(C_GOLD).font('Helvetica').fontSize(10);
    doc.text(isCod ? 'REMAINING TO COLLECT (COD)' : 'REMAINING BALANCE', 340, y + 25, { align: 'center', width: 205 });
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff');
    doc.text(`PKR ${remaining.toLocaleString()}`, 340, y + 45, { align: 'center', width: 205 });

    y += 105;

    // --- STATUS BADGES ---
    const oStatus = statusOrder.status || 'Pending';
    const deliveryStatus = oStatus === 'Pending' ? 'Not Shipped' :
                           oStatus === 'Processing' ? 'Preparing Shipment' :
                           oStatus === 'Shipped' ? 'In Transit' :
                           oStatus === 'Delivered' ? 'Delivered' :
                           oStatus === 'Cancelled' ? 'Cancelled' : 'Not Shipped';
                           
    let pStatus = 'Unpaid';
    if (advancePaid > 0) {
      pStatus = advancePaid >= (order.total || 0) ? 'Paid' : 'Partial (Advance)';
    } else if (!isCod) {
      pStatus = 'Paid';
    }

    doc.rect(50, y, 495, 40).fillAndStroke(C_CREAM, C_CREAM);
    doc.fillColor(C_TEXT).fontSize(8).font('Helvetica-Bold');
    doc.text('Order Status', 90, y + 12);
    doc.font('Helvetica').text(oStatus, 90, y + 24);

    doc.font('Helvetica-Bold').text('Payment Status', 200, y + 12);
    doc.font('Helvetica').text(pStatus, 200, y + 24);
    
    doc.font('Helvetica-Bold').text('Advance Status', 320, y + 12);
    doc.font('Helvetica').text(statusOrder.advanceStatus || '—', 320, y + 24);

    doc.font('Helvetica-Bold').text('Delivery Status', 430, y + 12);
    doc.font('Helvetica').text(deliveryStatus, 430, y + 24);

    // --- FOOTER ---
    doc.rect(0, 780, 600, 65).fillAndStroke(C_BLACK, C_BLACK);
    doc.fillColor(C_GOLD).fontSize(9).font('Helvetica-Bold');
    doc.text(`Thank you for shopping with ${company.name}!`, 0, 795, { align: 'center', width: 600 });
    doc.fillColor('#dddddd').fontSize(8).font('Helvetica');
    doc.text(`${company.website || 'www.velorra.com'}   |   ${company.email || 'support@velorra.com'}   |   ${company.phone || '+92 300 1112233'}`, 0, 810, { align: 'center', width: 600 });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = { buildPdf };
