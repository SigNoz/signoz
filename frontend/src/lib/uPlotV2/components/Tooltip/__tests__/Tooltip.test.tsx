import React from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';
import userEvent from '@testing-library/user-event';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { render, RenderResult, screen } from 'tests/test-utils';
import uPlot from 'uplot';

import { TooltipContentItem } from '../../types';
import Tooltip from '../Tooltip';

type MockVirtuosoProps = {
	data: TooltipContentItem[];
	itemContent: (index: number, item: TooltipContentItem) => React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
	totalListHeightChanged?: (height: number) => void;
	'data-testid'?: string;
};

let mockTotalListHeight = 200;

jest.mock('react-virtuoso', () => {
	const actual = jest.requireActual('react-virtuoso');

	return {
		...actual,
		Virtuoso: ({
			data,
			itemContent,
			className,
			style,
			totalListHeightChanged,
			'data-testid': dataTestId,
		}: MockVirtuosoProps): JSX.Element => {
			if (totalListHeightChanged) {
				// Simulate Virtuoso reporting total list height
				totalListHeightChanged(mockTotalListHeight);
			}

			return (
				<div className={className} style={style} data-testid={dataTestId}>
					{data.map((item, index) => (
						<div key={item.label ?? index.toString()}>{itemContent(index, item)}</div>
					))}
				</div>
			);
		},
	};
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn(),
}));

const mockUseIsDarkMode = useIsDarkMode as jest.MockedFunction<
	typeof useIsDarkMode
>;

type TooltipTestProps = React.ComponentProps<typeof Tooltip>;

function createTooltipContent(
	overrides: Partial<TooltipContentItem> = {},
): TooltipContentItem {
	return {
		label: 'Series A',
		value: 10,
		tooltipValue: '10',
		color: '#ff0000',
		isActive: true,
		...overrides,
	};
}

function createUPlotInstance(cursorIdx: number | null): uPlot {
	return {
		data: [[1], []],
		cursor: { idx: cursorIdx },
		// The rest of the uPlot fields are not used by Tooltip
	} as unknown as uPlot;
}

function renderTooltip(props: Partial<TooltipTestProps> = {}): RenderResult {
	const defaultProps: TooltipTestProps = {
		uPlotInstance: createUPlotInstance(null),
		timezone: { value: 'UTC', name: 'UTC', offset: '0', searchIndex: '0' },
		content: [],
		showTooltipHeader: true,
		// TooltipRenderArgs (not used directly in component but required by type)
		dataIndexes: [],
		seriesIndex: null,
		isPinned: false,
		dismiss: jest.fn(),
		viaSync: false,
	} as TooltipTestProps;

	return render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 300, itemHeight: 38 }}>
			<Tooltip {...defaultProps} {...props} />
		</VirtuosoMockContext.Provider>,
	);
}

