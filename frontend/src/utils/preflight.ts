// Whether this deployment has a session to rotate is only known once the global
// config has landed and the preflight effect in providers/App/App.tsx has
// recorded it. Protected queries fire earlier than that: they are gated on
// isLoggedIn, read synchronously from localStorage, so a 401 can reach the
// response interceptor while getIsNoAuthMode and getIsProxyAuthMode still
// return their false defaults.
//
// Reading those defaults sends a header-authenticated deployment down the
// rotate-then-logout path, and with logout_redirect_url set that bounces the
// user through the proxy's sign-out page and straight back in. Awaiting this
// before deciding closes the window for both header-driven modes while leaving
// password sessions rotating as before, since the wait is one already-in-flight
// config round trip.
let markComplete!: () => void;

const complete = new Promise<void>((resolve) => {
	markComplete = resolve;
});

export const markPreflightComplete = (): void => {
	markComplete();
};

// A deadlock guard rather than a policy. The preflight effect runs whenever the
// global config query settles, success or failure, but if that query never
// settles at all then every 401 would wait here forever instead of being
// handled.
export const PREFLIGHT_WAIT_TIMEOUT_MS = 5000;

export const waitForPreflight = (): Promise<void> =>
	Promise.race([
		complete,
		new Promise<void>((resolve) => {
			setTimeout(resolve, PREFLIGHT_WAIT_TIMEOUT_MS);
		}),
	]);
