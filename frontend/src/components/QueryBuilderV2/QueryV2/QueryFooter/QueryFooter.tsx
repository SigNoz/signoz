import { Button, Tooltip, Typography } from 'antd';
import { Plus, Sigma } from 'lucide-react';

export default function QueryFooter({
	addNewBuilderQuery,
	addNewFormula,
	showFormula = true,
}: {
	addNewBuilderQuery: () => void;
	addNewFormula: () => void;
	showFormula?: boolean;
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

				{showFormula && (
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
			</div>
		</div>
	);
}
