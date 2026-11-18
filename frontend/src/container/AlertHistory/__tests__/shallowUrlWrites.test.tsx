import { RuletypesAlertStateDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { parseAsString, useQueryState } from 'nuqs';
import { act, render, screen, userEvent, waitFor } from 'tests/test-utils';
import type uPlot from 'uplot';

import TopContributorsCard from '../Statistics/TopContributorsCard/TopContributorsCard';
import Graph from '../Timeline/Graph/Graph';
import { ALERT_HISTORY_EXPRESSION_KEY } from '../Timeline/Table/Table';
import TabsAndFilters from '../Timeline/TabsAndFilters/TabsAndFilters';
import { TimelineFilter } from '../types';

const mockUplot: { options?: uPlot.Options } = {};
jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: ({ options }: { options: uPlot.Options }): null => {
		mockUplot.options = options;
		return null;
	},
}));
jest.mock('lib/uPlotLib/plugins/timelinePlugin', () => ({
	__esModule: true,
	default: (): object => ({}),
}));

const EXPRESSION = "service.name = 'frontend'";

// Writes the expression the way the search box does: a shallow nuqs write that
// reaches the address bar but not the router's location.
function Expression(): JSX.Element {
	const [expression, setExpression] = useQueryState(
		ALERT_HISTORY_EXPRESSION_KEY,
		parseAsString,
	);

	return (
		<>
			<button
				type="button"
				aria-label="Run expression"
				data-testid="run-expression"
				onClick={(): void => {
					void setExpression(EXPRESSION);
				}}
			/>
			<output data-testid="expression">{expression ?? ''}</output>
		</>
	);
}

function getUrlParam(key: string): string | null {
	return new URLSearchParams(window.location.search).get(key);
}

async function runExpression(): Promise<void> {
	await userEvent.click(screen.getByTestId('run-expression'));
	await waitFor(() =>
		expect(getUrlParam(ALERT_HISTORY_EXPRESSION_KEY)).toBe(EXPRESSION),
	);
}

function expectExpressionKept(): void {
	expect(getUrlParam(ALERT_HISTORY_EXPRESSION_KEY)).toBe(EXPRESSION);
	expect(screen.getByTestId('expression')).toHaveTextContent(EXPRESSION);
}

const initialRoute = `${ROUTES.ALERT_HISTORY}?ruleId=1`;

describe('Alert history navigations keep the expression', () => {
	it('keeps it when a state tab is clicked', async () => {
		render(
			<>
				<Expression />
				<TabsAndFilters />
			</>,
			undefined,
			{ initialRoute },
		);
		await runExpression();

		await userEvent.click(screen.getByTestId('timeline-filter-fired'));

		await waitFor(() =>
			expect(getUrlParam('timelineFilter')).toBe(TimelineFilter.FIRED),
		);
		expectExpressionKept();
	});

	it('keeps it when the top contributors drawer opens', async () => {
		const topContributorsData = [1, 2, 3, 4].map((fingerprint) => ({
			fingerprint,
			labels: { service: `service-${fingerprint}` },
			count: fingerprint,
			relatedLogsLink: '',
			relatedTracesLink: '',
		}));
		render(
			<>
				<Expression />
				<TopContributorsCard
					topContributorsData={topContributorsData}
					totalCurrentTriggers={10}
				/>
			</>,
			undefined,
			{ initialRoute },
		);
		await runExpression();

		await userEvent.click(screen.getByTestId('top-contributors-view-all'));

		await waitFor(() =>
			expect(getUrlParam('viewAllTopContributors')).toBe('true'),
		);
		expectExpressionKept();
	});

	it('keeps it when a range is selected on the graph', async () => {
		render(
			<>
				<Expression />
				<Graph
					type="horizontal"
					data={[
						{
							start: 1_700_000_000_000,
							end: 1_700_000_600_000,
							state: RuletypesAlertStateDTO.firing,
						},
					]}
				/>
			</>,
			undefined,
			{ initialRoute },
		);
		await runExpression();

		const self = {
			select: { left: 10, width: 20 },
			posToVal: (pos: number): number => 1_700_000_000 + pos,
		} as unknown as uPlot;
		act(() => {
			mockUplot.options?.hooks?.setSelect?.[0]?.(self);
		});

		await waitFor(() => expect(getUrlParam('startTime')).toBe('1700000010000'));
		expectExpressionKept();
	});
});
