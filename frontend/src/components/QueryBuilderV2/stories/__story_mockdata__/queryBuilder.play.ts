/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { DataSource } from 'types/common/queryBuilder';

import type { QueryBuilderV2 } from '../../QueryBuilderV2';
import { QueryBuilderField } from '../../queryBuilderFields.types';
import {
	mergeQueryBuilderFieldsConfig,
	RAW_QUERY_FIELDS,
	ResolvedQueryBuilderField,
	resolveQueryBuilderField,
} from '../../queryBuilderFields.utils';
import { expectFirstQuery, payloadIn } from '../QueryBuilderV2.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: Partial<Parameters<typeof QueryBuilderV2>[0]>;
}

export const expectLogsCount = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, {
		signal: 'logs',
		aggregations: [{ expression: 'count()' }],
	});
};

export const expectLogsQuery = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'logs' });
};

export const expectTracesQuery = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'traces' });
};

export const expectMetricsQuery = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'metrics' });
};

export const expectMeterQuery = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'metrics', source: 'meter' });
};

export const expectPanelEditorQuery = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await expectFirstQuery(canvasElement, { signal: 'logs' });
	await expect(
		within(canvasElement).getByTestId('query-data-source-selector-0'),
	).toBeVisible();
};

/** The operator renders only where the host offers trace matching. */
export const expectTraceMatching = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!args.showTraceOperator) {
		return;
	}

	await expect(
		await within(canvasElement).findByTestId('trace-operator'),
	).toBeVisible();
	await waitFor(() =>
		expect(payloadIn(canvasElement).queries).toContainEqual(
			expect.objectContaining({
				type: 'builder_trace_operator',
				spec: expect.objectContaining({ expression: 'A => B' }),
			}),
		),
	);
};

const hoverForLearnMore = async (
	target: HTMLElement,
	title: string,
): Promise<void> => {
	await userEvent.hover(target);

	await waitFor(async () => {
		const tooltip = (await screen.findAllByRole('tooltip')).find((element) =>
			element.textContent?.includes(title),
		);

		await expect(tooltip).toBeDefined();
		await expect(
			within(tooltip as HTMLElement).getByText('Learn more'),
		).toBeVisible();
	});
};

const resolvedField = (
	args: PlayContext['args'],
	field: QueryBuilderField,
): ResolvedQueryBuilderField =>
	resolveQueryBuilderField(
		field,
		mergeQueryBuilderFieldsConfig(
			args.isRawQuery ? RAW_QUERY_FIELDS : undefined,
			args.fieldsConfig,
		),
	);

const isTracesBuilder = (args: PlayContext['args']): boolean =>
	args.config?.queryVariant === 'static' &&
	args.config.initialDataSource === DataSource.TRACES;

const canShowTraceOperator = (args: PlayContext['args']): boolean =>
	Boolean(args.showTraceOperator) &&
	!resolvedField(args, QueryBuilderField.TraceOperator).hidden;

const isFooterShown = (args: PlayContext['args']): boolean =>
	(!args.showOnlyWhereClause && !args.isRawQuery) ||
	(isTracesBuilder(args) && canShowTraceOperator(args));

/** A disabled Add Formula shows its reason instead of the Learn more tooltip. */
export const hoverAddFormula = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const formula = resolvedField(args, QueryBuilderField.Formula);

	if (
		!isFooterShown(args) ||
		formula.hidden ||
		formula.disabled ||
		(isTracesBuilder(args) && args.isRawQuery)
	) {
		return;
	}

	await hoverForLearnMore(
		await within(canvasElement).findByTestId('add-formula-button'),
		'Add New Formula',
	);
};

/** Add Trace Matching is offered only with trace matching on and no operator yet. */
export const hoverAddTraceMatching = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canShowTraceOperator(args) || !isFooterShown(args)) {
		return;
	}

	const button = await waitFor(() => {
		const element = canvasElement.querySelector<HTMLElement>(
			'.add-trace-operator-button',
		);

		if (!element) {
			throw new Error('Add Trace Matching not rendered');
		}

		return element;
	});

	await hoverForLearnMore(button, 'Add Trace Matching');
};

/** The function picker sits in the query's options row when functions are shown. */
export const hoverAddFunction = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!args.showFunctions) {
		return;
	}

	const button = await waitFor(() => {
		const element = within(canvasElement)
			.getByTestId('query-A')
			.querySelector<HTMLElement>('.add-function-btn');

		if (!element) {
			throw new Error('Add function not rendered');
		}

		return element;
	});

	await hoverForLearnMore(button, 'Add new function');
};
