import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
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
	// Set once agent commands exist; closing after that loses the pending setup.
	const [hasGeneratedCommands, setHasGeneratedCommands] = useState(false);
	const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

	const requestClose = (): void => {
		if (hasGeneratedCommands) {
			setIsCloseConfirmOpen(true);
			return;
		}
		onClose();
	};

	return (
		<>
			<SetupDrawerLayout onClose={requestClose}>
				{(footerSlot): JSX.Element =>
					connectionMethod === CloudintegrationtypesGCPConnectionMethodDTO.agent ? (
						<AgentSetup
							footerSlot={footerSlot}
							onConnectionMethodChange={setConnectionMethod}
							onCommandsGenerated={(): void => setHasGeneratedCommands(true)}
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
			<DialogWrapper
				open={isCloseConfirmOpen}
				onOpenChange={setIsCloseConfirmOpen}
				title="Close GCP agent setup?"
				testId="gcp-close-setup-confirm"
				footer={
					<>
						<Button
							variant="outlined"
							color="destructive"
							onClick={onClose}
							testId="gcp-close-setup-btn"
						>
							Close Setup
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={(): void => setIsCloseConfirmOpen(false)}
							testId="gcp-continue-setup-btn"
						>
							Continue Setup
						</Button>
					</>
				}
			>
				<Typography>
					The agent has not connected yet. If you close now, you will have to start
					the installation process again with new setup commands.
				</Typography>
			</DialogWrapper>
		</>
	);
}

export default CloudAccountSetupDrawer;
