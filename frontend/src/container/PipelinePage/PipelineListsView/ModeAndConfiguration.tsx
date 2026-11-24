import { ActionMode } from 'types/api/pipeline/def';

import { ModeAndConfigWrapper } from './styles';

function ModeAndConfiguration({
	isActionMode,
	version,
}: ModeAndConfigurationType): JSX.Element {
	const actionMode = isActionMode === ActionMode.Editing;

	return (
		<ModeAndConfigWrapper>
			Mode: <span>{actionMode ? 'Editing' : 'Viewing'}</span>
			<div>Configuration Version: {version}</div>
		</ModeAndConfigWrapper>
	);
}

interface ModeAndConfigurationType {
	isActionMode: string;
	version: string | number;
}

export default ModeAndConfiguration;