describe('Tooltip', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsDarkMode.mockReturnValue(false);
		mockTotalListHeight = 200;
	});

	it('renders header title when showTooltipHeader is true and cursor index is present', () => {
		const uPlotInstance = createUPlotInstance(0);

		renderTooltip({ uPlotInstance });

		const expectedTitle = dayjs(1 * 1000)
			.tz('UTC')
			.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);

		expect(screen.getByText(expectedTitle)).toBeInTheDocument();
	});

	it('does not render header when showTooltipHeader is false', () => {
		const uPlotInstance = createUPlotInstance(0);

		renderTooltip({ uPlotInstance, showTooltipHeader: false });

		const unexpectedTitle = dayjs(1 * 1000)
			.tz('UTC')
			.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);

		expect(screen.queryByText(unexpectedTitle)).not.toBeInTheDocument();
	});

	it('renders single active item in header only, without a list', () => {
		const uPlotInstance = createUPlotInstance(null);
		const content = [createTooltipContent({ isActive: true })];

		renderTooltip({ uPlotInstance, content });

		// Active item is shown in the header, not duplicated in a list
		expect(screen.queryByTestId('uplot-tooltip-list')).toBeNull();
		expect(screen.getByTestId('uplot-tooltip-pinned')).toBeInTheDocument();
		const pinnedContent = screen.getByTestId('uplot-tooltip-pinned-content');
		expect(pinnedContent).toHaveTextContent('Series A');
		expect(pinnedContent).toHaveTextContent('10');
	});

	it('renders list when multiple series are present', () => {
		const uPlotInstance = createUPlotInstance(null);
		const content = [
			createTooltipContent({ isActive: true }),
			createTooltipContent({ label: 'Series B', isActive: false }),
		];

		renderTooltip({ uPlotInstance, content });

		expect(screen.getByTestId('uplot-tooltip-list')).toBeInTheDocument();
	});

	it('does not render tooltip list when content is empty', () => {
		const uPlotInstance = createUPlotInstance(null);

		renderTooltip({ uPlotInstance, content: [] });

		const list = screen.queryByTestId('uplot-tooltip-list');

		expect(list).toBeNull();
	});

	it('sets tooltip list height based on content length, height returned by Virtuoso', () => {
		const uPlotInstance = createUPlotInstance(null);
		const content = [createTooltipContent(), createTooltipContent()];

		renderTooltip({ uPlotInstance, content });

		const list = screen.getByTestId('uplot-tooltip-list');
		expect(list).toHaveStyle({ height: '200px' });
	});

	it('sets tooltip list height based on content length when Virtuoso reports 0 height', () => {
		const uPlotInstance = createUPlotInstance(null);
		const content = [createTooltipContent(), createTooltipContent()];
		mockTotalListHeight = 0;

		renderTooltip({ uPlotInstance, content });

		const list = screen.getByTestId('uplot-tooltip-list');
		// Falls back to content length: 2 items * 38px = 76px
		expect(list).toHaveStyle({ height: '76px' });
	});
});

describe('Tooltip footer hint', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsDarkMode.mockReturnValue(false);
	});

	it('renders footer with "Press P to pin the tooltip" hint when not pinned', () => {
		renderTooltip({ isPinned: false, canPinTooltip: true });

		const footer = screen.getByTestId('uplot-tooltip-footer');
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveTextContent('Press');
		expect(footer).toHaveTextContent('P');
		expect(footer).toHaveTextContent('to pin the tooltip');
	});

	it('renders footer with "Press P or Esc to unpin" hint when pinned', () => {
		renderTooltip({ isPinned: true, canPinTooltip: true });

		const footer = screen.getByTestId('uplot-tooltip-footer');
		expect(footer).toHaveTextContent('Press');
		expect(footer).toHaveTextContent('P');
		expect(footer).toHaveTextContent('Esc');
		expect(footer).toHaveTextContent('to unpin');
	});

	it('does not render Unpin button when not pinned', () => {
		renderTooltip({ isPinned: false, canPinTooltip: true });

		expect(screen.queryByTestId('uplot-tooltip-unpin')).not.toBeInTheDocument();
	});

	it('renders Unpin button when pinned', () => {
		renderTooltip({ isPinned: true, canPinTooltip: true });

		const unpinBtn = screen.getByTestId('uplot-tooltip-unpin');
		expect(unpinBtn).toBeInTheDocument();
		expect(unpinBtn).toHaveAttribute('aria-label', 'Unpin tooltip');
	});

	it('calls dismiss when Unpin button is clicked', async () => {
		const dismiss = jest.fn();
		renderTooltip({ isPinned: true, canPinTooltip: true, dismiss });

		const user = userEvent.setup();
		const unpinBtn = screen.getByTestId('uplot-tooltip-unpin');
		await user.click(unpinBtn);

		expect(dismiss).toHaveBeenCalledTimes(1);
	});

	it('footer has role="status" for screen reader announcements', () => {
		renderTooltip({ canPinTooltip: true });

		const footer = screen.getByRole('status');
		expect(footer).toBeInTheDocument();
	});
});

describe('Tooltip header status pill', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseIsDarkMode.mockReturnValue(false);
	});

	it('shows Pinned status when pinned and header is visible', () => {
		const uPlotInstance = createUPlotInstance(0);

		renderTooltip({ uPlotInstance, isPinned: true });

		expect(screen.getByText('Pinned')).toBeInTheDocument();
	});

	it('does not render status pill when showTooltipHeader is false', () => {
		const uPlotInstance = createUPlotInstance(0);

		renderTooltip({ uPlotInstance, showTooltipHeader: false, isPinned: false });

		expect(screen.queryByTestId('uplot-tooltip-status')).not.toBeInTheDocument();
	});
});
