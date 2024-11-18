import './Containers.styles.scss';

import { Button, Space, Typography } from 'antd';
import { LifeBuoy } from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';
import { isCloudUser } from 'utils/app';

import { FEATURE_COMING_SOON_STRINGS } from './constants';

const { Text } = Typography;

function Containers(): JSX.Element {
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
					{FEATURE_COMING_SOON_STRINGS.CONTAINERS_VISUALIZATION_MESSAGE}
				</Text>
			</div>

			<div className="infra-container-working-msg">
				<Space>
					<img src="/Icons/broom.svg" alt="broom" width={16} height={16} />
					<Text className="infra-container-card-text">
						{FEATURE_COMING_SOON_STRINGS.WORKING_MESSAGE}
					</Text>
				</Space>
			</div>

			<Text className="infra-container-card-text">
				{FEATURE_COMING_SOON_STRINGS.WAITLIST_MESSAGE}
			</Text>

			<Button
				icon={<LifeBuoy size={16} />}
				className="infra-container-contact-support-btn"
				onClick={(): void => handleContactSupport(isCloudUser())}
			>
				{FEATURE_COMING_SOON_STRINGS.CONTACT_SUPPORT}
			</Button>
		</Space>
	);
}

export default Containers;
