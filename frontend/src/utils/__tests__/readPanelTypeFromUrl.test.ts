import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
} from 'utils/getUnstableCurrentSearchParams';
import { readPanelTypeFromUrl } from 'utils/readPanelTypeFromUrl';

const withParam = (value?: string): void => {
	const search = new URLSearchParams();
	if (value !== undefined) {
		search.set('panelTypes', value);
	}
	__setSearchParamsGetterForTest(() => search);
};

describe('readPanelTypeFromUrl', () => {
	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('decodes the JSON-encoded value the app writes', () => {
		withParam(JSON.stringify(PANEL_TYPES.TIME_SERIES));

		expect(readPanelTypeFromUrl()).toBe(PANEL_TYPES.TIME_SERIES);
	});

	it('accepts an unencoded value from a hand-written link', () => {
		withParam('list');

		expect(readPanelTypeFromUrl()).toBe(PANEL_TYPES.LIST);
	});

	it.each(['{list', JSON.stringify('nope')])(
		'returns the fallback for %s, which is not a panel type',
		(value) => {
			withParam(value);

			expect(readPanelTypeFromUrl(PANEL_TYPES.LIST)).toBe(PANEL_TYPES.LIST);
			expect(readPanelTypeFromUrl()).toBeNull();
		},
	);

	it('returns the fallback when the param is absent', () => {
		withParam();

		expect(readPanelTypeFromUrl(PANEL_TYPES.LIST)).toBe(PANEL_TYPES.LIST);
		expect(readPanelTypeFromUrl()).toBeNull();
	});
});
