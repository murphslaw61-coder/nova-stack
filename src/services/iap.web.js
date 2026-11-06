// Web preview build: purchases are not available in the browser.
export function configurePurchases() {}
export const storeMode = () => 'unavailable';
export async function syncEntitlements() { return []; }
export async function loadCatalog() { return {}; }
export async function purchase() { return { error: 'Purchases are available in the iOS and Android apps.' }; }
export async function restorePurchases() { return { error: 'Purchases are available in the iOS and Android apps.' }; }
