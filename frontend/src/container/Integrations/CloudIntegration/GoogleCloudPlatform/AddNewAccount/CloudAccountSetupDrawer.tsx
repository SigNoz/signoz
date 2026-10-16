import { useState } from 'react';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { IntegrationModalProps } from 'container/Integrations/HeroSection/types';

import AgentSetup from './AgentSetup/AgentSetup';
import ManualSetup from './ManualSetup/ManualSetup';
import SetupDrawerLayout from './SetupDrawerLayout';

function CloudAccountSetupDrawer({
	onClose,
}: IntegrationModalProps): JSX.Element {
	const [connectionMethod, setConnectionMethod] =
		useState<CloudintegrationtypesGCPConnectionMethodDTO>(
			CloudintegrationtypesGCPConnectionMethodDTO.manual,
		);
	const [isWide, setIsWide] = useState(false);

	return (
		<SetupDrawerLayout isWide={isWide} onClose={onClose}>
			{(footerSlot): JSX.Element =>
				connectionMethod === CloudintegrationtypesGCPConnectionMethodDTO.agent ? (
					<AgentSetup
						footerSlot={footerSlot}
						onConnectionMethodChange={setConnectionMethod}
						onCommandsGenerated={(): void => setIsWide(true)}
						onClose={onClose}
					/>
				) : (
					<ManualSetup
						footerSlot={footerSlot}
						onConnectionMethodChange={setConnectionMethod}
						onClose={onClose}
					/>
				)
			}
		</SetupDrawerLayout>
	);
}

export default CloudAccountSetupDrawer;
