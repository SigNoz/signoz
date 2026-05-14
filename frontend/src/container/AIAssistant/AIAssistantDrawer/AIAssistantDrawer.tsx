import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Drawer } from 'antd';
import ROUTES from 'constants/routes';
import { Maximize2, MessageSquare, Plus, X } from '@signozhq/icons';

import ConversationView from '../ConversationView';
import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { VariantContext } from '../VariantContext';

export default function AIAssistantDrawer(): JSX.Element {
	const history = useHistory();

	const isDrawerOpen = useAIAssistantStore((s) => s.isDrawerOpen);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const closeDrawer = useAIAssistantStore((s) => s.closeDrawer);
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
	);

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeDrawer();
		history.push(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
		);
	}, [activeConversationId, closeDrawer, history]);

	const handleNewConversation = useCallback(() => {
		startNewConversation();
	}, [startNewConversation]);

	return (
		<Drawer
			open={isDrawerOpen}
			onClose={closeDrawer}
			placement="right"
			width={420}
			// Suppress default close button — we render our own header
			closeIcon={null}
			title={
				<div>
					<div>
						<MessageSquare size={16} />
						<span>AI Assistant</span>
					</div>

					<div>
						<Tooltip title="New conversation">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={handleNewConversation}
								aria-label="New conversation"
							>
								<Plus size={16} />
							</Button>
						</Tooltip>

						<Tooltip title="Open full screen">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={handleExpand}
								disabled={!activeConversationId}
								aria-label="Open full screen"
							>
								<Maximize2 size={16} />
							</Button>
						</Tooltip>

						<Tooltip title="Close">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={closeDrawer}
								aria-label="Close drawer"
							>
								<X size={16} />
							</Button>
						</Tooltip>
					</div>
				</div>
			}
		>
			<VariantContext.Provider value="panel">
				{activeConversationId ? (
					<ConversationView conversationId={activeConversationId} />
				) : null}
			</VariantContext.Provider>
		</Drawer>
	);
}
