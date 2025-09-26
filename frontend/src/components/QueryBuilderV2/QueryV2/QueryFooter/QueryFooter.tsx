/* eslint-disable react/require-default-props */
import { Button, Tooltip, Typography } from 'antd';
import { DraftingCompass, Plus, Sigma } from 'lucide-react';
import BetaTag from 'periscope/components/BetaTag/BetaTag';

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
							className="add-new-query-button periscope-btn secondary"
							type="text"
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
										href="https://signoz.io/docs/userguide/query-builder-v5/#multi-query-analysis-advanced-comparisons"
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
								className="add-formula-button periscope-btn secondary"
								icon={<Sigma size={16} />}
								onClick={addNewFormula}
							>
								Add Formula
							</Button>
						</Tooltip>
					</div>
				)}
				{showAddTraceOperator && (
					<div className="qb-trace-operator-button-container">
						<Tooltip
							title={
								<div style={{ textAlign: 'center' }}>
									Add Trace Matching
									<Typography.Link
										href="https://signoz.io/docs/userguide/query-builder-v5/#multi-query-analysis-trace-operators"
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
								className="add-trace-operator-button periscope-btn secondary"
								icon={<DraftingCompass size={16} />}
								onClick={(): void => addTraceOperator?.()}
							>
								<div className="qb-trace-operator-button-container-text">
									Add Trace Matching
									<BetaTag />
								</div>
							</Button>
						</Tooltip>
					</div>
				)}
			</div>
		</div>
	);
}
