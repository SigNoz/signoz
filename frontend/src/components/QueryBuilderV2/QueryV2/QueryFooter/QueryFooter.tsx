import { Button, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DraftingCompass, Plus, Sigma } from '@signozhq/icons';
import BetaTag from 'periscope/components/BetaTag/BetaTag';

import './QueryFooter.styles.scss';

function TraceOperatorSection({
	addTraceOperator,
}: {
	addTraceOperator?: () => void;
}): JSX.Element {
	const { currentQuery, panelType } = useQueryBuilder();

	const isListViewPanel =
		panelType === PANEL_TYPES.LIST || panelType === PANEL_TYPES.TRACE;
	const hasMultipleQueries = currentQuery.builder.queryData.length > 1;
	const hasTraceOperator =
		currentQuery.builder.queryTraceOperator &&
		currentQuery.builder.queryTraceOperator.length > 0;
	const showTraceOperatorWarning =
		isListViewPanel && hasMultipleQueries && !hasTraceOperator;

	const firstQuery = currentQuery.builder.queryData[0];
	const traceOperatorWarning =
		currentQuery.builder.queryData.length === 0
			? ''
			: `Currently, you are only seeing results from query ${firstQuery.queryName}. Add a trace operator to combine results of multiple queries.`;
	return (
		<div className="qb-trace-operator-button-container">
			<Tooltip
				title={
					<div style={{ textAlign: 'center' }}>
						Add Trace Matching
						<Typography.Link
							href="https://signoz.io/docs/querying/multi-query-analysis/#trace-matching"
							target="_blank"
							style={{ textDecoration: 'underline' }}
						>
							{' '}
							<br />
							Learn more
						</Typography.Link>
					</div>
				}
			>
				<Button
					className="add-trace-operator-button periscope-btn"
					icon={<DraftingCompass size={16} />}
					onClick={(): void => addTraceOperator?.()}
				>
					<div className="qb-trace-operator-button-container-text">
						Add Trace Matching
						<BetaTag />
					</div>
				</Button>
			</Tooltip>
			{showTraceOperatorWarning && (
				<WarningPopover message={traceOperatorWarning} />
			)}
		</div>
	);
}

export default function QueryFooter({
	addNewBuilderQuery,
	addNewFormula,
	addTraceOperator,
	showAddFormula = true,
	showAddTraceOperator = false,
}: {
	addNewBuilderQuery: () => void;
	addNewFormula: () => void;
	addTraceOperator?: () => void;
	showAddTraceOperator: boolean;
	showAddFormula?: boolean;
}): JSX.Element {
	return (
		<div className="qb-footer">
			<div className="qb-footer-container">
				<div className="qb-add-new-query">
					<Tooltip title={<div style={{ textAlign: 'center' }}>Add New Query</div>}>
						<Button
							className="add-new-query-button periscope-btn "
							icon={<Plus size={16} />}
							onClick={addNewBuilderQuery}
						/>
					</Tooltip>
				</div>

				{showAddFormula && (
					<div className="qb-add-formula">
						<Tooltip
							title={
								<div style={{ textAlign: 'center' }}>
									Add New Formula
									<Typography.Link
										href="https://signoz.io/docs/querying/multi-query-analysis/#advanced-comparisons"
										target="_blank"
										style={{ textDecoration: 'underline' }}
									>
										{' '}
										<br />
										Learn more
									</Typography.Link>
								</div>
							}
						>
							<Button
								className="add-formula-button periscope-btn "
								icon={<Sigma size={16} />}
								onClick={addNewFormula}
							>
								Add Formula
							</Button>
						</Tooltip>
					</div>
				)}
				{showAddTraceOperator && (
					<TraceOperatorSection addTraceOperator={addTraceOperator} />
				)}
			</div>
		</div>
	);
}
