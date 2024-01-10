import './ToolbarActions.styles.scss';

import { Button } from 'antd';
import { Play } from 'lucide-react';

interface RightToolbarActionsProps {
	onStageRunQuery: () => void;
}

export default function RightToolbarActions({
	onStageRunQuery,
}: RightToolbarActionsProps): JSX.Element {
	return (
		<div>
			<Button
				type="primary"
				className="right-toolbar"
				onClick={onStageRunQuery}
				icon={<Play size={14} />}
			>
				Stage & Run Query
			</Button>
		</div>
	);
}
