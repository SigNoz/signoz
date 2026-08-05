import { render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import PlotTag from '../PlotTag';

describe('PlotTag', () => {
	it('renders the resolved query mode', () => {
		render(
			<PlotTag queryType={EQueryType.PROM} panelType={PANEL_TYPES.TIME_SERIES} />,
		);
		expect(screen.getByTestId('panel-editor-plot-tag')).toBeInTheDocument();
		expect(screen.getByText('PromQL')).toBeInTheDocument();
	});

	it('renders nothing when there is no query yet', () => {
		render(<PlotTag queryType={undefined} panelType={PANEL_TYPES.TIME_SERIES} />);
		expect(screen.queryByTestId('panel-editor-plot-tag')).not.toBeInTheDocument();
	});

	it('renders nothing for list panels (query mode is irrelevant)', () => {
		render(
			<PlotTag
				queryType={EQueryType.QUERY_BUILDER}
				panelType={PANEL_TYPES.LIST}
			/>,
		);
		expect(screen.queryByTestId('panel-editor-plot-tag')).not.toBeInTheDocument();
	});
});
