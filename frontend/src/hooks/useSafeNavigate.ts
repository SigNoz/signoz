import { cloneDeep, isEqual } from 'lodash-es';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';

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

const areUrlsEffectivelySame = (url1: URL, url2: URL): boolean => {
	if (url1.pathname !== url2.pathname) return false;

	const params1 = new URLSearchParams(url1.search);
	const params2 = new URLSearchParams(url2.search);

	const allParams = new Set([
		...Array.from(params1.keys()),
		...Array.from(params2.keys()),
	]);

	return Array.from(allParams).every((param) => {
		if (param === 'compositeQuery') {
			try {
				const query1 = params1.get('compositeQuery');
				const query2 = params2.get('compositeQuery');

				if (!query1 || !query2) return false;

				const decoded1 = JSON.parse(decodeURIComponent(query1));
				const decoded2 = JSON.parse(decodeURIComponent(query2));

				const filtered1 = cloneDeep(decoded1);
				const filtered2 = cloneDeep(decoded2);

				delete filtered1.id;
				delete filtered2.id;

				return isEqual(filtered1, filtered2);
			} catch (error) {
				console.warn('Error comparing compositeQuery:', error);
				return false;
			}
		}

		return params1.get(param) === params2.get(param);
	});
};

/**
 * Determines if this navigation is adding default/initial parameters
 * Returns true if:
 * 1. We're staying on the same page (same pathname)
 * 2. Either:
 *    - Current URL has no params and target URL has params, or
 *    - Target URL has new params that didn't exist in current URL
 */
const isDefaultNavigation = (currentUrl: URL, targetUrl: URL): boolean => {
	// Different pathnames means it's not a default navigation
	if (currentUrl.pathname !== targetUrl.pathname) return false;

	const currentParams = new URLSearchParams(currentUrl.search);
	const targetParams = new URLSearchParams(targetUrl.search);

	// Case 1: Clean URL getting params for the first time
	if (!currentParams.toString() && targetParams.toString()) return true;

	// Case 2: Check for new params that didn't exist before
	const currentKeys = new Set(Array.from(currentParams.keys()));
	const targetKeys = new Set(Array.from(targetParams.keys()));

	// Find keys that exist in target but not in current
	const newKeys = Array.from(targetKeys).filter((key) => !currentKeys.has(key));

	return newKeys.length > 0;
};
// Helper function to determine if an argument is an event
const isEventObject = (arg: any): boolean =>
	arg &&
	(arg instanceof MouseEvent ||
		arg instanceof KeyboardEvent ||
		arg.nativeEvent instanceof MouseEvent ||
		arg.nativeEvent instanceof KeyboardEvent ||
		arg.metaKey !== undefined ||
		arg.ctrlKey !== undefined);

// Helper function to extract options from arguments
const extractOptions = (
	optionsOrEvent?:
		| NavigateOptions
		| React.MouseEvent
		| MouseEvent
		| KeyboardEvent,
	options?: NavigateOptions,
): NavigateOptions => {
	const isEvent = isEventObject(optionsOrEvent);
	const actualOptions = isEvent ? options : (optionsOrEvent as NavigateOptions);

	const shouldOpenInNewTab =
		isEvent &&
		((optionsOrEvent as any).metaKey || (optionsOrEvent as any).ctrlKey);

	return {
		...actualOptions,
		newTab: shouldOpenInNewTab || actualOptions?.newTab,
	};
};

// Helper function to create target URL
const createTargetUrl = (
	to: string | SafeNavigateParams,
	location: { pathname: string; search: string },
): URL => {
	if (typeof to === 'string') {
		return new URL(to, window.location.origin);
	}
	return new URL(
		`${to.pathname || location.pathname}${to.search || ''}`,
		window.location.origin,
	);
};

// Helper function to handle new tab navigation
const handleNewTabNavigation = (
	to: string | SafeNavigateParams,
	location: { pathname: string; search: string },
): void => {
	const targetPath =
		typeof to === 'string'
			? to
			: `${to.pathname || location.pathname}${to.search || ''}`;
	window.open(targetPath, '_blank');
};

// Helper function to perform navigation
const performNavigation = (
	to: string | SafeNavigateParams,
	navigationOptions: NavigateOptions,
	navigate: any,
	location: { pathname: string; search: string },
): void => {
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
};

export const useSafeNavigate = (
	{ preventSameUrlNavigation }: UseSafeNavigateProps = {
		preventSameUrlNavigation: true,
	},
): {
	safeNavigate: (
		to: string | SafeNavigateParams,
		optionsOrEvent?:
			| NavigateOptions
			| React.MouseEvent
			| MouseEvent
			| KeyboardEvent,
		options?: NavigateOptions,
	) => void;
} => {
	const navigate = useNavigate();
	const location = useLocation();

	const safeNavigate = useCallback(
		(
			to: string | SafeNavigateParams,
			optionsOrEvent?:
				| NavigateOptions
				| React.MouseEvent
				| MouseEvent
				| KeyboardEvent,
			options?: NavigateOptions,
		) => {
			const finalOptions = extractOptions(optionsOrEvent, options);
			const currentUrl = new URL(
				`${location.pathname}${location.search}`,
				window.location.origin,
			);
			const targetUrl = createTargetUrl(to, location);

			// Handle new tab navigation
			if (finalOptions?.newTab) {
				handleNewTabNavigation(to, location);
				return;
			}

			const urlsAreSame = areUrlsEffectivelySame(currentUrl, targetUrl);
			const isDefaultParamsNavigation = isDefaultNavigation(currentUrl, targetUrl);

			if (preventSameUrlNavigation && urlsAreSame) {
				return;
			}

			const navigationOptions = {
				...finalOptions,
				replace: isDefaultParamsNavigation || finalOptions?.replace,
			};

			performNavigation(to, navigationOptions, navigate, location);
		},
		[navigate, location, preventSameUrlNavigation],
	);

	return { safeNavigate };
};
