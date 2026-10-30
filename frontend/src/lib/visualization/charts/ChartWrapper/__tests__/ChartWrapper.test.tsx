import { render } from 'tests/test-utils';
import type uPlot from 'uplot';

import { LegendPosition } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';

import ChartWrapper from '../ChartWrapper';

const FAKE_PLOT = { id: 'plot' } as unknown as uPlot;

jest.mock('lib/uPlotV2/components/UPlotChart/UPlotChart', () => ({
	__esModule: true,
	default: ({ plotRef }: { plotRef?: (plot: uPlot | null) => void }): null => {
		plotRef?.(FAKE_PLOT);
		return null;
	},
}));

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('ChartWrapper', () => {
	it('hands the plot instance to the caller', () => {
		const plotRef = jest.fn();
		render(
			<ChartWrapper
				config={new UPlotConfigBuilder({ id: 'chart' })}
				data={[[1], [2]]}
				width={400}
				height={300}
				legendConfig={{ position: LegendPosition.BOTTOM }}
				showLegend={false}
				showTooltip={false}
				plotRef={plotRef}
			/>,
		);

		expect(plotRef).toHaveBeenCalledWith(FAKE_PLOT);
	});
});
