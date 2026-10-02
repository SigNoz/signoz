import { act, fireEvent, screen, within } from '@testing-library/react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS,
	SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS,
} from '../constants';
import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	explorerUrl,
	makeView,
	queryWith,
	renderWithExplorerProviders,
} from './savedViewsTestUtils';

const mockCopy = jest.fn();

// copy-to-clipboard falls back to window.prompt in jsdom.
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopy],
}));

function twoQueries(): Query {
	const base = queryWith(DataSource.TRACES, 'has_error = true');
	const [first] = base.builder.queryData;
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				first,
				{
					...first,
					queryName: 'B',
					expression: 'B',
					filter: { expression: 'duration_nano > 1000' },
				},
			],
		},
	};
}

function metricsQuery(): Query {
	const base = initialQueriesMap[DataSource.METRICS];
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					filter: { expression: '' },
					aggregations: [
						{
							metricName: 'app.requests',
							temporality: '',
							timeAggregation: 'rate',
							spaceAggregation: 'sum',
						},
					],
				},
			],
		},
	} as Query;
}

const errors = makeView({
	id: 'view-1',
	displayName: 'Errors',
	updatedBy: 'editor@signoz.io',
	updatedAt: '2026-09-28T12:00:00Z',
});
const slow = makeView({
	id: 'view-2',
	displayName: 'Slow spans',
	expression: 'duration_nano > 1000',
});
const unfiltered = makeView({
	id: 'view-3',
	displayName: 'Everything',
	expression: '',
});
const combined = makeView({
	id: 'view-4',
	displayName: 'Errors and slow',
	query: twoQueries(),
});
const requestsMetric = makeView({
	id: 'view-5',
	displayName: 'Request rate',
	source: SavedviewtypesSourceDTO.metrics,
	dataSource: DataSource.METRICS,
	query: metricsQuery(),
	panelType: PANEL_TYPES.TIME_SERIES,
});

async function renderPanel(
	source: SavedviewtypesSourceDTO = SavedviewtypesSourceDTO.traces,
	dataSource: DataSource = DataSource.TRACES,
): Promise<void> {
	renderWithExplorerProviders(
		<SavedViewsPanel source={source} onClose={jest.fn()} />,
		explorerUrl(ROUTES.TRACES_EXPLORER, {}),
		dataSource,
	);
	await screen.findByTestId('saved-views-list');
	jest.useFakeTimers();
}

const row = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((element) => element.textContent?.includes(name)) as HTMLElement;

const card = (): HTMLElement | null =>
	screen.queryByTestId('saved-view-hover-card');

function advance(ms: number): void {
	act(() => {
		jest.advanceTimersByTime(ms);
	});
}

function openCard(name: string): void {
	fireEvent.mouseEnter(row(name));
	advance(SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS);
}

describe('SavedViewHoverCard', () => {
	beforeEach(() => {
		localStorage.clear();
		mockCopy.mockClear();
		mockSavedViewsApi([errors, slow, unfiltered, combined, requestsMetric]);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('opening and closing', () => {
		it('opens for a row after the delay, not before', async () => {
			await renderPanel();

			fireEvent.mouseEnter(row('Errors'));
			advance(SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS - 1);
			expect(card()).toBeNull();

			advance(1);
			expect(card()).toHaveTextContent('Errors');
		});

		it('does not open when the pointer leaves before the delay', async () => {
			await renderPanel();

			fireEvent.mouseEnter(row('Errors'));
			advance(SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS / 2);
			fireEvent.mouseLeave(row('Errors'));
			advance(SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS);

			expect(card()).toBeNull();
		});

		it('stays open while the pointer moves into the card', async () => {
			await renderPanel();
			openCard('Errors');

			fireEvent.mouseLeave(row('Errors'));
			fireEvent.mouseEnter(card() as HTMLElement);
			advance(SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS * 2);
			expect(card()).toBeInTheDocument();

			fireEvent.mouseLeave(card() as HTMLElement);
			advance(SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS);
			expect(card()).toBeNull();
		});

		it('closes on leaving the row and reopens for the next row after the delay', async () => {
			await renderPanel();
			openCard('Errors');

			fireEvent.mouseLeave(row('Errors'));
			fireEvent.mouseEnter(row('Slow spans'));
			advance(SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS);
			expect(card()).toBeNull();

			advance(SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS);
			expect(card()).toHaveTextContent('Slow spans');
		});

		it('closes when the row menu is pressed', async () => {
			await renderPanel();
			openCard('Errors');

			fireEvent.pointerDown(
				within(row('Errors')).getByTestId('saved-views-row-menu'),
			);

			expect(card()).toBeNull();
		});
	});

	describe('content', () => {
		it('shows the filter, the updater and the update time', async () => {
			await renderPanel();
			openCard('Errors');

			const content = card() as HTMLElement;
			expect(
				within(content).getByTestId('saved-view-hover-card-query'),
			).toHaveTextContent('has_error = true');
			expect(content).toHaveTextContent('editor@signoz.io');
			expect(content).toHaveTextContent('Sep 28, 2026');
		});

		it('copies the filter expression', async () => {
			await renderPanel();
			openCard('Errors');

			fireEvent.click(screen.getByTestId('saved-view-hover-card-copy'));

			expect(mockCopy).toHaveBeenCalledWith('has_error = true');
		});

		it('names each query when there are several, and copies them per line', async () => {
			await renderPanel();
			openCard('Errors and slow');

			const query = screen.getByTestId('saved-view-hover-card-query');
			expect(query).toHaveTextContent('A');
			expect(query).toHaveTextContent('B');
			fireEvent.click(screen.getByTestId('saved-view-hover-card-copy'));

			expect(mockCopy).toHaveBeenCalledWith(
				'A: has_error = true\nB: duration_nano > 1000',
			);
		});

		it('says there are no filters, with nothing to copy', async () => {
			await renderPanel();
			openCard('Everything');

			expect(screen.getByTestId('saved-view-hover-card-query')).toHaveTextContent(
				'No filters',
			);
			expect(screen.queryByTestId('saved-view-hover-card-copy')).toBeNull();
		});

		it('shows the metric of a metrics query', async () => {
			await renderPanel(SavedviewtypesSourceDTO.metrics, DataSource.METRICS);
			openCard('Request rate');

			const query = screen.getByTestId('saved-view-hover-card-query');
			expect(query).toHaveTextContent('app.requests · rate · sum');
			expect(query).not.toHaveTextContent('No filters');
		});
	});
});
