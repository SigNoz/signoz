import './Containers.styles.scss';

import { Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import WaitlistFragment from '../WaitlistFragment/WaitlistFragment';
import DecorativeImage from 'components/DecorativeImage/DecorativeImage';

const { Text } = Typography;

function Containers(): JSX.Element {
	const { t } = useTranslation(['infraMonitoring']);

	return (
		<Space direction="vertical" className="host-containers" size={24}>
			<div className="infra-container-card-container">
				<div className="dev-status-container">
					<div className="infra-container-card">
						<DecorativeImage style={{
							width: '32px', height: '32px',
						}} src="/Icons/infraContainers.svg" className="" width="32" height="32" />

						<Text className="infra-container-card-text">
							{t('containers_visualization_message')}
						</Text>
					</div>

					<div className="infra-container-working-msg">
						<Space>
							<DecorativeImage src="/Icons/broom.svg" className="" width="24" height="24" />
							<Text className="infra-container-card-text">{t('working_message')}</Text>
						</Space>
					</div>
				</div>

				<WaitlistFragment entityType="containers" />
			</div>
		</Space>
	);
}

export default Containers;
