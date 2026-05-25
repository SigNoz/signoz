import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { getFlamegraphSpanGroupValue, getSpanColor } from '../utils';
import { MOCK_SPAN } from './testUtils';

const mockGenerateColor = jest.fn();

jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: (key: string, colorMap: Record<string, string>): string =>
		mockGenerateColor(key, colorMap),
}));

const SERVICE_FIELD: TelemetryFieldKey = {
	name: 'service.name',
	fieldContext: 'resource',
	fieldDataType: 'string',
};
const HOST_FIELD: TelemetryFieldKey = {
	name: 'host.name',
	fieldContext: 'resource',
	fieldDataType: 'string',
};

describe('Presentation / Styling Utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGenerateColor.mockReturnValue('#2F80ED');
	});

	describe('getSpanColor', () => {
		it('uses generated colour from groupValue for normal span', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: false },
				isDarkMode: false,
				groupValue: 'my-bucket',
			});

			expect(mockGenerateColor).toHaveBeenCalledWith(
				'my-bucket',
				expect.any(Object),
			);
			expect(color).toBe('#1890ff');
		});

		it('overrides with error color in light mode when span has error', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: true },
				isDarkMode: false,
				groupValue: 'my-bucket',
			});

			expect(color).toBe('rgb(220, 38, 38)');
		});

		it('overrides with error color in dark mode when span has error', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: true },
				isDarkMode: true,
				groupValue: 'my-bucket',
			});

			expect(color).toBe('rgb(239, 68, 68)');
		});
	});

	describe('getFlamegraphSpanGroupValue', () => {
		it('returns resource[field.name] when present', () => {
			const value = getFlamegraphSpanGroupValue(
				{
					serviceName: 'legacy',
					resource: { 'service.name': 'svc-from-resource' },
				},
				SERVICE_FIELD,
			);
			expect(value).toBe('svc-from-resource');
		});

		it('falls back to top-level serviceName for service.name when resource is empty', () => {
			const value = getFlamegraphSpanGroupValue(
				{ serviceName: 'svc-legacy', resource: {} },
				SERVICE_FIELD,
			);
			expect(value).toBe('svc-legacy');
		});

		it('returns "unknown" for non-service fields when resource is missing', () => {
			const value = getFlamegraphSpanGroupValue(
				{ serviceName: 'svc', resource: {} },
				HOST_FIELD,
			);
			expect(value).toBe('unknown');
		});

		it('reads host.name from resource when present', () => {
			const value = getFlamegraphSpanGroupValue(
				{
					serviceName: 'svc',
					resource: { 'host.name': 'host-1' },
				},
				HOST_FIELD,
			);
			expect(value).toBe('host-1');
		});
	});
});
