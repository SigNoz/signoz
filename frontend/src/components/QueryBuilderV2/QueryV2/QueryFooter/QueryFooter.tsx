import { Button } from 'antd';
import { Plus, Sigma } from 'lucide-react';

export default function QueryFooter({
	addNewBuilderQuery,
	addNewFormula,
}: {
	addNewBuilderQuery: () => void;
	addNewFormula: () => void;
}): JSX.Element {
	return (
		<div className="qb-footer">
			<div className="qb-footer-container">
				<div className="qb-add-new-query">
					<Button
						className="add-new-query-button periscope-btn secondary"
						type="text"
						icon={<Plus size={16} />}
						onClick={addNewBuilderQuery}
					/>
				</div>

				<div className="qb-add-formula">
					<Button
						className="add-formula-button periscope-btn secondary"
						icon={<Sigma size={16} />}
						onClick={addNewFormula}
					>
						Add Formula
					</Button>
				</div>
			</div>
		</div>
	);
}
