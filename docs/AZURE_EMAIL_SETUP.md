# Azure Communication Services Email Setup Guide

## Overview

The Coinley platform uses a **dual email provider system** for maximum reliability:

- **Primary Provider**: SendGrid
- **Fallback Provider**: Azure **Communication** Services Email

When SendGrid fails (API errors, rate limits, service outages), the system automatically falls back to Azure Communication Services to ensure critical emails are delivered.

---
****
## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Email Request                          │
│              (e.g., verification email)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Try SendGrid First  │
          │   (Primary Provider) │
          └──────────┬───────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
    SUCCESS ✅                 FAILURE ❌
         │                        │
         │                        ▼
         │              ┌──────────────────────┐
         │              │ Check Azure Config   │
         │              │  (Fallback Provider) │
         │              └──────────┬───────────┘
         │                         │
         │              ┌──────────┴────────────┐
         │              │                       │
         │         CONFIGURED              NOT CONFIGURED
         │              │                       │
         │              ▼                       ▼
         │   ┌────────────────────┐    ┌──────────────┐
         │   │  Send via Azure    │    │ Return FALSE │
         │   └────────┬───────────┘    │ (Total Fail) │
         │            │                └──────────────┘
         │    ┌───────┴────────┐
         │    │                │
         │ SUCCESS ✅       FAILURE ❌
         │    │                │
         ▼    ▼                ▼
    ┌────────────────────────────────┐
    │   Log Stats & Return Result    │
    └────────────────────────────────┘
```

---

## Benefits

✅ **High Availability** - No single point of failure for email delivery
✅ **Automatic Failover** - Seamless fallback without code changes
✅ **Monitoring** - Track fallback events via admin API
✅ **Cost Optimization** - Only pay for Azure when SendGrid fails
✅ **Zero Downtime** - Critical emails always delivered

---

## Azure Communication Services Setup

### Step 1: Create Azure Communication Services Resource

1. **Login to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Click "Create a resource"

2. **Search for "Communication Services"**
   - Click "Create"
   - Fill in the details:
     - **Resource Name**: `coinley-email-service` (or your choice)
     - **Resource Group**: Create new or use existing
     - **Data Location**: Choose region (e.g., United States)
   - Click "Review + Create" → "Create"

3. **Wait for Deployment**
   - Wait 1-2 minutes for Azure to provision the resource
   - Click "Go to resource" when ready

### Step 2: Get Connection String

1. **Navigate to Keys**
   - In your Communication Services resource
   - Click "Keys" in the left sidebar

2. **Copy Connection String**
   - Copy the **Primary connection string**
   - Format: `endpoint=https://coinley-email.communication.azure.com/;accesskey=YOUR_KEY`
   - Save this securely - you'll add it to `.env`

### Step 3: Set Up Email Communication Service

1. **Create Email Communication Service**
   - Go back to Azure Portal home
   - Click "Create a resource"
   - Search for "Email Communication Service"
   - Click "Create"

2. **Configure Email Service**
   - **Resource Name**: `coinley-email-domain`
   - **Resource Group**: Same as Communication Services
   - **Data Location**: Same region
   - Click "Review + Create" → "Create"

### Step 4: Add Email Domain

You have two options:

#### Option A: Use Azure Managed Domain (Quick Start - 5 minutes)

1. **Navigate to Email Communication Service**
   - Go to your Email Communication Service resource
   - Click "Provision domains" → "Add domain"

