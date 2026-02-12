import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserEvent } from '@testing-library/user-event/dist/types/setup/setup';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';
import { useLegendActions } from 'lib/uPlotV2/hooks/useLegendActions';

jest.mock('lib/uPlotV2/context/PlotContext');

const mockUsePlotContext = usePlotContext as jest.MockedFunction<
	typeof usePlotContext
>;

describe('useLegendActions', () => {
	let onToggleSeriesVisibility: jest.Mock;
	let onToggleSeriesOnOff: jest.Mock;
	let onFocusSeriesPlot: jest.Mock;
	let setPlotContextInitialState: jest.Mock;
	let syncSeriesVisibilityToLocalStorage: jest.Mock;
	let setFocusedSeriesIndexMock: jest.Mock;
	let cancelAnimationFrameMock: jest.Mock;
	let user: UserEvent;

	beforeAll(() => {
		user = userEvent.setup();
		cancelAnimationFrameMock = jest.fn();
		(global as any).cancelAnimationFrame = cancelAnimationFrameMock;
		(global as any).requestAnimationFrame = (
			cb: FrameRequestCallback,
		): number => {
			cb(0);
			return 1;
		};
	});

	beforeEach(() => {
		onToggleSeriesVisibility = jest.fn();
		onToggleSeriesOnOff = jest.fn();
		onFocusSeriesPlot = jest.fn();
		setPlotContextInitialState = jest.fn();
		syncSeriesVisibilityToLocalStorage = jest.fn();
		setFocusedSeriesIndexMock = jest.fn();

		mockUsePlotContext.mockReturnValue({
			onToggleSeriesVisibility,
			onToggleSeriesOnOff,
			onFocusSeries: onFocusSeriesPlot,
			setPlotContextInitialState,
			syncSeriesVisibilityToLocalStorage,
		});

		cancelAnimationFrameMock.mockClear();
	});

	const TestLegendActionsComponent = ({
		focusedSeriesIndex,
	}: {
		focusedSeriesIndex: number | null;
	}): JSX.Element => {
		const {
			onLegendClick,
			onLegendMouseMove,
			onLegendMouseLeave,
		} = useLegendActions({
			setFocusedSeriesIndex: setFocusedSeriesIndexMock,
			focusedSeriesIndex,
		});

		return React.createElement(
			'div',
			{
				'data-testid': 'legend-container',
				onClick: onLegendClick,
				onMouseMove: onLegendMouseMove,
				onMouseLeave: onLegendMouseLeave,
			},
			React.createElement(
				'div',
				{ 'data-testid': 'no-legend-target' },
				'No legend',
			),
			React.createElement(
				'div',
				{ 'data-legend-item-id': '0' },
				React.createElement('div', {
					'data-testid': 'marker-0',
					'data-is-legend-marker': 'true',
				} as any),
				React.createElement('div', { 'data-testid': 'label-0' }, 'Series 0'),
			),
			React.createElement(
				'div',
				{ 'data-legend-item-id': '1' },
				React.createElement('div', {
					'data-testid': 'marker-1',
					'data-is-legend-marker': 'true',
				} as any),
				React.createElement('div', { 'data-testid': 'label-1' }, 'Series 1'),
			),
		);
	};

	describe('onLegendClick', () => {
		it('toggles series visibility when clicking on legend label', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.click(screen.getByTestId('label-0'));

			expect(onToggleSeriesVisibility).toHaveBeenCalledTimes(1);
			expect(onToggleSeriesVisibility).toHaveBeenCalledWith(0);
			expect(onToggleSeriesOnOff).not.toHaveBeenCalled();
		});

		it('toggles series on/off when clicking on marker', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.click(screen.getByTestId('marker-0'));

			expect(onToggleSeriesOnOff).toHaveBeenCalledTimes(1);
			expect(onToggleSeriesOnOff).toHaveBeenCalledWith(0);
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});

		it('does nothing when click target is not inside a legend item', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.click(screen.getByTestId('no-legend-target'));

			expect(onToggleSeriesOnOff).not.toHaveBeenCalled();
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});
	});

	describe('onFocusSeries', () => {
		it('schedules focus update and calls plot focus handler via mouse move', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.hover(screen.getByTestId('label-0'));

			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(0);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(0);
		});

		it('cancels previous animation frame before scheduling new one on subsequent mouse moves', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.hover(screen.getByTestId('label-0'));
			await user.hover(screen.getByTestId('label-1'));

			expect(cancelAnimationFrameMock).toHaveBeenCalled();
		});
	});

	describe('onLegendMouseMove', () => {
		it('focuses new series when hovering over different legend item', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: 0,
				}),
			);

			await user.hover(screen.getByTestId('label-1'));

			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(1);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(1);
		});

		it('does nothing when hovering over already focused series', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: 1,
				}),
			);

			await user.hover(screen.getByTestId('label-1'));

			expect(setFocusedSeriesIndexMock).not.toHaveBeenCalled();
			expect(onFocusSeriesPlot).not.toHaveBeenCalled();
		});
	});

	describe('onLegendMouseLeave', () => {
		it('cancels pending animation frame and clears focus state', async () => {
			render(
				React.createElement(TestLegendActionsComponent, {
					focusedSeriesIndex: null,
				}),
			);

			await user.hover(screen.getByTestId('label-0'));
			await user.unhover(screen.getByTestId('legend-container'));

			expect(cancelAnimationFrameMock).toHaveBeenCalled();
			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(null);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(null);
		});
	});
});
