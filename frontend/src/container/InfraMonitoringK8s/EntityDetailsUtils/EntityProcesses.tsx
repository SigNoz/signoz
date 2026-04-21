import { useTranslation } from 'react-i18next';
import { Space, Typography } from 'antd';
import WaitlistFragment from 'components/HostMetricsDetail/WaitlistFragment/WaitlistFragment';

import broomUrl from '@/assets/Icons/broom.svg';
import infraContainersUrl from '@/assets/Icons/infraContainers.svg';

import 'components/HostMetricsDetail/Processes/Processes.styles.scss';

const { Text } = Typography;

function EntityProcesses(): JSX.Element {
	const { t } = useTranslation(['infraMonitoring']);

	return (
		<Space direction="vertical" className="host-processes" size={24}>
			<div className="infra-container-card-container">
				<div className="dev-status-container">
					<div className="infra-container-card">
						<img
							src={infraContainersUrl}
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
							<img src={broomUrl} alt="broom" width={24} height={24} />
							<Text className="infra-container-card-text">{t('working_message')}</Text>
						</Space>
					</div>
				</div>

				<WaitlistFragment entityType="processes" />
			</div>
		</Space>
	);
}

export default EntityProcesses;
