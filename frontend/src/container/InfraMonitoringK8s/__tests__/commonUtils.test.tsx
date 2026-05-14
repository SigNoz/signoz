import { render, screen } from '@testing-library/react';

import { EntityProgressBar } from '../components';
import { EventContents } from '../commonUtils';

jest.mock('components/ResizeTable', () => ({
	ResizeTable: ({ dataSource }: { dataSource: unknown }): JSX.Element => (
		<div data-testid="resize-table">{JSON.stringify(dataSource)}</div>
	),
}));

jest.mock('container/LogDetailedView/FieldRenderer', () => ({
	__esModule: true,
	default: ({ field }: { field: string }): JSX.Element => <span>{field}</span>,
}));

describe('commonUtils', () => {
	it('renders EntityProgressBar with percentage value', () => {
		render(<EntityProgressBar value={0.5} type="request" />);
		expect(screen.getByText('50%')).toBeInTheDocument();
	});

	it('renders EntityProgressBar with dash for NaN value', () => {
		render(<EntityProgressBar value={NaN} type="limit" />);
		expect(screen.getByText('-')).toBeInTheDocument();
	});

	it('renders EventContents with data fields', () => {
		render(
			<EventContents data={{ namespace: 'default', cluster: 'prod-cluster' }} />,
		);

		const resizeTable = screen.getByTestId('resize-table');
		expect(resizeTable).toHaveTextContent('namespace');
		expect(resizeTable).toHaveTextContent('prod-cluster');
	});
});
