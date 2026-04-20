import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import LicenseKeyRow from '../LicenseKeyRow';

const mockCopyToClipboard = jest.fn();

jest.mock('react-use', () => ({
	__esModule: true,
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopyToClipboard],
}));

const mockToastSuccess = jest.fn();

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
	toast: {
		success: (...args: unknown[]): unknown => mockToastSuccess(...args),
	},
}));

describe('LicenseKeyRow', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders nothing when activeLicense key is absent', () => {
		const { container } = render(<LicenseKeyRow />, undefined, {
			appContextOverrides: { activeLicense: null },
		});

		expect(container).toBeEmptyDOMElement();
	});

	it('renders label and masked key when activeLicense key exists', () => {
		render(<LicenseKeyRow />, undefined, {
			appContextOverrides: {
				activeLicense: { key: 'abcdefghij' } as any,
			},
		});

		expect(screen.getByText('SigNoz License Key')).toBeInTheDocument();
		expect(screen.getByText('ab·······ij')).toBeInTheDocument();
	});

	it('calls copyToClipboard and shows success toast when clipboard is available', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<LicenseKeyRow />);

		await user.click(screen.getByRole('button', { name: /copy license key/i }));

		await waitFor(() => {
			expect(mockCopyToClipboard).toHaveBeenCalledWith('test-key');
			expect(mockToastSuccess).toHaveBeenCalledWith(
				'License key copied to clipboard.',
				{
					richColors: true,
				},
			);
		});
	});
});
