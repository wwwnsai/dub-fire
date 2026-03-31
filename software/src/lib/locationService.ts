export async function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        console.log("✅ Permission granted");
        resolve(true);
      },
      (err) => {
        console.error("❌ Permission denied:", err);
        alert("Location permission denied");
        resolve(false);
      }
    );
  });
}