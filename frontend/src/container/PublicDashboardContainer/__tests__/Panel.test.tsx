import { PANEL_TYPES } from 'constants/queryBuilder';
import { render } from 'tests/test-utils';
import { Widgets } from 'types/api/dashboard/getAll';

import Panel from '../Panel';

const useGetQueryRangeMock = jest.fn();

jest.mock('hooks/queryBuilder/useGetQueryRange', () => ({
	useGetQueryRange: (...args: unknown[]): unknown => {
		useGetQueryRangeMock(...args);
		return {
			data: undefined,
			isFetching: false,
			isLoading: false,
			isSuccess: true,
			isError: false,
		};
	},
}));

const widgetGraphProps = jest.fn();

jest.mock('container/GridCardLayout/GridCard/WidgetGraphComponent', () => ({
	__esModule: true,
	default: (props: { setRequestData?: unknown }): JSX.Element => {
		widgetGraphProps(props);
		return <div data-testid="widget-graph" />;
	},
}));

const buildWidget = (id: string): Widgets =>
	({
		id,
		panelTypes: PANEL_TYPES.LIST,
		query: {
			builder: {
				queryData: [{ dataSource: 'logs', limit: 100, orderBy: [] }],
			},
		},
		timePreferance: 'GLOBAL_TIME',
	}) as unknown as Widgets;

describe('Public dashboard Panel', () => {
	beforeEach(() => {
		useGetQueryRangeMock.mockClear();
		widgetGraphProps.mockClear();
	});

	it('forwards a setRequestData setter so LIST panels render (bug 3646)', () => {
		render(
			<Panel
				widget={buildWidget('widget-a')}
				index={0}
				dashboardId="dash-1"
				startTime={100}
				endTime={200}
			/>,
		);

		const props = widgetGraphProps.mock.calls[0][0];
		expect(typeof props.setRequestData).toBe('function');
	});

	it('keys each panel by widget id + index so identical queries do not collide (bug 5503)', () => {
		render(
			<>
				<Panel
					widget={buildWidget('widget-a')}
					index={2}
					dashboardId="dash-1"
					startTime={100}
					endTime={200}
				/>
				<Panel
					widget={buildWidget('widget-b')}
					index={62}
					dashboardId="dash-1"
					startTime={100}
					endTime={200}
				/>
			</>,
		);

		const [callA, callB] = useGetQueryRangeMock.mock.calls;
		const queryKeyA = callA[2].queryKey;
		const metaA = callA[4];
		const queryKeyB = callB[2].queryKey;
		const metaB = callB[4];

		// Key is panel identity + time only — the redacted query body is not part
		// of it, so identical query bodies can't collapse two panels onto one key.
		expect(queryKeyA).toStrictEqual(['widget-a', 2, 100, 200]);
		expect(queryKeyB).toStrictEqual(['widget-b', 62, 100, 200]);
		expect(queryKeyA).not.toStrictEqual(queryKeyB);

		expect(metaA.widgetIndex).toBe(2);
		expect(metaB.widgetIndex).toBe(62);
	});
});
