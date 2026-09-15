import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { mergeStaticFields } from '../staticFields';

describe('mergeStaticFields', () => {
	it('drops fetched keys that share a name with a static field', () => {
		expect(
			mergeStaticFields(
				[{ name: 'trace_id' } as TelemetryFieldKey],
				[
					{ name: 'trace_id' } as TelemetryFieldKey,
					{ name: 'total_tokens' } as TelemetryFieldKey,
				],
				'',
			).map((key) => key.name),
		).toStrictEqual(['trace_id', 'total_tokens']);
	});

	it('filters static fields by search text', () => {
		expect(
			mergeStaticFields(
				[
					{ name: 'last_activity_time' } as TelemetryFieldKey,
					{ name: 'timestamp' } as TelemetryFieldKey,
				],
				[],
				'activity',
			).map((key) => key.name),
		).toStrictEqual(['last_activity_time']);
	});

	it('returns the fetched keys when there are no static fields', () => {
		expect(
			mergeStaticFields(
				undefined,
				[{ name: 'total_tokens' } as TelemetryFieldKey],
				'',
			).map((key) => key.name),
		).toStrictEqual(['total_tokens']);
	});
});
