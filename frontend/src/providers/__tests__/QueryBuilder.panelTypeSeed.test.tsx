import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AllTheProviders, renderHook } from 'tests/test-utils';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';

const renderWithPanelTypes = (value: string): PANEL_TYPES | null => {
	__setSearchParamsGetterForTest(
		() => new URLSearchParams({ panelTypes: value }),
	);

	const { result } = renderHook(() => useQueryBuilder(), {
		wrapper: AllTheProviders,
	});

	return result.current.panelType;
};

describe('QueryBuilderProvider panel type seed', () => {
	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it.each([
		[
			'a JSON encoded value',
			JSON.stringify(PANEL_TYPES.TABLE),
			PANEL_TYPES.TABLE,
		],
		['a plain string value', PANEL_TYPES.TABLE, PANEL_TYPES.TABLE],
		['a malformed value', '{foo', null],
	])('seeds from %s', (_, value, expected) => {
		expect(renderWithPanelTypes(value)).toBe(expected);
	});
});
