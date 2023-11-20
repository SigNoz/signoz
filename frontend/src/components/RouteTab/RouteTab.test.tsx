import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import RouteTab from './index';
import { RouteTabProps } from './types';

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
	test('renders correctly', () => {
		const history = createMemoryHistory();
		render(
			<Router history={history}>
				<RouteTab history={history} routes={testRoutes} activeKey="Tab1" />
			</Router>,
		);
		expect(screen.getByRole('tab', { name: 'Tab1' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Tab2' })).toBeInTheDocument();
	});

	test('renders correct number of tabs', () => {
		const history = createMemoryHistory();
		render(
			<Router history={history}>
				<RouteTab history={history} routes={testRoutes} activeKey="Tab1" />
			</Router>,
		);
		const tabs = screen.getAllByRole('tab');
		expect(tabs.length).toBe(testRoutes.length);
	});

	test('sets provided activeKey as active tab', () => {
		const history = createMemoryHistory();
		render(
			<Router history={history}>
				<RouteTab history={history} routes={testRoutes} activeKey="Tab2" />
			</Router>,
		);
		expect(
			screen.getByRole('tab', { name: 'Tab2', selected: true }),
		).toBeInTheDocument();
	});

	test('navigates to correct route on tab click', () => {
		const history = createMemoryHistory();
		render(
			<Router history={history}>
				<RouteTab history={history} routes={testRoutes} activeKey="Tab1" />
			</Router>,
		);
		expect(history.location.pathname).toBe('/');
		fireEvent.click(screen.getByRole('tab', { name: 'Tab2' }));
		expect(history.location.pathname).toBe('/tab2');
	});

	test('calls onChangeHandler on tab change', () => {
		const onChangeHandler = jest.fn();
		const history = createMemoryHistory();
		render(
			<Router history={history}>
				<RouteTab
					routes={testRoutes}
					activeKey="Tab1"
					onChangeHandler={onChangeHandler}
					history={history}
				/>
			</Router>,
		);
		fireEvent.click(screen.getByRole('tab', { name: 'Tab2' }));
		expect(onChangeHandler).toHaveBeenCalled();
	});
});
