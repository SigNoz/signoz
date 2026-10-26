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
	// Set once the agent command exists; closing after that loses the pending setup.
	const [hasGeneratedCommand, setHasGeneratedCommand] = useState(false);
	const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

	const requestClose = (): void => {
		if (hasGeneratedCommand) {
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
			<DialogWrapper
				open={isCloseConfirmOpen}
				onOpenChange={setIsCloseConfirmOpen}
				title="Close GCP agent setup?"
				testId="gcp-close-setup-confirm"
				footer={
					<>
						<Button
							size="md"
							variant="solid"
							color="highlight-danger"
							onClick={onClose}
							testId="gcp-close-setup-btn"
						>
							Close Setup
						</Button>
						<Button
							size="md"
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
					the installation process again with a new setup command.
				</Typography>
			</DialogWrapper>
		</>
	);
}

export default CloudAccountSetupDrawer;
