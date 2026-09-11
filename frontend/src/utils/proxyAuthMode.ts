// Proxy auth mode means identity comes from a fronting identity-aware proxy, so
// there is no login form to render. It is deliberately separate from
// noAuthMode: impersonation forbids the tokenizer, so noAuthMode can disable
// token rotation wholesale, whereas proxy auth coexists with password sessions
// that still need rotation and logout to work.
//
// This is set by the preflight effect in providers/App/App.tsx, which waits on
// the global config, while the protected queries are gated only on isLoggedIn,
// read synchronously from localStorage. A 401 can therefore reach the response
// interceptor before the effect has run, when this still reads its false
// default. The interceptor closes that window by awaiting utils/preflight
// before it reads either mode flag; see the comment there. Without that wait a
// 401 during startup rotates, fails, logs out, and with _proxyLogoutUrl set
// bounces through the proxy's sign-out page and back in, which is a loop
// wherever the proxy can re-authenticate silently.
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