2. **Select "AzureManagedDomain"**
   - Click "Add"
   - Azure will create a domain like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.azurecomm.net`
   - This is ready immediately (no DNS setup needed)

3. **Get Sender Address**
   - Copy the "MailFrom" address
   - Format: `DoNotReply@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.azurecomm.net`
   - Save this - you'll use it as `AZURE_COMMUNICATION_SENDER_EMAIL`

#### Option B: Use Custom Domain (Recommended for Production)

1. **Add Custom Domain**
   - Click "Provision domains" → "Add domain"
   - Select "Custom domain"
   - Enter your domain: `coinley.io`

2. **Configure DNS Records**
   - Azure will provide TXT and DKIM records
   - Add these to your DNS provider:
     ```
     TXT record:  _dmarc.coinley.io
     CNAME:       selector1._domainkey.coinley.io
     CNAME:       selector2._domainkey.coinley.io
     ```

3. **Verify Domain**
   - Click "Verify" after adding DNS records
   - Verification can take 15-30 minutes
   - Once verified, you can use: `DoNotReply@coinley.io`

### Step 5: Connect Email to Communication Services

1. **Link the Services**
   - Go to your **Communication Services** resource (from Step 1)
   - Click "Email" → "Domains"
   - Click "Connect domain"
   - Select your Email Communication Service
   - Select the domain you provisioned
   - Click "Connect"

2. **Verify Connection**
   - You should see the domain listed under "Connected email domains"
   - Status should be "Verified"

---

## Environment Configuration

### Add to `.env` File

Open `/coinleyserver/.env` and update the Azure variables:

```bash
# Azure Communication Services Email (Fallback Provider)
AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://coinley-email.communication.azure.com/;accesskey=YOUR_ACCESS_KEY_HERE"
AZURE_COMMUNICATION_SENDER_EMAIL="DoNotReply@xxxxxxxx.azurecomm.net"
AZURE_COMMUNICATION_REPLY_TO="support@coinley.io"
```

**Important Notes:**
- `AZURE_COMMUNICATION_CONNECTION_STRING` - Get from Communication Services → Keys
- `AZURE_COMMUNICATION_SENDER_EMAIL` - Get from Email Communication Service → Domains
- `AZURE_COMMUNICATION_REPLY_TO` - Your support email (where users can reply)

### Restart Server

After updating `.env`:

```bash
cd coinleyserver
npm run dev  # or npm start
```

Check logs for:
```
✅ Azure Communication Services Email client initialized
```

---

## Testing the Fallback System

### Method 1: Temporarily Disable SendGrid

1. **Backup current SendGrid key:**
   ```bash
   # Save your current key
   echo $SENDGRID_API_KEY
   ```

2. **Set invalid SendGrid key in `.env`:**
   ```bash
   SENDGRID_API_KEY="INVALID_KEY_FOR_TESTING"
   ```

3. **Restart server and trigger an email:**
   - Try registering a new merchant
   - Or use the test script (if available)

4. **Check logs for fallback:**
   ```
   ❌ [SendGrid] Failed to send verification email: 401 Unauthorized
   🔄 [Fallback] Attempting to send verification email via Azure
   ✅ [Azure Fallback] Verification email sent successfully
   ```

5. **Restore SendGrid key:**
   ```bash
   SENDGRID_API_KEY="YOUR_REAL_KEY"
   ```

### Method 2: Use Test Script

Create a test file: `coinleyserver/scripts/test-azure-fallback.js`

```javascript
require('dotenv').config();
const emailService = require('../utils/emailService');

async function testAzureFallback() {
  console.log('Testing Azure Email Fallback...\n');

  // Temporarily break SendGrid
  const originalKey = process.env.SENDGRID_API_KEY;
  process.env.SENDGRID_API_KEY = 'INVALID_KEY';

  const testUser = {
    email: 'your-email@example.com', // Replace with your email
    firstName: 'Test',
    lastName: 'User',
  };

  try {
    const result = await emailService.sendVerificationEmail(
      testUser,
      'test-token-12345',
      'https://merchant.coinley.io'
    );

    console.log('\n✅ Test Result:', result ? 'SUCCESS' : 'FAILED');
    console.log('\n📊 Fallback Stats:');
    console.log(JSON.stringify(emailService.getFallbackStats(), null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Restore SendGrid key
    process.env.SENDGRID_API_KEY = originalKey;
  }
}

testAzureFallback();
```

Run the test:
```bash
node scripts/test-azure-fallback.js
```

---

## Monitoring

### API Endpoint

**Endpoint:** `GET /api/admin/email/status`
**Authentication:** Admin JWT token required

**Example Request:**
```bash
curl -X GET https://api.coinley.io/api/admin/email/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-11-19T10:30:00.000Z",
    "providers": {
      "sendGrid": {
        "configured": true,
        "status": "active",
        "role": "primary"
      },
      "azure": {
        "configured": true,
        "status": "active",
        "role": "fallback"
      }
    },
    "statistics": {
      "totalSendGridFailures": 3,
      "totalAzureFallbacks": 3,
      "lastFallbackTime": "2024-11-19T09:45:12.345Z",
      "fallbackSuccessRate": "100.00%"
    },
    "recommendations": [
      {
        "level": "info",
        "message": "Azure fallback has been used 3 times successfully.",
        "action": "Monitor SendGrid for recurring issues"
      }
    ]
  }
}
```

### Log Monitoring

All email events are logged with clear prefixes:

```bash
# SendGrid success
✅ [SendGrid] Verification email sent to user@example.com

