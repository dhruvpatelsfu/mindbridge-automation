# Selectors Reference: Account Update

Use stable `data-testid` attributes on the Account form. The login page uses
standard `id` attributes on its inputs because those fields do not expose
test ids.

**Base URL:** `http://localhost:3000`

## Login (`/login`)

| Element | Locator | Notes |
| --- | --- | --- |
| Email input | `#email` | Use `page.locator('#email')` |
| Password input | `#password` | Use `page.locator('#password')` |
| Sign in button | role + name | `page.getByRole('button', { name: 'Sign in' })` |

## Account (`/account`)

Requires an authenticated session. Navigate directly after login, or use the
**Account** link in the header.

| Element | `data-testid` | Notes |
| --- | --- | --- |
| Name input | `account-name` | Required field |
| Date of birth | `account-dob` | Optional |
| Region input | `account-region` | Use a deterministic value such as `APAC` |
| Subscription tier | `account-tier` | `free` or `pro` |
| Save button | `account-save-btn` | Submits the form |
| Success message | `account-save-success` | Visible after a successful save |

## Example (happy path)

```javascript
await page.goto('http://localhost:3000/login')
await page.locator('#email').fill('qa.user@mindbridge.local')
await page.locator('#password').fill('admin12345')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('**/dashboard') // let the sign-in finish before moving on

await page.goto('http://localhost:3000/account')
await page.getByTestId('account-region').fill('APAC')
await page.getByTestId('account-save-btn').click()
await expect(page.getByTestId('account-save-success')).toBeVisible()
```

## Project test user

| Field | Value |
| --- | --- |
| User id (database) | `101` |
| Email | `qa.user@mindbridge.local` |
| Password | `admin12345` |
| Display name | `Jordan Lee` |

Run `python3 tools/prepare_project_user.py` after the server starts to seed
this account in SQLite.
