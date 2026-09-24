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

	it('exposes the full value on hover', async () => {
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
	});

	it('never presents the value as clickable', () => {
		render(<EntityMetadataItem label="Node" value="a-very-long-node-name" />);

		const valueEl = screen.getByText('a-very-long-node-name');
		expect(valueEl).not.toHaveAttribute('data-interactive');
		expect(valueEl).not.toHaveAttribute('data-truncate');
	});

	it('triggers the tooltip from the wrapper, never from the text itself', () => {
		render(<EntityMetadataItem label="Node" value="a-very-long-node-name" />);

		// Radix merges its handlers onto the trigger, and Typography styles
		// itself interactive off any merged onClick — so the trigger has to stay
		// off the text.
		const textEl = screen.getByText('a-very-long-node-name');
		expect(textEl).not.toHaveAttribute('data-slot', 'tooltip-trigger');
		expect(textEl.parentElement).toHaveAttribute('data-slot', 'tooltip-trigger');
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
