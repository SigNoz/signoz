import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'antd';
import AddCreditCardModal from 'components/AddCreditCardModal/AddCreditCardModal';
import logEvent from 'api/common/logEvent';
import { MessageSquareText } from '@signozhq/icons';

export default function ChatSupportGateway(): JSX.Element {
	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] =
		useState(false);
	const { pathname } = useLocation();

	return (
		<>
			<div className="chat-support-gateway">
				<Button
					className="chat-support-gateway-btn"
					onClick={(): void => {
						logEvent('Disabled Chat Support: Clicked', {
							source: `chat support icon`,
							page: pathname,
						});

						setIsAddCreditCardModalOpen(true);
					}}
				>
					<MessageSquareText size={24} />
				</Button>
			</div>

			<AddCreditCardModal
				open={isAddCreditCardModalOpen}
				onClose={(): void => setIsAddCreditCardModalOpen(false)}
				onAddCreditCard={(): void => {
					logEvent('Add Credit card modal: Clicked', {
						source: `chat support icon`,
						page: pathname,
					});
				}}
			/>
		</>
	);
}
