// utils/email/templates/payment-success.template.js - Payment success email template

const base = require('./base.template');

/**
 * Generate HTML for payment success email
 * @param {Object} data - Template data
 * @param {string} data.merchantName - Merchant's business name
 * @param {number} data.amount - Total payment amount
 * @param {number} data.merchantAmount - Amount received by merchant
 * @param {number} data.coinleyFee - Platform fee amount
 * @param {string} data.currency - Token symbol (e.g., 'USDT')
 * @param {string} data.networkName - Blockchain network name
 * @param {string} data.transactionHash - Blockchain transaction hash
 * @param {string} data.explorerUrl - Blockchain explorer URL for transaction
 * @param {string} data.dashboardUrl - URL to merchant dashboard
 * @param {string} data.paymentId - Payment ID
 * @returns {string} HTML content for the email
 */
const generateHtml = (data) => {
  const {
    merchantName,
    amount,
    merchantAmount,
    coinleyFee,
    currency,
    networkName,
    transactionHash,
    explorerUrl,
    dashboardUrl,
    paymentId
  } = data;

  const content = `
${base.successBanner('Transaction Confirmed!!', `💰 Ding! ${merchantName} has a new order totaling $${parseFloat(amount).toFixed(2)}`)}

<tr>
  <td style="padding: 30px;" class="content-padding">
    <!-- Greeting -->
    <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 700; color: #333333;">Hello ${merchantName},</h3>

    <p style="margin: 0 0 25px; font-size: 15px; line-height: 1.6; color: #555555;">
      Good news, you just got paid. Your payment of ${parseFloat(amount).toFixed(2)} ${currency} has been successfully verified and settled on-chain. Everything looks great on our end, and the funds are now available in your wallet.
    </p>

    <!-- Payment Details Section -->
    <h4 style="margin: 0 0 15px; font-size: 16px; font-weight: 700; color: #333333;">Payment Details</h4>

    <table style="width: 100%; border-collapse: collapse;" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 12px 0; font-size: 14px; color: #666666; border-bottom: 1px solid #f0f0f0;">Amount Received</td>
        <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: ${base.BRAND.primary}; text-align: right; border-bottom: 1px solid #f0f0f0;">
          ${parseFloat(amount).toFixed(2)} ${currency}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 14px; color: #666666; border-bottom: 1px solid #f0f0f0;">Platform Fee:</td>
        <td style="padding: 12px 0; font-size: 14px; color: #333333; text-align: right; border-bottom: 1px solid #f0f0f0;">
          ${coinleyFee.toFixed(6)} ${currency}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 14px; color: #666666; border-bottom: 1px solid #f0f0f0;">Network</td>
        <td style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #333333; text-align: right; border-bottom: 1px solid #f0f0f0;">
          ${networkName || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 14px; color: #666666; border-bottom: 1px solid #f0f0f0;">Payment ID</td>
        <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #333333; text-align: right; border-bottom: 1px solid #f0f0f0; font-family: monospace;">
          ${paymentId}
        </td>
      </tr>
    </table>

    <!-- Transaction Hash Box -->
    <div style="margin: 20px 0; padding: 15px 20px; background-color: #FEF9E7; border: 1px solid #F4D03F; border-radius: 8px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #9A7D0A;">
        Transaction Hash
      </p>
      <p style="margin: 0; font-size: 12px; color: #9A7D0A; word-break: break-all; font-family: monospace;">
        ${transactionHash}
      </p>
    </div>

    <!-- Message -->
    <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      No action is needed. Just keep doing what you do best, we will keep making sure your crypto payments flow smoothly and securely to your wallet.
    </p>

    <p style="margin: 0 0 25px; font-size: 14px; color: #555555;">
      Always here when you need us.
    </p>

    <p style="margin: 0 0 5px; font-size: 14px; color: #555555;">Warmly,</p>
    <p style="margin: 0 0 30px; font-size: 14px; font-weight: 600; color: #333333;">The Coinley Team</p>

    <!-- Action Buttons -->
    <table style="width: 100%;" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right: 10px; width: 50%;">
          <a href="${explorerUrl}" target="_blank" style="display: block; padding: 14px 20px; background-color: ${base.BRAND.primary}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; text-align: center;">
            View on Explorer
          </a>
        </td>
        <td style="padding-left: 10px; width: 50%;">
          <a href="${dashboardUrl}" target="_blank" style="display: block; padding: 14px 20px; background-color: #ffffff; color: #333333; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0;">
            Go to my Dashboard
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

  return base.wrapHtml({
    title: 'Transaction Confirmed - Coinley',
    content,
    preheader: `Payment received: ${parseFloat(amount).toFixed(2)} ${currency} on ${networkName}`
  });
};

/**
 * Generate plain text version for payment success email
 * @param {Object} data - Template data
 * @returns {string} Plain text content for the email
 */
const generateText = (data) => {
  const {
    amount,
    merchantAmount,
    currency,
    networkName,
    transactionHash,
    dashboardUrl
  } = data;

  return `Payment Received!

Amount: ${merchantAmount.toFixed(6)} ${currency}
Network: ${networkName}
Transaction Hash: ${transactionHash}

View your dashboard: ${dashboardUrl}

The Coinley Team`;
};

/**
 * Generate email subject
 * @param {Object} data - Template data
 * @param {number} data.amount - Total payment amount
 * @param {string} data.currency - Token symbol
 * @returns {string} Email subject
 */
const getSubject = (data) => `Transaction Confirmed - ${parseFloat(data.amount).toFixed(2)} ${data.currency}`;

module.exports = {
  generateHtml,
  generateText,
  getSubject
};
