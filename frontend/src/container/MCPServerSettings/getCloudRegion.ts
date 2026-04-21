export interface CloudRegionResult {
	region: string | null;
	isKnown: boolean;
}

const VALID_REGION_LABEL = /^[a-z0-9][a-z0-9-]*$/;

export function parseRegionFromSignozCloudHost(host: string): string | null {
	const parts = host.split('.');
	const len = parts.length;
	// SigNoz Cloud tenant hosts follow `<tenant>.<region>.signoz.cloud`
	// (4 labels). 3-label hosts like `app.signoz.cloud` would wrongly
	// resolve to region=`app`, so require at least 4 labels.
	if (len < 4 || parts[len - 1] !== 'cloud' || parts[len - 2] !== 'signoz') {
		return null;
	}
	const region = parts[len - 3]?.toLowerCase() ?? '';
	if (!VALID_REGION_LABEL.test(region)) {
		return null;
	}
	return region;
}

export function parseRegionFromUrl(url: string): string | null {
	try {
		return parseRegionFromSignozCloudHost(new URL(url).hostname);
	} catch {
		return null;
	}
}

export function parseCloudRegion(hostname: string): CloudRegionResult {
	const region = parseRegionFromSignozCloudHost(hostname);
	return region ? { region, isKnown: true } : { region: null, isKnown: false };
}

export function normalizeRegion(input: string): string | null {
	const value = input.trim().toLowerCase();
	if (!VALID_REGION_LABEL.test(value)) {
		return null;
	}
	return value;
}

export function buildMcpEndpoint(region: string): string {
	return `https://mcp.${region}.signoz.cloud/mcp`;
}

export function getCloudRegion(): CloudRegionResult {
	return parseCloudRegion(window.location.hostname);
}
