import './StepsProgress.styles.scss';

import { Progress } from 'antd';

import { ChecklistItem } from '../HomeChecklist/HomeChecklist';

function StepsProgress({
	checklistItems,
}: {
	checklistItems: ChecklistItem[];
}): JSX.Element {
	const completedChecklistItems = checklistItems.filter(
		(item) => item.completed,
	);

	const totalChecklistItems = checklistItems.length;

	const progress = Math.round(
		(completedChecklistItems.length / totalChecklistItems) * 100,
	);

	return (
		<div className="steps-progress-container">
			<div className="steps-progress-title">
				<div className="steps-progress-title-text">
					Build your observability base
				</div>
				<div className="steps-progress-count">
					Step {completedChecklistItems.length} / {totalChecklistItems}
				</div>
			</div>

			<div className="steps-progress-progress">
				<Progress
					steps={totalChecklistItems}
					percent={progress}
					showInfo={false}
					strokeLinecap="butt"
				/>
			</div>
		</div>
	);
}

export default StepsProgress;
