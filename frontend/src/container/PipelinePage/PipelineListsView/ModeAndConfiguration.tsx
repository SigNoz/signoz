import React from 'react';

import { ActionMode } from '../Layouts';
import { ModeAndConfigWrapper } from './styles';

function ModeAndConfiguration({
	isActionMode,
	verison,
}: ModeAndConfigurationType): JSX.Element {
	return (
		<ModeAndConfigWrapper>
			Mode:{' '}
			<span>{isActionMode === ActionMode.Editing ? 'Editing' : 'Viewing'}</span>
			<div>Configuration Version {verison}</div>
		</ModeAndConfigWrapper>
	);
}

export interface ModeAndConfigurationType {
	isActionMode: string;
	verison: string;
}

export default ModeAndConfiguration;
