import React from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';
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
	return ({
		data: [[1], []],
		cursor: { idx: cursorIdx },
		// The rest of the uPlot fields are not used by Tooltip
	} as unknown) as uPlot;
}

function renderTooltip(props: Partial<TooltipTestProps> = {}): RenderResult {
	const defaultProps: TooltipTestProps = {
		uPlotInstance: createUPlotInstance(null),
		timezone: 'UTC',
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

	it('renders lightMode class when dark mode is disabled', () => {
		const uPlotInstance = createUPlotInstance(null);
		mockUseIsDarkMode.mockReturnValue(false);

		renderTooltip({ uPlotInstance });

		const container = screen.getByTestId('uplot-tooltip-container');

		expect(container).toHaveClass('lightMode');
		expect(container).not.toHaveClass('darkMode');
	});

	it('renders darkMode class when dark mode is enabled', () => {
		const uPlotInstance = createUPlotInstance(null);
		mockUseIsDarkMode.mockReturnValue(true);

		renderTooltip({ uPlotInstance });

		const container = screen.getByTestId('uplot-tooltip-container');

		expect(container).toHaveClass('darkMode');
		expect(container).not.toHaveClass('lightMode');
	});

	it('renders tooltip items when content is provided', () => {
		const uPlotInstance = createUPlotInstance(null);
		const content = [createTooltipContent()];

		renderTooltip({ uPlotInstance, content });

		const list = screen.queryByTestId('uplot-tooltip-list');

		expect(list).not.toBeNull();

		const marker = screen.getByTestId('uplot-tooltip-item-marker');
		const itemContent = screen.getByTestId('uplot-tooltip-item-content');

		expect(marker).toHaveStyle({ borderColor: '#ff0000' });
		expect(itemContent).toHaveStyle({ color: '#ff0000', fontWeight: '700' });
		expect(itemContent).toHaveTextContent('Series A: 10');
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
		expect(list).toHaveStyle({ height: '210px' });
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
