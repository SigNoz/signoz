import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import StripTypography from 'container/BottomStrip/components/StripTypography/StripTypography';
import { pluralize } from 'utils/pluralize';

function StripInfo(): JSX.Element {
	const conversations = useAIAssistantStore((state) => state.conversations);

	const count = Object.values(conversations).filter(
		(conversation) => !conversation.archived,
	).length;

	return <StripTypography>{pluralize(count, 'conversation')}</StripTypography>;
}

export default StripInfo;
