import './Processes.styles.scss';

import { Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import WaitlistFragment from '../WaitlistFragment/WaitlistFragment';

const { Text } = Typography;

function Processes(): JSX.Element {
	const { t } = useTranslation(['infraMonitoring']);

	return (
		<Space direction="vertical" className="host-processes" size={24}>
			<div className="infra-container-card-container">
				<div className="dev-status-container">
					<div className="infra-container-card">
						<img
							src="/Icons/infraContainers.svg"
							alt="infra-container"
							width={32}
							height={32}
						/>
						<Text className="infra-container-card-text">
							{t('processes_visualization_message')}
						</Text>
					</div>

					<div className="infra-container-working-msg">
						<Space>
							<img src="/Icons/broom.svg" alt="broom" width={24} height={24} />
							<Text className="infra-container-card-text">{t('working_message')}</Text>
						</Space>
					</div>
				</div>

				<WaitlistFragment entityType="processes" />
			</div>
		</Space>
	);
}

export default Processes;
