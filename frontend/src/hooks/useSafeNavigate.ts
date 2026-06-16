import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { withBasePath } from 'utils/basePath';
import { COMPOSITE_QUERY_KEY } from 'lib/compositeQuery/types';
import { deserialize } from 'lib/compositeQuery/serializer';
import { isEqual } from 'lodash-es';

interface NavigateOptions {
	replace?: boolean;
	state?: any;
	newTab?: boolean;
}

interface SafeNavigateParams {
	pathname?: string;
	search?: string;
}

interface UseSafeNavigateProps {
	preventSameUrlNavigation?: boolean;
}

/**
 * Compare the (optional) `compositeQuery` param of two URLSearchParams
 * semantically. Its serialized form is not byte-stable — the volatile `id` and
 * the adapter choice both vary — so we decode and deep-compare, ignoring `id`.
 *
 * compositeQuery is not guaranteed to be present: absent on both sides counts
 * as equal, present on only one side counts as different. When either side is
 * present but can't be decoded, we fall back to comparing the raw values.
 */
const compositeQueriesEqual = (
	params1: URLSearchParams,
	params2: URLSearchParams,
): boolean => {
	const raw1 = params1.get(COMPOSITE_QUERY_KEY);
	const raw2 = params2.get(COMPOSITE_QUERY_KEY);

	if (!raw1 && !raw2) {
		return true;
	}
	if (!raw1 || !raw2) {
		return false;
	}

	try {
		const decoded1 = deserialize(params1);
		const decoded2 = deserialize(params2);

		if (decoded1 && decoded2) {
			// Ignore the volatile `id` when comparing queries.
			const { id: _id1, ...rest1 } = decoded1;
			const { id: _id2, ...rest2 } = decoded2;

			return isEqual(rest1, rest2);
		}
	} catch (error) {
		console.warn('Error comparing compositeQuery:', error);
	}

	// One or both could not be decoded — compare the raw encoded values.
	return raw1 === raw2;
};

export const areUrlsEffectivelySame = (url1: URL, url2: URL): boolean => {
	if (url1.pathname !== url2.pathname) {
		return false;
	}

	const params1 = new URLSearchParams(url1.search);
	const params2 = new URLSearchParams(url2.search);

	// The compositeQuery is compared semantically (it round-trips through a
	// non-stable serialized form); every other param is compared by raw value.
	if (!compositeQueriesEqual(params1, params2)) {
		return false;
	}

	const otherKeys = new Set(
		[...params1.keys(), ...params2.keys()].filter(
			(key) => key !== COMPOSITE_QUERY_KEY,
		),
	);

	return [...otherKeys].every((key) => params1.get(key) === params2.get(key));
};

/**
 * Determines if this navigation is adding default/initial parameters
 * Returns true if:
 * 1. We're staying on the same page (same pathname)
 * 2. Either:
 *    - Current URL has no params and target URL has params, or
 *    - Target URL has new params that didn't exist in current URL
 */
export const isDefaultNavigation = (
	currentUrl: URL,
	targetUrl: URL,
): boolean => {
	// Different pathnames means it's not a default navigation
	if (currentUrl.pathname !== targetUrl.pathname) {
		return false;
	}

	const currentParams = new URLSearchParams(currentUrl.search);
	const targetParams = new URLSearchParams(targetUrl.search);

	// Case 1: Clean URL getting params for the first time
	if (!currentParams.toString() && targetParams.toString()) {
		return true;
	}

	// Case 2: Check for new params that didn't exist before
	const currentKeys = new Set(currentParams.keys());
	const targetKeys = new Set(targetParams.keys());

	// Find keys that exist in target but not in current
	const newKeys = [...targetKeys].filter((key) => !currentKeys.has(key));

	return newKeys.length > 0;
};
export const useSafeNavigate = (
	{ preventSameUrlNavigation }: UseSafeNavigateProps = {
		preventSameUrlNavigation: true,
	},
): {
	safeNavigate: (
		to: string | SafeNavigateParams,
		options?: NavigateOptions,
	) => void;
} => {
	const navigate = useNavigate();
	const location = useLocation();

	const safeNavigate = useCallback(
		// eslint-disable-next-line sonarjs/cognitive-complexity
		(to: string | SafeNavigateParams, options?: NavigateOptions) => {
			// oxlint-disable-next-line signoz/no-raw-absolute-path
			const base = window.location.origin;
			const currentUrl = new URL(`${location.pathname}${location.search}`, base);

			let targetUrl: URL;

			if (typeof to === 'string') {
				targetUrl = new URL(to, base);
			} else {
				targetUrl = new URL(
					`${to.pathname || location.pathname}${to.search || ''}`,
					base,
				);
			}

			const shouldOpenInNewTab = options?.newTab;

			if (shouldOpenInNewTab) {
				const targetPath =
					typeof to === 'string'
						? to
						: `${to.pathname || location.pathname}${to.search || ''}`;
				window.open(withBasePath(targetPath), '_blank');
				return;
			}

			const urlsAreSame = areUrlsEffectivelySame(currentUrl, targetUrl);
			const isDefaultParamsNavigation = isDefaultNavigation(currentUrl, targetUrl);

			if (preventSameUrlNavigation && urlsAreSame) {
				return;
			}

			const navigationOptions = {
				...options,
				replace: isDefaultParamsNavigation || options?.replace,
			};

			if (typeof to === 'string') {
				navigate(to, navigationOptions);
			} else {
				navigate(
					{
						pathname: to.pathname || location.pathname,
						search: to.search,
					},
					navigationOptions,
				);
			}
		},
		[navigate, location.pathname, location.search, preventSameUrlNavigation],
	);

	return { safeNavigate };
};
