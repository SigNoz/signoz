import type { MockedFunction } from 'vitest';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import useActiveLicenseKey from 'hooks/useActiveLicenseKey/useActiveLicenseKey';

import LicenseKeyRow from '../LicenseKeyRow';

vi.mock('hooks/useActiveLicenseKey/useActiveLicenseKey');
const mockUseActiveLicenseKey = useActiveLicenseKey as MockedFunction<
	typeof useActiveLicenseKey
>;

const { mockCopyToClipboard } = vi.hoisted(() => ({
	mockCopyToClipboard: vi.fn(),
}));

vi.mock('react-use', () => ({
	useCopyToClipboard: (): [unknown, typeof mockCopyToClipboard] => [
		null,
		mockCopyToClipboard,
	],
}));

const { mockToastSuccess } = vi.hoisted(() => ({
	mockToastSuccess: vi.fn(),
}));

vi.mock('@signozhq/ui/sonner', async () => ({
	...(await vi.importActual('@signozhq/ui/sonner')),
	toast: {
		success: (...args: unknown[]): unknown => mockToastSuccess(...args),
	},
}));

describe('LicenseKeyRow', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders nothing when the license key is absent', () => {
		mockUseActiveLicenseKey.mockReturnValue({
			licenseKey: undefined,
			isLoading: false,
		});
		const { container } = render(<LicenseKeyRow />);

		expect(container).toBeEmptyDOMElement();
	});

	it('renders label and masked key when the license key exists', () => {
		mockUseActiveLicenseKey.mockReturnValue({
			licenseKey: 'abcdefghij',
			isLoading: false,
		});
		render(<LicenseKeyRow />);

		expect(screen.getByText('SigNoz License Key')).toBeInTheDocument();
		expect(screen.getByText('ab·······ij')).toBeInTheDocument();
	});

	it('calls copyToClipboard and shows success toast when clipboard is available', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockUseActiveLicenseKey.mockReturnValue({
			licenseKey: 'test-key',
			isLoading: false,
		});
		render(<LicenseKeyRow />);

		await user.click(screen.getByRole('button', { name: /copy license key/i }));

		await waitFor(() => {
			expect(mockCopyToClipboard).toHaveBeenCalledWith('test-key');
			expect(mockToastSuccess).toHaveBeenCalledWith(
				'License key copied to clipboard.',
			);
		});
	});
});
