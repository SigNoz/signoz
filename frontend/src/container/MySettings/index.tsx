import { Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import Password from './Password';
import UpdateName from './UpdateName';

function MySettings(): JSX.Element {
	const { t } = useTranslation(['routes']);
	return (
		<Space direction="vertical" size="large">
			<Typography.Title level={2}>{t('my_settings')}</Typography.Title>
			<UpdateName />
			<Password />
		</Space>
	);
}

export default MySettings;
