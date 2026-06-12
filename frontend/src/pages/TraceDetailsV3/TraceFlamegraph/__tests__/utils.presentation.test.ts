import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { getFlamegraphSpanGroupValue, getSpanColor } from '../utils';
import { MOCK_SPAN } from './testUtils';

const mockGenerateColorPair = jest.fn();

jest.mock('pages/TraceDetailsV3/utils/generateColorPair', () => ({
	generateColorPair: (name: string): { color: string; colorDark: string } =>
		mockGenerateColorPair(name),
	RESERVED_ERROR: '#FC4E4E',
	darkenHex: (hex: string): string => hex,
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
		mockGenerateColorPair.mockReturnValue({
			color: '#2F80ED',
			colorDark: '#1a4d99',
		});
	});

	describe('getSpanColor', () => {
		it('uses generated colour from groupValue for normal span', () => {
			mockGenerateColorPair.mockReturnValue({
				color: '#1890ff',
				colorDark: '#0d5599',
			});

			const result = getSpanColor({
				span: { ...MOCK_SPAN, hasError: false },
				isDarkMode: false,
				groupValue: 'my-bucket',
			});

			expect(mockGenerateColorPair).toHaveBeenCalledWith('my-bucket');
			expect(result.color).toBe('#1890ff');
			expect(result.colorDark).toBe('#0d5599');
		});

		it('overrides with reserved error color when span has error', () => {
			const result = getSpanColor({
				span: { ...MOCK_SPAN, hasError: true },
				isDarkMode: false,
				groupValue: 'my-bucket',
			});

			expect(result.color).toBe('#FC4E4E');
			expect(result.colorDark).toBe('#FC4E4E');
		});
	});

	describe('getFlamegraphSpanGroupValue', () => {
		it('returns resource[field.name] when present', () => {
			const value = getFlamegraphSpanGroupValue(
				{ resource: { 'service.name': 'svc-from-resource' } },
				SERVICE_FIELD,
			);
			expect(value).toBe('svc-from-resource');
		});

		it('returns "unknown" for service.name when resource is empty', () => {
			const value = getFlamegraphSpanGroupValue({ resource: {} }, SERVICE_FIELD);
			expect(value).toBe('unknown');
		});

		it('returns "unknown" for non-service fields when resource is missing', () => {
			const value = getFlamegraphSpanGroupValue({ resource: {} }, HOST_FIELD);
			expect(value).toBe('unknown');
		});

		it('reads host.name from resource when present', () => {
			const value = getFlamegraphSpanGroupValue(
				{ resource: { 'host.name': 'host-1' } },
				HOST_FIELD,
			);
			expect(value).toBe('host-1');
		});
	});
});
