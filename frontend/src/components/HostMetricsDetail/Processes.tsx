import './Containers.styles.scss';

import { Button, Space, Typography } from 'antd';
import { LifeBuoy } from 'lucide-react';
import { handleContactSupport } from 'pages/Integrations/utils';
import { isCloudUser } from 'utils/app';

const { Text } = Typography;

function Processes(): JSX.Element {
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
					The ability to visualise processes is in active development and should be
					available to you soon.
				</Text>
			</div>

			<div className="infra-container-working-msg">
				<Space>
					<img src="/Icons/broom.svg" alt="broom" width={16} height={16} />
					<Text className="infra-container-card-text">
						We&apos;re working to extend infrastructure monitoring to take care of a
						bunch of different cases. Thank you for your patience.
					</Text>
				</Space>
			</div>

			<Text className="infra-container-card-text">
				Join the waitlist for early access or contact support.
			</Text>

			<Button
				icon={<LifeBuoy size={16} />}
				className="infra-container-contact-support-btn"
				onClick={(): void => handleContactSupport(isCloudUser())}
			>
				Contact Support
			</Button>
		</Space>
	);
}

export default Processes;
