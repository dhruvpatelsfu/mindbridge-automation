import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'qa.user@mindbridge.local'
const TEST_PASSWORD = 'admin12345'

test('Account Update happy path', async ({ page }) => {
  // TODO 1: Navigate to the login page (BASE_URL + '/login')
  // TODO 2: Sign in with TEST_EMAIL and TEST_PASSWORD (#email, #password, Sign in button),
  //         then wait for the redirect to /dashboard before moving on (page.waitForURL)
  // TODO 3: Open /account and set Region to APAC using data-testid account-region
  // TODO 4: Click Save (account-save-btn) and use expect() to assert account-save-success is visible
  throw new Error('Complete the TODO steps in account_update.spec.js')
})
