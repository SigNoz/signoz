import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { SaveConfigWrapper } from './styles';

function SaveConfigButton({
	onSaveHandler,
	onCancelHandler,
}: SaveConfigButtonTypes): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<SaveConfigWrapper>
			<Button
				key="submit"
				type="primary"
				htmlType="submit"
				style={{ borderRadius: '0.375rem' }}
				onClick={onSaveHandler}
			>
				{t('save_configuration')}
			</Button>
			<Button
				key="cancel"
				style={{ borderRadius: '0.375rem' }}
				onClick={onCancelHandler}
			>
				{t('cancel')}
			</Button>
		</SaveConfigWrapper>
	);
}
export interface SaveConfigButtonTypes {
	onSaveHandler: VoidFunction;
	onCancelHandler: VoidFunction;
}

export default SaveConfigButton;
