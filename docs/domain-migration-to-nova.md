# Domain Migration: support.r-link.com → nova.r-link.com

**Migration Date:** February 15, 2026
**New Primary URL:** https://nova.r-link.com

## 🎯 Overview

This document tracks the complete migration from `support.r-link.com` to `nova.r-link.com`.

---

## ✅ Pre-Migration Checklist

### 1. DNS Configuration

Set up DNS records for nova.r-link.com:

```
Type: CNAME
Name: nova
Value: cname.vercel-dns.com
TTL: 300
```

**Status:** ⏳ Pending

---

### 2. Vercel Domain Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter `nova.r-link.com`
4. Verify DNS configuration
5. Wait for SSL certificate provisioning (~5-10 minutes)

**Status:** ⏳ Pending

---

### 3. Doppler Environment Variables

Update in [Doppler Dashboard](https://dashboard.doppler.com) for project `r-link-customer-service`:

#### All Configs (dev, stg, prd):

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `NEXT_PUBLIC_APP_URL` | `https://support.r-link.com` | `https://nova.r-link.com` |
| `PORTAL_URL` | `https://support.r-link.com/portal` | `https://nova.r-link.com/portal` |
| `WIDGET_ALLOWED_ORIGINS` | (existing) | Add: `https://nova.r-link.com,nova.r-link.com` |

**How to update:**
1. Navigate to Doppler → r-link-customer-service
2. Select config (dev/stg/prd)
3. Edit each variable
4. Changes auto-sync to Vercel
5. Redeploy on Vercel to pick up new values

**Status:** ⏳ Pending

---

### 4. Supabase Auth Configuration

Update in [Supabase Dashboard](https://supabase.com/dashboard):

1. Select your project
2. Go to **Authentication** → **URL Configuration**
3. Update **Site URL**: `https://nova.r-link.com`
4. Under **Redirect URLs**, add these patterns:
   ```
   https://nova.r-link.com/**
   https://nova.r-link.com/auth/callback
   https://nova.r-link.com/portal/**
   https://nova.r-link.com/widget/**
   ```
5. Click "Save"

**Status:** ⏳ Pending

---

### 5. SendGrid Configuration

#### A. Update Inbound Parse Webhook

1. Go to [SendGrid Dashboard](https://app.sendgrid.com) → Settings → Inbound Parse
2. Find your existing inbound parse configuration
3. Update **Destination URL** to:
   ```
   https://nova.r-link.com/api/webhooks/email?secret=<your-webhook-secret>
   ```
4. Click "Update"

#### B. Domain Authentication (if applicable)

If you have domain authentication set up for `r-link.com`, no changes needed (it covers all subdomains).

**Status:** ⏳ Pending

---

### 6. Documentation Updates

✅ **COMPLETED** - Documentation files updated:
- [CLAUDE.md](../CLAUDE.md) - Widget integration example
- [.env.example](../.env.example) - Added production URL comment
- [docs/matt-next-steps-21425.md](./matt-next-steps-21425.md) - All URL references
- [public/widget/loader.js](../public/widget/loader.js) - Usage comment

---

## 🚀 Deployment Order

**IMPORTANT:** Follow this exact order to prevent downtime:

1. ✅ **Update Documentation** (DONE)
2. ⏳ **Add DNS CNAME record** for nova.r-link.com
3. ⏳ **Add domain in Vercel** and wait for SSL
4. ⏳ **Update Doppler** environment variables (all configs)
5. ⏳ **Redeploy on Vercel** to pick up new env vars
6. ⏳ **Update Supabase** auth URLs
7. ⏳ **Update SendGrid** inbound parse webhook
8. ⏳ **Test all channels** (widget, portal, email, SMS)

---

## 🧪 Post-Migration Testing

After deployment, test these critical flows:

### Widget
- [ ] Load widget on test page: `<script src="https://nova.r-link.com/widget/loader.js"></script>`
- [ ] Send message as anonymous user
- [ ] Send message with email identification
- [ ] Verify AI response received

### Portal
- [ ] Access portal: https://nova.r-link.com/portal
- [ ] Request access token
- [ ] View ticket history
- [ ] Send message

### Email Channel
- [ ] Send email to `support@inbound.r-link.com`
- [ ] Verify ticket created
- [ ] Verify AI auto-response sent
- [ ] Reply to AI email
- [ ] Verify reply threaded correctly

### Dashboard
- [ ] Log in: https://nova.r-link.com
- [ ] View ticket queue
- [ ] Send agent reply
- [ ] Verify real-time updates

### SMS (if configured)
- [ ] Send SMS to Twilio number
- [ ] Verify ticket created
- [ ] Verify AI auto-response

---

## 🔄 Rollback Plan

If issues occur:

1. **Revert Doppler** variables to old values:
   ```
   NEXT_PUBLIC_APP_URL=https://support.r-link.com
   PORTAL_URL=https://support.r-link.com/portal
   ```

2. **Redeploy on Vercel** to pick up old values

3. **Revert Supabase** auth URLs

4. **Revert SendGrid** webhook URL

5. support.r-link.com should still work via Vercel (keep both domains active during transition)

---

## 📊 Migration Status

| Step | Status | Completed By | Date |
|------|--------|--------------|------|
| 1. Documentation Updates | ✅ Done | Claude | 2026-02-15 |
| 2. DNS Configuration | ⏳ Pending | Matt | - |
| 3. Vercel Domain Setup | ⏳ Pending | Matt | - |
| 4. Doppler Updates | ⏳ Pending | Matt | - |
| 5. Vercel Redeploy | ⏳ Pending | Auto | - |
| 6. Supabase Auth | ⏳ Pending | Matt | - |
| 7. SendGrid Webhook | ⏳ Pending | Matt | - |
| 8. Testing | ⏳ Pending | Matt | - |

---

## 📝 Notes

- Keep **both domains active** during transition (support + nova) for gradual migration
- Widget integrations on customer sites will need to update their script src URL
- Consider setting up redirect from support.r-link.com → nova.r-link.com after migration stabilizes
- Monitor Vercel function logs and Supabase logs for any auth or webhook errors after migration

---

## 🆘 Troubleshooting

### Widget not loading
- Check DNS propagation: `dig nova.r-link.com`
- Verify SSL certificate issued in Vercel
- Check browser console for CORS errors
- Verify `WIDGET_ALLOWED_ORIGINS` includes new domain

### Auth redirect errors
- Verify Supabase redirect URLs include nova.r-link.com patterns
- Check Supabase logs for auth errors
- Clear cookies and try auth flow again

### Email webhook not receiving
- Verify SendGrid Inbound Parse destination URL
- Check Vercel function logs: `/api/webhooks/email`
- Test webhook with SendGrid's test feature
- Verify `WEBHOOK_EMAIL_SECRET` still matches

### Portal access token issues
- Verify `PORTAL_URL` in Doppler set to nova.r-link.com
- Check token generation in dashboard logs
- Verify Supabase RLS policies allow token auth

---

**Questions?** Contact Matt or reference [CLAUDE.md](../CLAUDE.md) for architecture details.
