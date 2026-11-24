import { lazy } from 'react';
import { navigate } from 'lib/router/navigation';
import { fireEvent, render, screen, within } from 'tests/test-utils';

import RouteTab from './index';
import { RouteTabProps } from './types';

jest.mock('./RouteTab.module.scss', () => ({
	__esModule: true,
	default: { routeTab: 'routeTab' },
}));

jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

function DummyComponent1(): JSX.Element {
	return <div>Dummy Component 1</div>;
}
function DummyComponent2(): JSX.Element {
	return <div>Dummy Component 2</div>;
}

const testRoutes: RouteTabProps['routes'] = [
	{
		name: 'Tab1',
		route: '/tab1',
		Component: DummyComponent1,
		key: 'Tab1',
	},
	{
		name: 'Tab2',
		route: '/tab2',
		Component: DummyComponent2,
		key: 'Tab2',
	},
];

describe('RouteTab component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders correctly', () => {
		render(<RouteTab routes={testRoutes} activeKey="Tab1" />);
		expect(screen.getByRole('tab', { name: 'Tab1' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Tab2' })).toBeInTheDocument();
	});

	it('renders correct number of tabs', () => {
		render(<RouteTab routes={testRoutes} activeKey="Tab1" />);
		const tabs = screen.getAllByRole('tab');
		expect(tabs).toHaveLength(testRoutes.length);
	});

	it('sets provided activeKey as active tab', () => {
		render(<RouteTab routes={testRoutes} activeKey="Tab2" />);
		expect(
			screen.getByRole('tab', { name: 'Tab2', selected: true }),
		).toBeInTheDocument();
	});

	it('navigates to correct route on tab click', () => {
		render(<RouteTab routes={testRoutes} activeKey="Tab1" />);
		expect(navigate).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('tab', { name: 'Tab2' }));
		expect(navigate).toHaveBeenCalledWith('/tab2');
	});

	it('applies the layout class alongside a custom className', () => {
		render(
			<RouteTab routes={testRoutes} activeKey="Tab1" className="custom-tabs" />,
		);
		expect(screen.getByTestId('route-tab')).toHaveClass(
			'routeTab',
			'custom-tabs',
		);
	});

	it('renders the active tab content inside an overlay scrollbar', () => {
		render(<RouteTab routes={testRoutes} activeKey="Tab1" />);
		expect(
			within(screen.getByRole('tabpanel')).getByTestId('overlay-scrollbar'),
		).toHaveTextContent('Dummy Component 1');
	});

	it('calls onChangeHandler on tab change', () => {
		const onChangeHandler = jest.fn();
		render(
			<RouteTab
				routes={testRoutes}
				activeKey="Tab1"
				onChangeHandler={onChangeHandler}
			/>,
		);
		fireEvent.click(screen.getByRole('tab', { name: 'Tab2' }));
		expect(onChangeHandler).toHaveBeenCalled();
	});

	it('keeps the tab bar while a lazy tab loads', async () => {
		let resolveTab: (module: { default: () => JSX.Element }) => void = () => {};
		const LazyTab = lazy(
			() =>
				new Promise<{ default: () => JSX.Element }>((resolve) => {
					resolveTab = resolve;
				}),
		);
		render(
			<RouteTab
				routes={[{ ...testRoutes[0], Component: LazyTab }, testRoutes[1]]}
				activeKey="Tab1"
			/>,
		);

		expect(screen.getByRole('tab', { name: 'Tab1' })).toBeInTheDocument();
		expect(screen.getByTestId('route-tab-loading')).toHaveStyleRule(
			'height',
			'100%',
		);

		resolveTab({ default: DummyComponent1 });
		await expect(
			screen.findByText('Dummy Component 1'),
		).resolves.toBeInTheDocument();
	});
});
