import { render, screen } from '@testing-library/react';
import { EQueryType } from 'types/common/dashboard';

import PlotTag from '../PlotTag';

describe('PlotTag', () => {
	it('renders the resolved query mode', () => {
		render(<PlotTag queryType={EQueryType.PROM} isListViewPanel={false} />);
		expect(screen.getByTestId('panel-editor-plot-tag')).toBeInTheDocument();
		expect(screen.getByText('PromQL')).toBeInTheDocument();
	});

	it('renders nothing when there is no query yet', () => {
		render(<PlotTag queryType={undefined} isListViewPanel={false} />);
		expect(screen.queryByTestId('panel-editor-plot-tag')).not.toBeInTheDocument();
	});

	it('renders nothing for a list panel (query mode is irrelevant)', () => {
		render(<PlotTag queryType={EQueryType.QUERY_BUILDER} isListViewPanel />);
		expect(screen.queryByTestId('panel-editor-plot-tag')).not.toBeInTheDocument();
	});
});
