import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';

import { ThreadView } from './types';

const VIEW_OPTIONS = [
	{ label: 'Formatted', value: ThreadView.Formatted },
	{ label: 'JSON', value: ThreadView.Json },
];

interface ThreadViewToggleProps {
	value: ThreadView;
	onChange: (view: ThreadView) => void;
	testId?: string;
}

function ThreadViewToggle({
	value,
	onChange,
	testId,
}: ThreadViewToggleProps): JSX.Element {
	const handleChange = (next: string): void => {
		// Clicking the active item deselects it and reports ''.
		if (next) {
			onChange(next as ThreadView);
		}
	};

	return (
		<ToggleGroupSimple
			type="single"
			size="sm"
			value={value}
			onChange={handleChange}
			items={VIEW_OPTIONS}
			testId={testId}
		/>
	);
}

ThreadViewToggle.defaultProps = {
	testId: 'thread-view-toggle',
};

export default ThreadViewToggle;
