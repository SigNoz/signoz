import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import AddCreditCardModal from 'components/AddCreditCardModal/AddCreditCardModal';
import { ChatSupportState, useChatSupport } from 'hooks/useChatSupport';
import { MessageSquareText } from '@signozhq/icons';

function SupportButton(): JSX.Element | null {
	const chatSupport = useChatSupport();
	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] =
		useState(false);

	if (chatSupport === ChatSupportState.Unavailable) {
		return null;
	}

	const handleClick = (): void => {
		if (chatSupport === ChatSupportState.NeedsCard) {
			setIsAddCreditCardModalOpen(true);
			return;
		}
		window.Pylon?.('show');
	};

	return (
		<>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				prefix={<MessageSquareText size={16} />}
				onClick={handleClick}
				testId="bottom-strip-support"
			>
				Support
			</Button>

			<AddCreditCardModal
				open={isAddCreditCardModalOpen}
				onClose={(): void => setIsAddCreditCardModalOpen(false)}
			/>
		</>
	);
}

export default SupportButton;
