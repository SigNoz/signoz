import { Button } from '@signozhq/ui/button';
import { Compass } from '@signozhq/icons';

interface OpenInLogsExplorerProps {
	onClick: () => void;
}

// Opens the full Logs Explorer (new tab) filtered to this span's trace.
// Placement/alignment is the caller's responsibility.
function OpenInLogsExplorer({ onClick }: OpenInLogsExplorerProps): JSX.Element {
	return (
		<Button
			variant="solid"
			color="secondary"
			size="md"
			onClick={onClick}
			prefix={<Compass size={16} />}
			data-testid="open-in-explorer-button"
		>
			Open in Logs Explorer
		</Button>
	);
}

export default OpenInLogsExplorer;
