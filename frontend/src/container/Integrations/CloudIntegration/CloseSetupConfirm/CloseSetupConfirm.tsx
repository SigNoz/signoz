import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';

interface CloseSetupConfirmProps {
	/** Provider name as shown in the title, e.g. `AWS`. */
	providerName: string;
	/** Prefix for the dialog's test ids, e.g. `aws`. */
	testIdPrefix: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

function CloseSetupConfirm({
	providerName,
	testIdPrefix,
	open,
	onOpenChange,
	onConfirm,
}: CloseSetupConfirmProps): JSX.Element {
	return (
		<Dialog
			open={open}
			onClose={(): void => onOpenChange(false)}
			title={`Close ${providerName} agent setup?`}
			testId={`${testIdPrefix}-close-setup-confirm`}
			footerSuffix={
				<>
					<Button
						size="md"
						variant="solid"
						color="highlight-danger"
						onClick={onConfirm}
						testId={`${testIdPrefix}-close-setup-btn`}
					>
						Close Setup
					</Button>
					<Button
						size="md"
						variant="solid"
						color="primary"
						onClick={(): void => onOpenChange(false)}
						testId={`${testIdPrefix}-continue-setup-btn`}
					>
						Continue Setup
					</Button>
				</>
			}
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				The agent has not connected yet. If you close now, you will have to start
				the installation process again with a new setup command.
			</Typography>
		</Dialog>
	);
}

export default CloseSetupConfirm;
