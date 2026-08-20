import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { EntityMetadataItem } from '../EntityMetadataItem';

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

/** jsdom reports 0 for both, so the truncated path needs the overflow faked. */
function fakeTruncation(scrollWidth: number, clientWidth: number): () => void {
	const scroll = jest
		.spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
		.mockReturnValue(scrollWidth);
	const client = jest
		.spyOn(HTMLElement.prototype, 'clientWidth', 'get')
		.mockReturnValue(clientWidth);

	return (): void => {
		scroll.mockRestore();
		client.mockRestore();
	};
}

describe('EntityMetadataItem', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders the label and its value', () => {
		render(<EntityMetadataItem label="Cluster Name" value="prod-cluster" />);

		expect(screen.getByText('Cluster Name')).toBeInTheDocument();
		expect(screen.getByText('prod-cluster')).toBeInTheDocument();
	});

	it('copies the full value and confirms which field was copied', async () => {
		render(
			<EntityMetadataItem
				label="Image:Tag"
				value="ghcr.io/open-telemetry/demo:1.12.0-loadgenerator"
			/>,
		);

		await userEvent.click(screen.getByTestId('copy-metadata-image:tag'));

		await waitFor(() => {
			expect(mockCopyToClipboard).toHaveBeenCalledWith(
				'ghcr.io/open-telemetry/demo:1.12.0-loadgenerator',
			);
		});
		expect(mockToastSuccess).toHaveBeenCalledWith(
			'Image:Tag copied to clipboard',
			expect.anything(),
		);
	});

	it('offers no copy control when the value is empty', () => {
		render(<EntityMetadataItem label="Node" value="" />);

		expect(screen.queryByTestId('copy-metadata-node')).not.toBeInTheDocument();
	});

	it('exposes the full value on hover once it is truncated', async () => {
		const restore = fakeTruncation(400, 200);

		try {
			render(
				<EntityMetadataItem
					label="Node"
					value="gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-zv4t"
				/>,
			);

			await userEvent.hover(
				screen.getByText('gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-zv4t'),
			);

			await waitFor(() => {
				expect(
					screen.getAllByText('gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-zv4t').length,
				).toBeGreaterThan(1);
			});
		} finally {
			restore();
		}
	});

	it('never presents the value as clickable, truncated or not', () => {
		const restore = fakeTruncation(400, 200);

		try {
			render(<EntityMetadataItem label="Node" value="a-very-long-node-name" />);

			const valueEl = screen.getByText('a-very-long-node-name');
			expect(valueEl).not.toHaveAttribute('data-interactive');
			expect(valueEl).not.toHaveAttribute('data-truncate');
		} finally {
			restore();
		}
	});

	it('offers no tooltip for a value that fits', async () => {
		const restore = fakeTruncation(200, 200);

		try {
			render(<EntityMetadataItem label="Cluster Name" value="mgmt" />);

			await userEvent.hover(screen.getByText('mgmt'));

			await waitFor(() => {
				expect(screen.getAllByText('mgmt')).toHaveLength(1);
			});
		} finally {
			restore();
		}
	});

	it('leaves an entity-supplied renderer alone', () => {
		render(
			<EntityMetadataItem
				label="Status"
				value="running"
				renderedValue={<span data-testid="custom">custom node</span>}
			/>,
		);

		expect(screen.getByTestId('custom')).toBeInTheDocument();
		expect(screen.queryByTestId('copy-metadata-status')).not.toBeInTheDocument();
	});
});
