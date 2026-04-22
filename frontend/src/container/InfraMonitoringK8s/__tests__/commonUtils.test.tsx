import { render, screen } from '@testing-library/react';

import { EntityProgressBar, EventContents } from '../commonUtils';

jest.mock('../commonUtils.module.scss', () => ({
	__esModule: true,
	default: {
		entityProgressBar: 'entity-progress-bar-module',
		progressBar: 'progress-bar-module',
		eventContentContainer: 'event-content-container-module',
	},
}));

jest.mock('components/ResizeTable', () => ({
	ResizeTable: ({ className, dataSource }: any): JSX.Element => (
		<div data-testid="resize-table" className={className}>
			{JSON.stringify(dataSource)}
		</div>
	),
}));

jest.mock('container/LogDetailedView/FieldRenderer', () => ({
	__esModule: true,
	default: ({ field }: { field: string }): JSX.Element => <span>{field}</span>,
}));

describe('commonUtils', () => {
	it('renders EntityProgressBar with module classes', () => {
		const { container } = render(
			<EntityProgressBar value={0.5} type="request" />,
		);

		expect(container.firstChild).toHaveClass('entity-progress-bar-module');
		expect(container.querySelector('.progress-bar-module')).toBeInTheDocument();
		expect(screen.getByText('50%')).toBeInTheDocument();
	});

	it('renders EventContents with the module-scoped table class', () => {
		render(
			<EventContents data={{ namespace: 'default', cluster: 'prod-cluster' }} />,
		);

		const resizeTable = screen.getByTestId('resize-table');

		expect(resizeTable).toHaveClass('event-content-container-module');
		expect(resizeTable).toHaveTextContent('namespace');
		expect(resizeTable).toHaveTextContent('prod-cluster');
	});
});
