import React, { useMemo } from 'react';

import { ActionMode } from '../Layouts';
import { ModeAndConfigWrapper } from './styles';

function ModeAndConfiguration({
	isActionMode,
	verison,
}: ModeAndConfigurationType): JSX.Element {
	const actionMode = useMemo(() => isActionMode === ActionMode.Editing, [
		isActionMode,
	]);

	return (
		<ModeAndConfigWrapper>
			Mode: <span>{actionMode ? 'Editing' : 'Viewing'}</span>
			<div>Configuration Version: {verison}</div>
		</ModeAndConfigWrapper>
	);
}

export interface ModeAndConfigurationType {
	isActionMode: string;
	verison: string | number;
}

export default ModeAndConfiguration;
