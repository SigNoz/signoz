import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { mergeExtraFields } from '../extraFields';

describe('mergeExtraFields', () => {
	it('drops fetched keys that share a composite key with an extra field', () => {
		expect(
			mergeExtraFields(
				[{ name: 'trace_id' } as TelemetryFieldKey],
				[
					{ name: 'trace_id' } as TelemetryFieldKey,
					{ name: 'total_tokens' } as TelemetryFieldKey,
				],
			).map((key) => key.name),
		).toStrictEqual(['trace_id', 'total_tokens']);
	});

	it('keeps extra and fetched keys that share a name but differ in context', () => {
		expect(
			mergeExtraFields(
				[{ name: 'service.name', fieldContext: 'resource' } as TelemetryFieldKey],
				[
					{
						name: 'service.name',
						fieldContext: 'attribute',
					} as TelemetryFieldKey,
					{ name: 'total_tokens' } as TelemetryFieldKey,
				],
			),
		).toStrictEqual([
			{ name: 'service.name', fieldContext: 'resource' },
			{ name: 'service.name', fieldContext: 'attribute' },
			{ name: 'total_tokens' },
		]);
	});

	it('returns the fetched keys when there are no extra fields', () => {
		expect(
			mergeExtraFields(undefined, [
				{ name: 'total_tokens' } as TelemetryFieldKey,
			]).map((key) => key.name),
		).toStrictEqual(['total_tokens']);
	});
});
