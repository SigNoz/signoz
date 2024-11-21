import './Containers.styles.scss';

import { Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

function Containers(): JSX.Element {
	const { t } = useTranslation(['infraMonitoring']);

	return (
		<Space direction="vertical" className="host-containers" size={24}>
			<div className="infra-container-card">
				<img
					src="/Icons/infraContainers.svg"
					alt="infra-container"
					width={32}
					height={32}
				/>

				<Text className="infra-container-card-text">
					{t('containers_visualization_message')}
				</Text>
			</div>

			<div className="infra-container-working-msg">
				<Space>
					<img src="/Icons/broom.svg" alt="broom" width={16} height={16} />
					<Text className="infra-container-card-text">{t('working_message')}</Text>
				</Space>
			</div>
		</Space>
	);
}

export default Containers;
