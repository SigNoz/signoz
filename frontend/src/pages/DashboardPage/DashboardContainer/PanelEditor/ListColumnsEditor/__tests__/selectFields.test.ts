import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	readSelectFields,
	sanitizeSelectFields,
	writeSelectFields,
} from '../selectFields';

// The fields API and default-column constants carry extra runtime keys (e.g.
// `isIndexed`) the save contract rejects; only the DTO keys may be persisted.
const DIRTY_FIELD = {
	name: 'body',
	signal: 'logs',
	fieldContext: 'log',
	fieldDataType: '',
	isIndexed: false,
} as unknown as TelemetrytypesTelemetryFieldKeyDTO;

describe('selectFields', () => {
	describe('sanitizeSelectFields', () => {
		it('drops keys outside the field-key DTO (isIndexed)', () => {
			const [cleaned] = sanitizeSelectFields([DIRTY_FIELD]);

			expect('isIndexed' in cleaned).toBe(false);
			expect(cleaned).toStrictEqual({
				name: 'body',
				signal: 'logs',
				fieldContext: 'log',
				fieldDataType: '',
			});
		});

		it('omits absent optional keys rather than emitting undefined', () => {
			const [cleaned] = sanitizeSelectFields([
				{ name: 'level' } as TelemetrytypesTelemetryFieldKeyDTO,
			]);

			expect(cleaned).toStrictEqual({ name: 'level' });
		});
	});

	describe('writeSelectFields', () => {
		it('sanitizes columns as it writes them onto the spec', () => {
			const spec = {
				plugin: { kind: 'signoz/ListPanel', spec: {} },
			} as unknown as DashboardtypesPanelSpecDTO;

			const next = writeSelectFields(spec, [DIRTY_FIELD]);

			expect(readSelectFields(next)).toStrictEqual([
				{ name: 'body', signal: 'logs', fieldContext: 'log', fieldDataType: '' },
			]);
		});
	});
});
