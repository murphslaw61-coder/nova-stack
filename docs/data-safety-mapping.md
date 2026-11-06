# Store privacy forms: answer key

Based on the SDKs in this build (Google Mobile Ads SDK, RevenueCat, Expo). Check
Google's and RevenueCat's current disclosure guides when you submit, because
SDK behaviour changes over time.

## Google Play → App content → Data safety

**Does your app collect or share any required user data types?** Yes

| Data type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Location → Approximate location | Yes (AdMob, from IP) | Yes | No | Advertising or marketing, Fraud prevention |
| Device or other IDs | Yes (AdMob: Advertising ID; RevenueCat: app user ID) | Yes | No | Advertising, Analytics, Fraud prevention, App functionality |
| App activity → App interactions | Yes (AdMob) | Yes | No | Advertising, Analytics |
| App info & performance → Diagnostics | Yes (AdMob) | Yes | No | Analytics |
| Financial info → Purchase history | Yes (RevenueCat) | No | No | App functionality |

- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes** (via your support contact)
- Ads: **Contains ads = Yes**. Advertising ID permission is declared (`AD_ID`).
- Target audience: **13+** (or 18+) to stay clear of Families policy requirements.

## Apple App Store Connect → App Privacy

**Data Used to Track You**
- Identifiers → Device ID (IDFA, only when the user allows ATT): Third-Party Advertising

**Data Linked to You:** none

**Data Not Linked to You**
- Identifiers → Device ID / User ID: Third-Party Advertising, Analytics, App Functionality
- Usage Data → Product Interaction, Advertising Data: Third-Party Advertising, Analytics
- Location → Coarse Location: Third-Party Advertising
- Diagnostics → Crash / Performance data: Analytics
- Purchases → Purchase History: App Functionality

**Other answers**
- Uses encryption: **No** (`ITSAppUsesNonExemptEncryption = false` is already set)
- Privacy manifest: Expo and the Google Mobile Ads / RevenueCat SDKs ship their own `PrivacyInfo.xcprivacy`
