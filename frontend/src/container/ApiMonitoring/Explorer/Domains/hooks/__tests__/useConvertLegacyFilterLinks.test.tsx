import { ReactNode, useEffect, useState } from 'react';
import {
	ALL_ENDPOINTS_EXPRESSION_KEY,
	ENDPOINT_STATS_EXPRESSION_KEY,
} from 'container/ApiMonitoring/filterParamKeys';
import { getApiMonitoringParams } from 'container/ApiMonitoring/queryParams';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
	getCurrentNuqsSearchParams,
	onNuqsUrlUpdate,
	resetNuqsState,
} from 'tests/nuqs-helpers';
import { mockAppLocation, mockNavigate } from 'tests/router-mocks';
import { renderHook, waitFor } from 'tests/test-utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';

import { useConvertLegacyFilterLinks } from '../useConvertLegacyFilterLinks';

const legacyFilter = (key: string, value: string): TagFilter => ({
	op: 'AND',
	items: [
		{
			id: key,
			key: { key, dataType: DataTypes.String, type: 'tag' },
			op: '=',
			value,
		},
	],
});

// NuqsTestingAdapter resets its update queue on every render, not only on mount,
// dropping writes queued just before it re-renders.
function UrlAdapter({
	searchParams,
	children,
}: {
	searchParams: string;
	children: ReactNode;
}): JSX.Element {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	return (
		<NuqsTestingAdapter
			searchParams={searchParams}
			onUrlUpdate={onNuqsUrlUpdate}
			rateLimitFactor={0}
			resetUrlUpdateQueueOnMount={!mounted}
			hasMemory
		>
			{children}
		</NuqsTestingAdapter>
	);
}

function renderWithLink(linkParams: object): jest.SpyInstance {
	const search = `?apiMonitoringParams=${encodeURIComponent(
		encodeURIComponent(JSON.stringify(linkParams)),
	)}`;
	__setSearchParamsGetterForTest(() => new URLSearchParams(search));
	mockAppLocation({ search });
	const navigateSpy = mockNavigate();
	renderHook(() => useConvertLegacyFilterLinks(), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<UrlAdapter searchParams={search}>{children}</UrlAdapter>
		),
	});
	return navigateSpy;
}

describe('useConvertLegacyFilterLinks', () => {
	beforeEach(() => {
		resetNuqsState();
	});

	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('moves an older link’s filters into the drawer params once', async () => {
		const navigateSpy = renderWithLink({
			selectedDomain: 'api.example.com',
			allEndpointsLocalFilters: legacyFilter('service.name', 'cart'),
			endPointDetailsLocalFilters: legacyFilter('http.status_code', '500'),
		});

		await waitFor(() => {
			const params = getCurrentNuqsSearchParams();
			expect(params.get(ALL_ENDPOINTS_EXPRESSION_KEY)).toBe(
				"service.name = 'cart'",
			);
			expect(params.get(ENDPOINT_STATS_EXPRESSION_KEY)).toBe(
				"http.status_code = '500'",
			);
		});
		const [to, options] = navigateSpy.mock.calls[0];
		const rewritten = getApiMonitoringParams(
			typeof to === 'string' ? to : (to.search ?? ''),
		);
		expect(rewritten.selectedDomain).toBe('api.example.com');
		expect(rewritten).not.toHaveProperty('allEndpointsLocalFilters');
		expect(options).toStrictEqual({ replace: true });
	});

	it('leaves a link without legacy filters alone', () => {
		const navigateSpy = renderWithLink({ selectedDomain: 'api.example.com' });

		expect(navigateSpy).not.toHaveBeenCalledWith(
			expect.objectContaining({ search: expect.any(String) }),
			expect.anything(),
		);
		expect(getCurrentNuqsSearchParams().has(ALL_ENDPOINTS_EXPRESSION_KEY)).toBe(
			false,
		);
	});
});
