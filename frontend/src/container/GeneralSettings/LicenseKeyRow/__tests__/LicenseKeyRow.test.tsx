import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import useActiveLicenseKey from 'hooks/useActiveLicenseKey/useActiveLicenseKey';

import LicenseKeyRow from '../LicenseKeyRow';

jest.mock('hooks/useActiveLicenseKey/useActiveLicenseKey');
const mockUseActiveLicenseKey = useActiveLicenseKey as jest.MockedFunction<
	typeof useActiveLicenseKey
>;

const mockCopyToClipboard = jest.fn();

jest.mock('react-use', () => ({
	__esModule: true,
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopyToClipboard],
}));

const mockToastSuccess = jest.fn();

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: (...args: unknown[]): unknown => mockToastSuccess(...args),
	},
}));

describe('LicenseKeyRow', () => {
	afterEach(() => {
		jest.clearAllMocks();
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
