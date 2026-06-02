import { USER_PREFERENCES } from 'constants/userPreferences';
import { UserPreference } from 'types/api/preferences/preference';

import { COLOR_BY_OPTIONS, DEFAULT_COLOR_BY_FIELD } from '../../constants';
import {
	setTraceStoreAvailableColorByFields,
	setTraceStoreUserPreferences,
	useTraceStore,
} from '../traceStore';

const colorByPref = (fieldName: string): UserPreference[] => [
	{
		name: USER_PREFERENCES.SPAN_DETAILS_COLOR_BY_ATTRIBUTE,
		value: fieldName,
	} as UserPreference,
];

const optionNames = (): string[] =>
	useTraceStore.getState().availableColorByOptions.map((o) => o.field.name);

describe('traceStore color-by gating', () => {
	beforeEach(() => {
		useTraceStore.setState({
			availableColorByFieldNames: undefined,
			userPreferences: null,
			colorByField: DEFAULT_COLOR_BY_FIELD,
			availableColorByOptions: COLOR_BY_OPTIONS.filter(
				(o) => o.field.name === DEFAULT_COLOR_BY_FIELD.name,
			),
		});
	});

	it('offers only the default field before spans load', () => {
		expect(optionNames()).toStrictEqual([DEFAULT_COLOR_BY_FIELD.name]);
		expect(useTraceStore.getState().colorByField).toStrictEqual(
			DEFAULT_COLOR_BY_FIELD,
		);
	});

	it('offers the default plus any field present on loaded spans', () => {
		setTraceStoreAvailableColorByFields(['host.name']);
		expect(optionNames()).toStrictEqual([
			DEFAULT_COLOR_BY_FIELD.name,
			'host.name',
		]);
	});

	it('honors the persisted color-by field when it is available', () => {
		setTraceStoreAvailableColorByFields(['host.name']);
		setTraceStoreUserPreferences(colorByPref('host.name'));
		expect(useTraceStore.getState().colorByField.name).toBe('host.name');
	});

	it('falls back to the default when the persisted field is not available', () => {
		setTraceStoreUserPreferences(colorByPref('host.name'));
		setTraceStoreAvailableColorByFields(['k8s.node.name']);
		expect(useTraceStore.getState().colorByField.name).toBe(
			DEFAULT_COLOR_BY_FIELD.name,
		);
		expect(optionNames()).toStrictEqual([
			DEFAULT_COLOR_BY_FIELD.name,
			'k8s.node.name',
		]);
	});

	it('trusts the persisted field while spans are still loading', () => {
		// availableColorByFieldNames stays undefined (loading) — do not flip to default
		setTraceStoreUserPreferences(colorByPref('host.name'));
		expect(useTraceStore.getState().colorByField.name).toBe('host.name');
	});
});
