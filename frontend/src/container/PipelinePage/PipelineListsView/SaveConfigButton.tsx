import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { SaveConfigWrapper } from './styles';

function SaveConfigButton({
	onSaveConfigurationHandler,
	onCancelConfigurationHandler,
}: SaveConfigButtonTypes): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<SaveConfigWrapper>
			<Button
				key="submit"
				type="primary"
				htmlType="submit"
				style={{ borderRadius: '0.375rem' }}
				onClick={onSaveConfigurationHandler}
			>
				{t('save_configuration')}
			</Button>
			<Button
				key="cancel"
				style={{ borderRadius: '0.375rem' }}
				onClick={onCancelConfigurationHandler}
			>
				{t('cancel')}
			</Button>
		</SaveConfigWrapper>
	);
}
export interface SaveConfigButtonTypes {
	onSaveConfigurationHandler: VoidFunction;
	onCancelConfigurationHandler: VoidFunction;
}

export default SaveConfigButton;
