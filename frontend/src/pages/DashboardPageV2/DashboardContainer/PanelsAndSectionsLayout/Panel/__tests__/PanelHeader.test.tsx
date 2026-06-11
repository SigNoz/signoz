import { render, screen } from '@testing-library/react';
import type { Warning } from 'types/api';

import PanelHeader from '../PanelHeader';

const baseProps = {
	title: 'My panel',
	kind: 'TimeSeries',
	panelId: 'panel-1',
	isFetching: false,
};

const warning: Warning = {
	code: 'partial_data',
	message: 'Some series were dropped',
	url: '',
	warnings: [],
};

describe('PanelHeader status indicators', () => {
	it('shows the error indicator whenever an error is present', () => {
		render(<PanelHeader {...baseProps} error={new Error('boom')} />);
		expect(screen.getByTestId('panel-status-error')).toBeInTheDocument();
	});

	it('shows the warning indicator whenever a warning is present', () => {
		render(<PanelHeader {...baseProps} warning={warning} />);
		expect(screen.getByTestId('panel-status-warning')).toBeInTheDocument();
	});

	it('renders no status indicators when there is no error or warning', () => {
		render(<PanelHeader {...baseProps} />);
		expect(screen.queryByTestId('panel-status-error')).not.toBeInTheDocument();
		expect(screen.queryByTestId('panel-status-warning')).not.toBeInTheDocument();
	});
});
