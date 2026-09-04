import { render, screen } from '@testing-library/react';
import { EQueryType } from 'types/common/dashboard';

import PlotTag from '../PlotTag';

describe('PlotTag', () => {
	it('renders the resolved query mode', () => {
		render(<PlotTag queryType={EQueryType.PROM} />);
		expect(screen.getByTestId('panel-editor-plot-tag')).toBeInTheDocument();
		expect(screen.getByText('PromQL')).toBeInTheDocument();
	});

	it('renders nothing when there is no query yet', () => {
		render(<PlotTag queryType={undefined} />);
		expect(screen.queryByTestId('panel-editor-plot-tag')).not.toBeInTheDocument();
	});
});
