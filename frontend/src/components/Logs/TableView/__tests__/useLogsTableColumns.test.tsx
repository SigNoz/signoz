import { renderHook } from '@testing-library/react';
import { FontSize } from 'container/OptionsMenu/types';
import { IField } from 'types/api/logs/fields';

import { useLogsTableColumns } from '../useLogsTableColumns';

jest.mock('providers/Timezone', () => ({
	useTimezone: (): { formatTimezoneAdjustedTimestamp: jest.Mock } => ({
		formatTimezoneAdjustedTimestamp: jest.fn(() => 'TS'),
	}),
}));

const field = (name: string, type = ''): IField => ({
	name,
	type,
	dataType: 'string',
});

describe('useLogsTableColumns — selectColumns-order respected', () => {
	it('prepends stateIndicator and renders user fields in array order', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [field('c'), field('a'), field('b')],
				fontSize: FontSize.SMALL,
			}),
		);

		expect(result.current.map((c) => c.id)).toStrictEqual([
			'state-indicator',
			'c',
			'a',
			'b',
		]);
	});

	it('slots body and timestamp at their position in the fields array', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [
					field('service.name'),
					field('body', 'log'),
					field('request.id'),
					field('timestamp', 'log'),
				],
				fontSize: FontSize.SMALL,
			}),
		);

		// body/timestamp appear where the caller placed them, keyed by their
		// composite IDs ('log.*'); contextless user fields collapse to bare name.
		expect(result.current.map((c) => c.id)).toStrictEqual([
			'state-indicator',
			'service.name',
			'log.body',
			'request.id',
			'log.timestamp',
		]);
	});

	it('renders a same-name field from another context as a DISTINCT column (no collision)', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [field('body', 'log'), field('body', 'attribute')],
				fontSize: FontSize.SMALL,
			}),
		);

		const byId = new Map(result.current.map((c) => [c.id, c]));
		// Attribute variant is its own column, not a duplicate 'log.body'.
		expect(result.current.map((c) => c.id)).toStrictEqual([
			'state-indicator',
			'log.body',
			'attribute.body',
		]);
		expect(byId.get('log.body')?.enableRemove).toBe(false);
		expect(byId.get('attribute.body')?.enableRemove).toBe(true);
	});

	it('applies the same distinct-column treatment to timestamp variants', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [field('timestamp', 'log'), field('timestamp', 'attribute')],
				fontSize: FontSize.SMALL,
			}),
		);

		const byId = new Map(result.current.map((c) => [c.id, c]));
		expect(result.current.map((c) => c.id)).toStrictEqual([
			'state-indicator',
			'log.timestamp',
			'attribute.timestamp',
		]);
		expect(byId.get('log.timestamp')?.enableRemove).toBe(false);
		expect(byId.get('attribute.timestamp')?.enableRemove).toBe(true);
	});

	it('skips the synthetic "id" field name', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [field('id'), field('a'), field('b')],
				fontSize: FontSize.SMALL,
			}),
		);

		expect(result.current.map((c) => c.id)).toStrictEqual([
			'state-indicator',
			'a',
			'b',
		]);
	});

	it('uses the special body/timestamp coldefs (canBeHidden=false), not the generic user field def', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [
					field('body', 'log'),
					field('timestamp', 'log'),
					field('user_field'),
				],
				fontSize: FontSize.SMALL,
			}),
		);

		const byId = new Map(result.current.map((c) => [c.id, c]));
		// body + timestamp are locked from the table-X removal pathway.
		expect(byId.get('log.body')?.canBeHidden).toBe(false);
		expect(byId.get('log.body')?.enableRemove).toBe(false);
		expect(byId.get('log.timestamp')?.canBeHidden).toBe(false);
		expect(byId.get('log.timestamp')?.enableRemove).toBe(false);
		// User-added fields stay removable. User field has type='' so composite
		// collapses to bare name.
		expect(byId.get('user_field')?.enableRemove).toBe(true);
	});

	it('renders only the stateIndicator when fields is empty', () => {
		const { result } = renderHook(() =>
			useLogsTableColumns({
				fields: [],
				fontSize: FontSize.SMALL,
			}),
		);

		expect(result.current.map((c) => c.id)).toStrictEqual(['state-indicator']);
	});
});
