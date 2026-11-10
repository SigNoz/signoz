import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { readFormatting, writeFormatting } from '../formattingSpec';

function makeSpec(formatting?: unknown): DashboardtypesPanelSpecDTO {
	return {
		plugin: {
			kind: 'signoz/TimeSeriesPanel',
			spec: formatting ? { formatting } : {},
		},
	} as unknown as DashboardtypesPanelSpecDTO;
}

describe('formattingSpec', () => {
	it('reads the formatting slice (undefined when absent)', () => {
		expect(readFormatting(makeSpec())).toBeUndefined();
		expect(readFormatting(makeSpec({ unit: 'bytes' }))).toStrictEqual({
			unit: 'bytes',
		});
	});

	it('merges the patch into the formatting slice, preserving other fields', () => {
		const next = writeFormatting(makeSpec({ decimalPrecision: '2' }), {
			unit: 'bytes',
		});
		expect(readFormatting(next)).toStrictEqual({
			decimalPrecision: '2',
			unit: 'bytes',
		});
	});

	it('does not mutate the input spec', () => {
		const spec = makeSpec({ unit: 'ms' });
		writeFormatting(spec, { unit: 'bytes' });
		expect(readFormatting(spec)).toStrictEqual({ unit: 'ms' });
	});
});
