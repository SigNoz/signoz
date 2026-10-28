import type { DashboardtypesScatterPlotPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getJoinedScalarTable } from '../../../../utils/getJoinedScalarTable';
import { ScatterPlotDataStatus, type ScatterPlotData } from '../../types';
import { getScatterPlotData } from '../getScatterPlotData';
import { prepareScatterPlotData } from '../prepareData';

jest.mock('../../../../utils/getJoinedScalarTable');
jest.mock('../prepareData');

const mockPrepare = jest.mocked(prepareScatterPlotData);

function makeData(): PanelQueryData {
	return { response: undefined, requestPayload: undefined, legendMap: {} };
}

describe('getScatterPlotData', () => {
	beforeEach(() => {
		jest.mocked(getJoinedScalarTable).mockReturnValue(undefined);
		mockPrepare.mockImplementation(
			() => ({ status: ScatterPlotDataStatus.Ready }) as ScatterPlotData,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('prepares a response once for the same spec', () => {
		const data = makeData();
		const spec: DashboardtypesScatterPlotPanelSpecDTO = {
			dimensions: { x: 'A', y: 'B' },
		};

		const first = getScatterPlotData(data, spec);
		const second = getScatterPlotData(data, spec);

		expect(second).toBe(first);
		expect(mockPrepare).toHaveBeenCalledTimes(1);
	});

	it('prepares again when the dimensions change', () => {
		const data = makeData();

		getScatterPlotData(data, { dimensions: { x: 'A', y: 'B' } });
		getScatterPlotData(data, { dimensions: { x: 'B', y: 'A' } });

		expect(mockPrepare).toHaveBeenCalledTimes(2);
	});

	it('prepares each response separately', () => {
		const spec: DashboardtypesScatterPlotPanelSpecDTO = {};

		getScatterPlotData(makeData(), spec);
		getScatterPlotData(makeData(), spec);

		expect(mockPrepare).toHaveBeenCalledTimes(2);
	});
});
