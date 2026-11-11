import { useState } from 'react';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import { IntegrationModalProps } from 'container/Integrations/HeroSection/types';

import CloseSetupConfirm from '../../CloseSetupConfirm/CloseSetupConfirm';
import { useCloseSetupConfirm } from '../../CloseSetupConfirm/useCloseSetupConfirm';
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
	// Set once the agent command exists; closing after that loses the pending setup.
	const [hasGeneratedCommand, setHasGeneratedCommand] = useState(false);
	const { isConfirmOpen, setIsConfirmOpen, requestClose } = useCloseSetupConfirm(
		{ shouldConfirm: hasGeneratedCommand, onClose },
	);

	return (
		<>
			<SetupDrawerLayout onClose={requestClose}>
				{(footerSlot): JSX.Element =>
					connectionMethod === CloudintegrationtypesGCPConnectionMethodDTO.agent ? (
						<AgentSetup
							footerSlot={footerSlot}
							onConnectionMethodChange={setConnectionMethod}
							onCommandGenerated={(): void => setHasGeneratedCommand(true)}
							onCancel={requestClose}
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
			<CloseSetupConfirm
				providerName="GCP"
				testIdPrefix="gcp"
				open={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				onConfirm={onClose}
			/>
		</>
	);
}

export default CloudAccountSetupDrawer;
