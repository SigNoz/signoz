// Proxy auth mode means identity comes from a fronting identity-aware proxy, so
// there is no login form to render. It is deliberately separate from
// noAuthMode: impersonation forbids the tokenizer, so noAuthMode can disable
// token rotation wholesale, whereas proxy auth coexists with password sessions
// that still need rotation and logout to work.
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
