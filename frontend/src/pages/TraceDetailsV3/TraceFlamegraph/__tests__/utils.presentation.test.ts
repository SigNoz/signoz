import { getSpanColor } from '../utils';
import { MOCK_SPAN } from './testUtils';

const mockGenerateColor = jest.fn();

jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: (key: string, colorMap: Record<string, string>): string =>
		mockGenerateColor(key, colorMap),
}));

describe('Presentation / Styling Utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGenerateColor.mockReturnValue('#2F80ED');
	});

	describe('getSpanColor', () => {
		it('uses generated service color for normal span', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: false },
				isDarkMode: false,
			});

			expect(mockGenerateColor).toHaveBeenCalledWith(
				MOCK_SPAN.serviceName,
				expect.any(Object),
			);
			expect(color).toBe('#1890ff');
		});

		it('overrides with error color in light mode when span has error', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: true },
				isDarkMode: false,
			});

			expect(color).toBe('rgb(220, 38, 38)');
		});

		it('overrides with error color in dark mode when span has error', () => {
			mockGenerateColor.mockReturnValue('#1890ff');

			const color = getSpanColor({
				span: { ...MOCK_SPAN, hasError: true },
				isDarkMode: true,
			});

			expect(color).toBe('rgb(239, 68, 68)');
		});

		it('passes serviceName to generateColor', () => {
			getSpanColor({
				span: { ...MOCK_SPAN, serviceName: 'my-service' },
				isDarkMode: false,
			});

			expect(mockGenerateColor).toHaveBeenCalledWith(
				'my-service',
				expect.any(Object),
			);
		});
	});
});
