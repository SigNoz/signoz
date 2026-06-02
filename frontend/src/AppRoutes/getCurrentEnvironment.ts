export function getCurrentEnvironment():
	| 'production'
	| 'staging'
	| 'self-host' {
	const host = document.location.host;

	if (host.endsWith('staging.signoz.cloud')) {
		return 'staging';
	}

	if (host.endsWith('signoz.cloud')) {
		return 'production';
	}

	return 'self-host';
}
