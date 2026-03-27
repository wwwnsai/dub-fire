import { test, expect } from '@playwright/test';

test.describe('End-to-End System Testing', () => {

  test('System should render sensor conditions and trigger LINE API on user action', async ({ page }) => {
    // 1. FRONTEND: Load the main Dashboard home system
    await page.goto('/home');

    // 2. ASSERTION (Frontend UI): Verify that device status cards rendered dynamically
    // The page has a Card mapping "Device", "Temperature", "Humidity", and "Sensor Health"
    await expect(page.getByText('ECC-806', { exact: true })).toBeVisible();
    await expect(page.getByText('Temperature')).toBeVisible();
    await expect(page.getByText('25°C')).toBeVisible();
    await expect(page.getByText('Sensor Health')).toBeVisible();
    
    // 3. EVENT LISTENER: We set up network listeners before the action
    const apiPromiseLineNoti = page.waitForRequest(request => 
      request.url().includes('/api/line-noti') && request.method() === 'POST'
    );
    
    const apiPromiseLineGroup = page.waitForRequest(request => 
      request.url().includes('/api/line-group') && request.method() === 'POST'
    );

    // 4. USER ACTION: Let's wait a second to make sure React Hydration binds the onClick event
    await page.waitForTimeout(2000); // Ensures React mounts properly

    const sendLineButton = page.getByRole('button', { name: "Send LINE" });
    await expect(sendLineButton).toBeVisible();
    
    // We click it! We use dispatchEvent because clicking natively is intercepted by floating navs
    await sendLineButton.dispatchEvent('click');

    // 5. ASSERTION (System Integration): Did the frontend send the requests out correctly?
    const notiRequest = await apiPromiseLineNoti;
    const groupRequest = await apiPromiseLineGroup;

    // Verify the POST payloads sent to the backend API exactly match the requirements
    expect(notiRequest.postDataJSON()).toEqual({ message: "🔥 Fire Alert!!" });
    expect(groupRequest.postDataJSON()).toEqual({ message: "🔥 ไฟไหม้จ้า" });
  });

});
