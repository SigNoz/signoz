import {
	DashboardtypesTimePreferenceDTO,
	type DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { fireEvent, render, screen } from '@testing-library/react';

import { useViewPanelStore } from '../../../../store/useViewPanelStore';
import { ExtendTimeWindow } from '../extendWindow';
import NoData from '../NoData';

const mockUseExtendTimeWindow = jest.fn();
jest.mock('../useExtendTimeWindow', () => ({
	useExtendTimeWindow: (): ExtendTimeWindow => mockUseExtendTimeWindow(),
}));

const inert: ExtendTimeWindow = {
	canExtend: false,
	actionLabel: null,
	extend: jest.fn(),
};

function extender(over?: Partial<ExtendTimeWindow>): ExtendTimeWindow {
	return {
		canExtend: true,
		actionLabel: 'Extend time range',
		extend: jest.fn(),
		...over,
	};
}

/** Minimal panel whose plugin spec carries the given time preference. */
function panelWith(
	timePreference?: DashboardtypesTimePreferenceDTO,
): DashboardtypesPanelDTO {
	return {
		spec: { plugin: { spec: { visualization: { timePreference } } } },
	} as unknown as DashboardtypesPanelDTO;
}

describe('NoData', () => {
	beforeEach(() => {
		mockUseExtendTimeWindow.mockReturnValue(inert);
		useViewPanelStore.setState({ viewPanelExtendWindow: null });
	});

	it('renders the empty-state title and hint', () => {
		render(<NoData />);

		expect(screen.getByTestId('panel-no-data')).toBeInTheDocument();
		expect(screen.getByText('No data in this time range')).toBeInTheDocument();
		expect(
			screen.getByText('Nothing in the selected window. Try widening the range.'),
		).toBeInTheDocument();
	});

	it('offers to extend the window as the primary action', () => {
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(<NoData />);

		const action = screen.getByTestId('panel-no-data-action');
		expect(action).toHaveTextContent('Extend time range');
		// No retry handler → no secondary Retry button.
		expect(
			screen.queryByTestId('panel-no-data-secondary-action'),
		).not.toBeInTheDocument();
	});

	it('renders both Extend (primary) and Retry (secondary) when a retry handler is given', () => {
		const onRetry = jest.fn();
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(<NoData onRetry={onRetry} />);

		expect(screen.getByTestId('panel-no-data-action')).toHaveTextContent(
			'Extend time range',
		);
		const retry = screen.getByTestId('panel-no-data-secondary-action');
		expect(retry).toHaveTextContent('Retry');

		fireEvent.click(retry);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('falls back to Retry as the sole action when the window cannot be widened', () => {
		const onRetry = jest.fn();
		render(<NoData onRetry={onRetry} />);

		const action = screen.getByTestId('panel-no-data-action');
		expect(action).toHaveTextContent('Retry');
		expect(
			screen.queryByTestId('panel-no-data-secondary-action'),
		).not.toBeInTheDocument();

		fireEvent.click(action);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('prefers the View modal extender (store) over the global one', () => {
		const globalExtend = jest.fn();
		const storeExtend = jest.fn();
		mockUseExtendTimeWindow.mockReturnValue(extender({ extend: globalExtend }));
		useViewPanelStore.setState({
			viewPanelExtendWindow: extender({ extend: storeExtend }),
		});
		render(<NoData />);

		fireEvent.click(screen.getByTestId('panel-no-data-action'));
		expect(storeExtend).toHaveBeenCalledTimes(1);
		expect(globalExtend).not.toHaveBeenCalled();
	});

	it('renders no action when nothing can be widened and no retry handler', () => {
		render(<NoData />);

		expect(screen.queryByTestId('panel-no-data-action')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-no-data-secondary-action'),
		).not.toBeInTheDocument();
	});

	it('shows the panel loader (not the empty state) while refetching', () => {
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(<NoData isFetching />);

		expect(screen.getByTestId('panel-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('panel-no-data')).not.toBeInTheDocument();
		expect(screen.queryByTestId('panel-no-data-action')).not.toBeInTheDocument();
	});

	it('honours the data-testid override for the number panel', () => {
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(<NoData data-testid="number-panel-no-data" />);

		expect(screen.getByTestId('number-panel-no-data')).toBeInTheDocument();
	});

	it('hides the global extend action for a panel with a fixed time preference', () => {
		const onRetry = jest.fn();
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(
			<NoData
				onRetry={onRetry}
				panel={panelWith(DashboardtypesTimePreferenceDTO.last_6_hr)}
			/>,
		);

		// Only Retry — extending the dashboard window can't widen a locked panel span.
		const action = screen.getByTestId('panel-no-data-action');
		expect(action).toHaveTextContent('Retry');
		expect(
			screen.queryByTestId('panel-no-data-secondary-action'),
		).not.toBeInTheDocument();
	});

	it('still offers the global extend action for a panel that follows the global window', () => {
		mockUseExtendTimeWindow.mockReturnValue(extender());
		render(
			<NoData panel={panelWith(DashboardtypesTimePreferenceDTO.global_time)} />,
		);

		expect(screen.getByTestId('panel-no-data-action')).toHaveTextContent(
			'Extend time range',
		);
	});

	it('keeps the View modal extender even when the panel has a fixed time preference', () => {
		const storeExtend = jest.fn();
		mockUseExtendTimeWindow.mockReturnValue(extender());
		useViewPanelStore.setState({
			viewPanelExtendWindow: extender({ extend: storeExtend }),
		});
		render(
			<NoData panel={panelWith(DashboardtypesTimePreferenceDTO.last_6_hr)} />,
		);

		fireEvent.click(screen.getByTestId('panel-no-data-action'));
		expect(storeExtend).toHaveBeenCalledTimes(1);
	});
});
