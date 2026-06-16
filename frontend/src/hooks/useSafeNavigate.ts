import {
	areUrlsEffectivelySame,
	isDefaultNavigation,
} from 'hooks/useSafeNavigate.utils';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { withBasePath } from 'utils/basePath';

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
