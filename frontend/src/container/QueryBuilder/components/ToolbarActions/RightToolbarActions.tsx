import './ToolbarActions.styles.scss';

import { Button } from 'antd';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { Play } from 'lucide-react';
import { useEffect } from 'react';

interface RightToolbarActionsProps {
	onStageRunQuery: () => void;
}

export default function RightToolbarActions({
	onStageRunQuery,
}: RightToolbarActionsProps): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		registerShortcut(GlobalShortcuts.StageAndRunQuery, onStageRunQuery);

		return (): void => {
			deregisterShortcut(GlobalShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
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
