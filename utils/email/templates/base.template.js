// utils/email/templates/base.template.js - Base HTML template wrapper

/**
 * Coinley brand colors
 */
const BRAND = {
  primary: '#7042D2',
  primaryHover: '#5a35a8',
  success: '#10b981',
  successGradient: 'linear-gradient(135deg, #7042D2 0%, #8B5CF6 100%)',
  warning: '#ffc107',
  warningBg: '#FEF9E7',
  warningBorder: '#F4D03F',
  warningText: '#9A7D0A',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#9ca3af',
  background: '#f8f9fc',
  white: '#ffffff',
  border: '#f0f0f0',
  inviteBox: '#EEF3FB'
};

/**
 * Generate the base HTML wrapper for all emails
 * @param {Object} options - Template options
 * @param {string} options.title - Email title (for HTML head)
 * @param {string} options.content - Main content HTML
 * @param {string} [options.preheader] - Preview text shown in email clients
 * @returns {string} Complete HTML email
 */
const wrapHtml = ({ title, content, preheader = '' }) => {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelPerInch>96</o:PixelPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 10px !important;
      }
      .content-padding {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${BRAND.background}; color: ${BRAND.text};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND.background}; width: 100%; margin: 0 auto;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: ${BRAND.white}; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 20px 30px; text-align: left; border-bottom: 1px solid ${BRAND.border};">
              <img src="https://coinley.io/logo.png" alt="Coinley" style="height: 32px; width: auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
              <span style="display: none; align-items: center; font-size: 24px; font-weight: 700; color: ${BRAND.primary};">
                <span style="margin-right: 8px;">❄</span>coinley
              </span>
            </td>
          </tr>

          <!-- Content -->
          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: ${BRAND.background}; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: ${BRAND.textLight};">
                &copy; ${currentYear} Coinley. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 14px; color: ${BRAND.textLight};">
                If you have any questions, contact us at <a href="mailto:info@coinley.io" style="color: ${BRAND.primary}; text-decoration: none;">info@coinley.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generate a primary CTA button
 * @param {string} url - Button URL
 * @param {string} text - Button text
 * @returns {string} Button HTML
 */
const button = (url, text) => `
<p style="margin: 30px 0; text-align: center;">
  <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND.primary}; color: ${BRAND.white}; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 4px; text-align: center;">${text}</a>
</p>`;

/**
 * Generate a secondary CTA button
 * @param {string} url - Button URL
 * @param {string} text - Button text
 * @returns {string} Button HTML
 */
const secondaryButton = (url, text) => `
<a href="${url}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #f3f4f6; color: ${BRAND.text}; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 4px;">${text}</a>`;

/**
 * Generate a warning/note box
 * @param {string} title - Box title
 * @param {string} message - Box message
 * @returns {string} Warning box HTML
 */
const warningBox = (title, message) => `
<div style="background-color: ${BRAND.warningBg}; border: 1px solid ${BRAND.warningBorder}; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; color: ${BRAND.warningText};">
  <strong>${title}</strong> ${message}
</div>`;

/**
 * Generate an info/highlight box
 * @param {string} content - Box content HTML
 * @returns {string} Info box HTML
 */
const infoBox = (content) => `
<div style="background-color: ${BRAND.inviteBox}; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
  ${content}
</div>`;

/**
 * Generate a success banner with purple gradient and checkmark
 * @param {string} title - Banner title
 * @param {string} subtitle - Banner subtitle
 * @returns {string} Success banner HTML
 */
const successBanner = (title, subtitle) => `
<tr>
  <td style="padding: 40px 30px; background: linear-gradient(135deg, #7042D2 0%, #8B5CF6 50%, #7042D2 100%); text-align: center; position: relative;">
    <!-- Checkmark circle -->
    <div style="width: 50px; height: 50px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
      <span style="color: #ffffff; font-size: 24px;">✓</span>
    </div>
    <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: ${BRAND.white};">${title}</h2>
    ${subtitle ? `<p style="margin: 10px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">${subtitle}</p>` : ''}
  </td>
</tr>`;

/**
 * Standard paragraph style
 */
const paragraph = (text) => `
<p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: ${BRAND.text};">${text}</p>`;

/**
 * Standard heading style
 */
const heading = (text) => `
<h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #000000;">${text}</h2>`;

/**
 * Subheading style
 */
const subheading = (text) => `
<h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #000000;">${text}</h3>`;

/**
 * Link in brand color
 */
const link = (url, text) => `<a href="${url}" style="color: ${BRAND.primary}; text-decoration: none;">${text}</a>`;

/**
 * Fallback link text for when buttons don't work
 */
const fallbackLink = (url) => `
<p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; word-break: break-all; color: ${BRAND.primary};">
  ${url}
</p>`;

/**
 * Generate OTP display box
 * @param {string} otp - The OTP code
 * @returns {string} OTP box HTML
 */
const otpBox = (otp) => `
<div style="margin: 30px auto; width: 200px; padding: 15px 0; background-color: #f2f2f7; border-radius: 8px; text-align: center;">
  <p style="margin: 0; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #000000;">${otp}</p>
</div>`;

module.exports = {
  BRAND,
  wrapHtml,
  button,
  secondaryButton,
  warningBox,
  infoBox,
  successBanner,
  paragraph,
  heading,
  subheading,
  link,
  fallbackLink,
  otpBox
};
