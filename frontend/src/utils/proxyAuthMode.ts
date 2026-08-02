// Proxy auth mode means identity comes from a fronting identity-aware proxy, so
// there is no login form to render. It is deliberately separate from
// noAuthMode: impersonation forbids the tokenizer, so noAuthMode can disable
// token rotation wholesale, whereas proxy auth coexists with password sessions
// that still need rotation and logout to work.
//
// This is set by the preflight effect in providers/App/App.tsx, which waits on
// the global config, while the protected queries are gated only on isLoggedIn,
// read synchronously from localStorage. A 401 arriving before the effect runs
// therefore still sees false and takes the rotate-then-logout path. The bounce
// that path can cause needs _proxyLogoutUrl below, which the same effect sets,
// so in that window Logout falls through to the login route instead, and the
// login page skips its form once the config lands. noAuthMode has the same
// window; closing it means sequencing those queries behind preflight, which is
// a change to shared behaviour rather than to this feature.
let _isProxyAuthMode = false;

export const setProxyAuthMode = (value: boolean): void => {
	_isProxyAuthMode = value;
};

export const getIsProxyAuthMode = (): boolean => _isProxyAuthMode;

// The proxy's sign-out endpoint, when configured. Logout is a plain module
// function outside React, so it cannot read react-query state directly; the
// preflight effect populates this singleton the same way it populates
// _isProxyAuthMode above.
let _proxyLogoutUrl = '';

export const setProxyLogoutUrl = (value: string): void => {
	_proxyLogoutUrl = value;
};

export const getProxyLogoutUrl = (): string => _proxyLogoutUrl;
