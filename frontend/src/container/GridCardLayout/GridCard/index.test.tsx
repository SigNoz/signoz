import { render } from 'tests/test-utils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Widgets } from 'types/api/dashboard/getAll';

import GridCardGraph from './index';

const useIntersectionObserverMock = jest.fn(() => true);

jest.mock('hooks/useIntersectionObserver', () => ({
	useIntersectionObserver: (...args: unknown[]): boolean =>
		useIntersectionObserverMock(...args),
}));

jest.mock(
	'container/DashboardContainer/visualization/hooks/useScrollWidgetIntoView',
	() => ({ useScrollWidgetIntoView: jest.fn() }),
);

jest.mock('hooks/dashboard/useVariableFetchState', () => ({
	useIsPanelWaitingOnVariable: (): boolean => false,
}));

jest.mock('hooks/queryBuilder/useGetQueryRange', () => ({
	useGetQueryRange: (): Record<string, boolean> => ({
		isFetching: false,
	}),
}));

jest.mock('./WidgetGraphComponent', () => ({
	__esModule: true,
	default: (): null => null,
}));

const widget = {
	id: 'fold-panel',
	panelTypes: PANEL_TYPES.TIME_SERIES,
	query: {
		builder: {
			queryData: [],
		},
	},
} as unknown as Widgets;

describe('GridCardGraph', () => {
	it('waits for the grid mount layout before latching panel visibility', () => {
		render(
			<GridCardGraph widget={widget} isQueryEnabled onDragSelect={jest.fn()} />,
		);

		expect(useIntersectionObserverMock).toHaveBeenCalledWith(
			expect.anything(),
			undefined,
			true,
			350,
		);
	});
});
