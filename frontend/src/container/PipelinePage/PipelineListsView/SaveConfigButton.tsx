import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ActionMode } from '../Layouts';
import { SaveConfigWrapper } from './styles';

function SaveConfigButton({
	setActionMode,
	setIsVisibleSaveButton,
}: SaveConfigButtonTypes): JSX.Element {
	const { t } = useTranslation('pipeline');

	const onClickHandler = (): void => {
		setActionMode(ActionMode.Viewing);
		setIsVisibleSaveButton(undefined);
	};

	return (
		<SaveConfigWrapper>
			<Button
				key="submit"
				type="primary"
				htmlType="submit"
				style={{ borderRadius: '0.375rem' }}
				onClick={onClickHandler}
			>
				{t('save_configuration')}
			</Button>
			<Button
				key="cancel"
				style={{ borderRadius: '0.375rem' }}
				onClick={onClickHandler}
			>
				{t('cancel')}
			</Button>
		</SaveConfigWrapper>
	);
}
export interface SaveConfigButtonTypes {
	setActionMode: (actionMode: ActionMode) => void;
	setIsVisibleSaveButton: (actionMode?: ActionMode) => void;
}

export default SaveConfigButton;
