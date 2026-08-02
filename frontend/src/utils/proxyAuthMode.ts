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
