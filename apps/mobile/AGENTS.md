# Expo

This app runs **Expo SDK 54** (React Native 0.81.5, React 19.1.0).
`apps/mobile/package.json` is the source of truth — what is installed wins
over any documentation.

Expo no longer publishes docs for SDK 54: `docs.expo.dev/versions/v54.0.0/`
now redirects to the latest version. The oldest version still published is
**v55** (React Native 0.83), so it is the closest reference available — but
it documents APIs that do not exist here yet. If an API shows up only
there, check it against the installed version before using it.

- Closest published reference: https://docs.expo.dev/versions/v55.0.0/
- Per-version changelog: https://expo.dev/changelog

Being outside the published docs window is a reason to plan an SDK upgrade,
not a reason to write code against a newer SDK's documentation.
