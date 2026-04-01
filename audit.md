# SECURITY AUDIT REPORT - Bets Pro Crypto Sportsbook

**Date:** April 1, 2026
**Auditor:** Security Audit
**Severity Ratings:** CRITICAL > HIGH > MEDIUM > LOW

---

## CRITICAL Severity Issues

### 1. No Rate Limiting on Authentication Endpoints
**File:** `app/api/auth/login/route.ts`, `app/api/auth/route.ts`, `app/api/auth/change-password/route.ts`
**Description:** No rate limiting on login, register, or password change endpoints. Attackers can perform brute-force attacks without throttling.
**Fix:** Implement rate limiting using `rate-limiter-flexible` or similar. Limit to ~5 attempts per minute per IP.

---

### 2. No Same-Site Cookie Restriction (CSRF Risk)
**File:** `app/api/auth/login/route.ts`, `app/api/auth/route.ts`, `app/api/auth/logout/route.ts`
**Description:** Session cookies use `sameSite: 'lax'` instead of `sameSite: 'strict'`. Allows CSRF attacks.
**Fix:** Change `sameSite: 'lax'` to `sameSite: 'strict'` on all session cookies.

---

### 3. IDOR in Notification Mark-Read Endpoint
**File:** `app/api/notifications/read/route.ts:15`
**Description:** Any authenticated user can mark ANY notification as read without ownership verification.
**Fix:** Add ownership verification before allowing mark-read.

---

### 4. Regex Injection in User Search (ReDoS)
**File:** `app/api/admin/users/route.ts:21-26`
**Description:** `$regex` with `'i'` flag on user-controlled input vulnerable to Regular Expression Denial of Service.
**Fix:** Sanitize regex special characters before building query.

---

## HIGH Severity Issues

### 5. No Session Expiration / Idle Timeout
**File:** `lib/session.ts`
**Description:** Sessions last 30 days with no idle timeout. If compromised, attackers have 30 days to exploit.
**Fix:** Store session creation time, implement expiration check, consider reducing maxAge.

---

### 6. No Force Logout / Session Invalidation
**File:** `app/api/auth/logout/route.ts`
**Description:** Users cannot invalidate all sessions. Compromised accounts remain accessible.
**Fix:** Add `lastLogoutAt` timestamp, invalidate sessions created before that time.

---

### 7. Race Condition in Balance Deduction
**File:** `app/api/withdraw/request/route.ts:29-36`, `app/api/bet/place/route.ts:55-89`
**Description:** Check-then-deduct pattern is not atomic. Concurrent requests can overdraw.
**Fix:** Use MongoDB atomic operations with `$inc` and conditional updates.

---

### 8. Mod Role Can Approve ANY Withdrawal
**File:** `app/api/admin/withdraw/approve/route.ts:19`
**Description:** Moderators can approve any pending withdrawal, not just assigned ones.
**Fix:** Restrict mod role to only admin-level withdrawals or require admin role.

---

## MEDIUM Severity Issues

### 9. Wrong Field Name Breaks Bet History
**File:** `app/api/bets/route.ts:12`
**Description:** Query filters by `game: 'sports'` but Bet model has no `game` field. Bet history returns empty.
**Fix:** Remove the `game: 'sports'` filter.

---

### 10. Cron Secret Too Simple
**File:** `app/api/admin/autoclose/route.ts:11-12`
**Description:** Simple header comparison for cron authentication can be brute-forced.
**Fix:** Use HMAC verification for cron jobs.

---

### 11. No Username Validation
**File:** `app/api/auth/route.ts:50`
**Description:** Username accepted without length limits or character restrictions.
**Fix:** Add validation (2-30 characters, alphanumeric only).

---

### 12. Verbose Error Messages
**File:** Multiple API routes
**Description:** Full error messages returned to clients could leak implementation details.
**Fix:** Return generic messages to clients, log details server-side.

---

### 13. Silent Webhook Errors
**File:** `app/api/webhook/oxapay/route.ts`
**Description:** Webhook returns 200 for some error conditions, hiding failures.
**Fix:** Distinguish fatal errors (400) from soft errors (200 with logging).

---

## LOW Severity Issues

### 14. No Password Complexity Requirements
**File:** `app/api/auth/route.ts:27-28`
**Description:** Password only requires 8+ characters with no complexity requirements.

### 15. No Account Lockout for Failed Logins
**File:** `app/api/auth/login/route.ts`
**Description:** Unlimited login attempts allowed per account.

### 16. Timing-Safe HMAC Comparison
**File:** `app/api/webhook/oxapay/route.ts:56`
**Description:** Direct string comparison of HMAC values could theoretically be vulnerable to timing attacks.

### 17. Predictable Referral Codes
**File:** `app/api/auth/route.ts:14`
**Description:** Referral codes derived from MongoDB ObjectId suffix, potentially guessable.

---

## POSITIVE SECURITY FINDINGS

1. **Password Hashing**: scrypt with 16-byte salt implemented correctly
2. **HMAC Webhook Verification**: Properly implemented with type-based key selection
3. **IDOR Protection**: Support tickets properly filter by userId
4. **No SQL Injection**: Mongoose ODM with proper parameterization
5. **No XSS**: No dangerouslySetInnerHTML usage
6. **Session Token Security**: 32 bytes crypto-random, SHA-256 hashed
7. **Cookie Flags**: HttpOnly, Secure (in production), proper path
8. **No File Upload Vulnerabilities**

---

## SUMMARY TABLE

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | CRITICAL | auth/*.ts | No rate limiting |
| 2 | CRITICAL | auth/*.ts | SameSite=lax (CSRF) |
| 3 | CRITICAL | notifications/read | IDOR mark-read |
| 4 | HIGH | admin/users | Regex injection |
| 5 | HIGH | lib/session.ts | No session expiry |
| 6 | HIGH | auth/logout | No force logout |
| 7 | HIGH | withdraw/request, bet/place | Race condition |
| 8 | HIGH | admin/withdraw/approve | Mod can approve any |
| 9 | MEDIUM | bets/route.ts | Wrong field name |
| 10 | MEDIUM | admin/autoclose | Weak cron auth |
| 11 | MEDIUM | auth/route.ts | No username validation |
| 12 | MEDIUM | *.ts | Verbose errors |
| 13 | MEDIUM | webhook/oxapay | Silent errors |
| 14 | LOW | auth/route.ts | Weak passwords |
| 15 | LOW | auth/login | No lockout |
| 16 | LOW | webhook/oxapay | Timing safe HMAC |
| 17 | LOW | auth/route.ts | Predictable referrals |
