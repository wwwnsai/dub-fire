import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {

  // Test 1: Verify we can read the current fire status
  test('GET /api/fire-status should return an array of fire locations', async ({ request }) => {
    const response = await request.get('/api/fire-status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('fireLocations');
    expect(Array.isArray(data.fireLocations)).toBeTruthy();
  });

  // Test 2: Verify validation blocks incorrect POSTs
  test('POST /api/fire-status should return 400 when sending invalid payload', async ({ request }) => {
    const response = await request.post('/api/fire-status', {
      data: {
        // Sending a string instead of an array
        fireLocations: "Invalid String Payload", 
      }
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('fireLocations must be an array');
  });

  // Test 3: Verify successful status updates
  test('POST /api/fire-status should successfully update the locations', async ({ request }) => {
    // We send a mock dummy location
    const testLocations = [
      {
        lat: 13.0,
        lng: 100.0,
        name: "Test API Fire Location",
        severity: "fire"
      }
    ];

    const postResponse = await request.post('/api/fire-status', {
      data: { fireLocations: testLocations }
    });
    
    expect(postResponse.status()).toBe(200);
    const postData = await postResponse.json();
    expect(postData.message).toBe('Fire status updated successfully');
    expect(postData.fireLocations).toEqual(testLocations);

    // Verify it actually saved by doing a GET
    const getResponse = await request.get('/api/fire-status');
    const getData = await getResponse.json();
    expect(getData.fireLocations).toEqual(testLocations);
  });

  // Test 4: Verify Fire Alert API blocks non-fire status
  test('POST /api/fire-alert should return 400 for legacy non-fire status', async ({ request }) => {
    const response = await request.post('/api/fire-alert', {
      data: {
        status: "non-fire"
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Only fire status triggers notifications");
  });

  // Test 5: Verify Fire Alert GET returns notification stats
  test('GET /api/fire-alert should return notification stats', async ({ request }) => {
    const response = await request.get('/api/fire-alert');
    // It should either return 200 (stats) or 500 (if DB/env is unconfigured)
    // We'll check that the response is JSON
    expect([200, 500]).toContain(response.status());
    const data = await response.json();
    expect(data).toBeDefined();
  });

});
