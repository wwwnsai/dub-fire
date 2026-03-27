import { test, expect } from '@playwright/test';

const testCases = [
  { id: 'TC_LOGIN_01', desc: 'Valid login', email: 'valid_user@example.com', password: 'CorrectPassword123!', expectedResult: 'success' },
  { id: 'TC_LOGIN_02', desc: 'Wrong password', email: 'valid_user@example.com', password: 'WrongPassword!', expectedResult: 'error' },
  { id: 'TC_LOGIN_03', desc: 'Invalid email format', email: 'abc.com', password: 'AnyPassword123!', expectedResult: 'validation_error' },
  { id: 'TC_LOGIN_04', desc: 'Empty fields', email: '', password: '', expectedResult: 'validation_error' },
  { id: 'TC_LOGIN_05', desc: 'Unregistered user', email: 'nonexistent999@example.com', password: 'AnyPassword123!', expectedResult: 'error' },
  { id: 'TC_LOGIN_06', desc: 'SQL injection attempt', email: "' OR 1=1 --", password: 'password', expectedResult: 'validation_error' },
  { id: 'TC_LOGIN_07', desc: 'Case sensitivity', email: 'VALID_USER@EXAMPLE.COM', password: 'CorrectPassword123!', expectedResult: 'success' },
];

test.describe('Login functionality tests', () => {

    test.beforeEach(async ({ page }) => {
        // Log browser consoles to help with debugging
        page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));

        // MOCK SUPABASE AUTH: Intercept the auth request and return a success mock
        await page.route('**/auth/v1/token*', async (route) => {
            const request = route.request();
            if (request.method() === 'POST') {
                const body = JSON.parse(request.postData() || '{}');
                const isCorrectUser = body.email?.trim().toLowerCase() === 'valid_user@example.com';
                const isCorrectPass = body.password === 'CorrectPassword123!';

                console.log(`INTERCEPTED: Attempt for ${body.email} - Match: ${isCorrectUser && isCorrectPass}`);

                if (isCorrectUser && isCorrectPass) {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ 
                          access_token: 'fake-jwt', 
                          token_type: 'bearer',
                          expires_in: 3600,
                          refresh_token: 'fake-refresh',
                          user: { id: 'test-id', email: body.email }
                        }),
                    });
                } else {
                    await route.fulfill({
                        status: 400,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' }),
                    });
                }
            } else {
                await route.continue();
            }
        });
    });

    for (const data of testCases) {
        test(`[${data.id}] ${data.desc}`, async ({ page }) => {
            await page.goto('/login');
            
            // Fill form fields
            if (data.email) {
                await page.fill('input[type="email"]', data.email);
                // Ensure value is set correctly before proceeding
                await expect(page.locator('input[type="email"]')).toHaveValue(data.email);
            }
            if (data.password) {
                await page.fill('input[type="password"]', data.password);
                await expect(page.locator('input[type="password"]')).toHaveValue(data.password);
            }
            
            // Submit form
            const submitBtn = page.locator('button[type="submit"]');
            await submitBtn.focus();
            await submitBtn.click();

            if (data.expectedResult === 'success') {
                // Should redirect to dashboard /home
                await expect(page).toHaveURL(/.*\/home/, { timeout: 15000 });
            } else if (data.expectedResult === 'error') {
                // Should show the error message on page
                const errorLocator = page.locator('p.text-red-500');
                await expect(errorLocator).toBeVisible({ timeout: 10000 });
            } else if (data.expectedResult === 'validation_error') {
                // Should remain on the login page (due to browser or local validation)
                await expect(page).toHaveURL(/.*\/login/);
            }
        });
    }
});