# SendGrid failure + Azure fallback attempt
❌ [SendGrid] Failed to send verification email: 401 Unauthorized
🔄 [Fallback] Attempting to send verification email via Azure

# Azure fallback success
✅ [Azure Fallback] Verification email sent successfully to user@example.com

# Azure fallback failure
❌ [Azure Fallback] Failed to send verification email

# No fallback available
❌ [Fallback] Azure email not configured - email delivery failed completely
```

Use log aggregation tools (Azure Application Insights, CloudWatch, etc.) to set up alerts:
- Alert when `totalSendGridFailures > 10` in a day
- Alert when Azure fallback is used frequently
- Alert when both providers fail

---

## Cost Estimation

### SendGrid Costs (Primary)
- **Current Plan**: Check your SendGrid dashboard
- **Typical**: $0.00085 per email (after free tier)

### Azure Communication Services Costs (Fallback Only)
- **Email Sending**: $0.00025 per email
- **First 1,000 emails/month**: FREE
- **Example**: If SendGrid fails 100 times/month:
  - Cost = 100 emails × $0.00025 = **$0.025/month**

**Total Monthly Cost Impact**: Negligible (< $1/month in most scenarios)

---

## Security Best Practices

### 1. Protect Connection Strings
- Never commit `.env` to version control
- Use Azure Key Vault for production secrets
- Rotate access keys every 90 days

### 2. Monitor for Anomalies
- Set up alerts for unusual fallback patterns
- Review logs weekly for suspicious activity

### 3. Domain Authentication
- Always use custom domains in production (not Azure-managed domains)
- Configure SPF, DKIM, and DMARC records
- Monitor domain reputation

### 4. Rate Limiting
- Azure limit: 500 emails/minute (default)
- Request limit increase if needed via Azure support

---

## Troubleshooting

### Issue: Azure emails not sending

**Check 1: Connection String**
```bash
# Verify format
echo $AZURE_COMMUNICATION_CONNECTION_STRING
# Should contain: endpoint= and accesskey=
```

**Check 2: Domain Verification**
- Go to Azure Portal → Email Communication Service → Domains
- Ensure status is "Verified"

**Check 3: Domain Connection**
- Go to Communication Services → Email → Domains
- Ensure domain is listed under "Connected email domains"

**Check 4: Sender Email Format**
```bash
# Must match exactly what's in Azure
AZURE_COMMUNICATION_SENDER_EMAIL="DoNotReply@xxxxx.azurecomm.net"
```

### Issue: "User Engagement Tracking Disabled" Error

This is normal - we disable tracking for privacy. No action needed.

### Issue: High Azure Costs

**Solution**: Investigate why SendGrid is failing frequently
- Check SendGrid dashboard for issues
- Verify API key is valid
- Check for rate limit issues
- Consider upgrading SendGrid plan

### Issue: Emails in Spam

**Solution**: Improve email authentication
- Set up DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@coinley.io`
- Use custom domain (not Azure-managed domain)
- Warm up your domain gradually
- Monitor sender reputation via Google Postmaster Tools

---

## Production Checklist

Before going live with Azure fallback:

- [ ] Azure Communication Services created
- [ ] Email Communication Service created
- [ ] Custom domain added and verified
- [ ] Domain connected to Communication Services
- [ ] Connection string added to `.env`
- [ ] Sender email configured correctly
- [ ] Reply-to email configured
- [ ] Fallback tested successfully
- [ ] Monitoring endpoint tested
- [ ] Alerts configured for fallback events
- [ ] DNS records (SPF, DKIM, DMARC) configured
- [ ] Team trained on monitoring and troubleshooting

---

## Support & Resources

**Azure Documentation:**
- [Email Communication Services](https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-overview)
- [Domain Verification](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/email/add-custom-verified-domains)

**Coinley Internal:**
- Code: `/coinleyserver/utils/azureEmailService.js`
- Fallback Logic: `/coinleyserver/utils/emailService.js`
- Monitoring: `GET /api/admin/email/status`

**Need Help?**
- Check Azure Portal for resource health
- Review server logs for detailed error messages
- Contact Azure Support via portal if needed
