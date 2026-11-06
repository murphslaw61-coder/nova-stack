// Release preflight: `npm run preflight`. Fails (exit 1) if anything that
// must be set before a store build is still a placeholder or a test value.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const problems = [];
const ok = [];
const check = (cond, good, bad) => (cond ? ok.push(good) : problems.push(bad));

const app = JSON.parse(read('app.json')).expo;
check(!/yourcompany/.test(app.ios.bundleIdentifier), `iOS bundle id: ${app.ios.bundleIdentifier}`, 'app.json → ios.bundleIdentifier is still com.yourcompany.*');
check(!/yourcompany/.test(app.android.package), `Android package: ${app.android.package}`, 'app.json → android.package is still com.yourcompany.*');
check(!/REPLACE/.test(app.extra?.eas?.projectId || 'REPLACE'), 'EAS project id set', 'app.json → extra.eas.projectId (run `eas init`)');

const gma = (app.plugins || []).find((p) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
const SAMPLE = /ca-app-pub-3940256099942544/;
check(gma && !SAMPLE.test(gma[1].iosAppId), 'AdMob iOS App ID set', "app.json → AdMob iosAppId is Google's sample ID");
check(gma && !SAMPLE.test(gma[1].androidAppId), 'AdMob Android App ID set', "app.json → AdMob androidAppId is Google's sample ID");

const cfg = read('src/config.js');
const placeholders = (cfg.match(/'[^']*REPLACE_ME[^']*'/g) || []);
check(placeholders.length === 0, 'src/config.js has no placeholders', `src/config.js still has ${placeholders.length} placeholder(s): ${placeholders.slice(0, 4).join(', ')}${placeholders.length > 4 ? ' …' : ''}`);
check(!/appl_REPLACE|goog_REPLACE/.test(cfg), 'RevenueCat keys set', 'src/config.js → revenueCat API keys');

const eas = read('eas.json');
check(!/REPLACE_WITH/.test(eas), 'eas.json submit config set', 'eas.json → submit.production (Apple ID / ASC app id / team id)');

console.log('\nNova Stack release preflight\n');
ok.forEach((m) => console.log('  ✓ ' + m));
problems.forEach((m) => console.log('  ✗ ' + m));
console.log('');
if (problems.length) {
  console.log(`${problems.length} item(s) to fix before a production build. See RELEASE.md.\n`);
  process.exit(1);
}
console.log('All set. Build with: npm run build:ios / npm run build:android\n');
