
import { db } from '../db';
import { getInstallmentAmount } from './logicService';
import { generateMagicLink } from './authService';

/**
 * Helper to check if the current device is mobile
 */
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function generateUPILink(upiId: string, amount: number, note: string) {
  return `upi://pay?pa=${upiId}&pn=GTSChit&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

/**
 * Sends a WhatsApp message using a strict format required by WhatsApp API.
 * Prepends 91 for Indian numbers.
 */
export function sendWhatsAppMessage(mobile: string, message: string) {
  const digits = mobile.replace(/\D/g, '');
  const tenDigits = digits.slice(-10);

  if (tenDigits.length !== 10) {
    alert(`Invalid Mobile Number: "${mobile}". WhatsApp requires a 10-digit mobile number.`);
    return;
  }

  const encodedMsg = encodeURIComponent(message);
  const baseUrl = 'https://wa.me';
  const url = `${baseUrl}/91${tenDigits}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

/**
 * UPDATED: WhatsApp Payment Reminder with Secure Auto-Login Ledger Link.
 * Logic: Securely embeds credentials in a Magic Link. Does NOT show plain User ID/Password.
 */
export function sendPaymentLink(upiId: string, mobile: string, name: string, chitName: string, monthNo: number, amount: number, memberId: string) {
  const magicLink = generateMagicLink(memberId, mobile);
  
  const message = `Hello ${name},
  
A payment reminder for ₹${amount.toLocaleString()} is due for Month ${monthNo} of the ${chitName} chit.

Please click the secure link below to view your details and pay directly:
${magicLink}

Thank you,
Bhadrakali Chits Manager`;
  
  sendWhatsAppMessage(mobile, message);
}

/**
 * Receipts: Reverted to original logic WITHOUT magic links as requested.
 */
export function sendReceipt(chitGroupId: string, memberId: string, mobile: string, name: string, chitName: string, monthNo: number, amount: number) {
  const upcomingDues = [];
  const chit = db.getChits().find(c => c.chitGroupId === chitGroupId);
  if (chit) {
    for (let i = 1; i <= 2; i++) {
      const nextMonth = monthNo + i;
      if (nextMonth <= chit.totalMonths) {
        const dueAmt = getInstallmentAmount(chitGroupId, memberId, nextMonth);
        upcomingDues.push(`Month ${nextMonth}: ₹${dueAmt.toLocaleString()}`);
      }
    }
  }

  let message = `Payment Received: ₹${amount.toLocaleString()}\nChit: ${chitName}\nMonth: ${monthNo}.\n\nThank you for your payment.`;
  
  if (upcomingDues.length > 0) {
    message += `\n\nUpcoming Installments:\n${upcomingDues.join('\n')}`;
  }
  
  sendWhatsAppMessage(mobile, message);
}
