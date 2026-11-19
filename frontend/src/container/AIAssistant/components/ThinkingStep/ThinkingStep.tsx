import ActivityStep from '../ActivityStep/ActivityStep';

interface ThinkingStepProps {
	content: string;
	/**
	 * When false, label reads "Thought for a few seconds" — intentionally
	 * vague because the API doesn't persist precise timing, so showing
	 * seconds would be inconsistent between fresh and reloaded threads.
	 */
	isLive?: boolean;
}

export function thinkingLabel(isLive: boolean): string {
	return isLive ? 'Thinking…' : 'Thought for a few seconds';
}

/** A thinking pass on the activity timeline, with what the agent thought as its detail. */
export default function ThinkingStep({
	content,
	isLive = false,
}: ThinkingStepProps): JSX.Element {
	return (
		<ActivityStep title={thinkingLabel(isLive)} isLive={isLive}>
			{content.trim()}
		</ActivityStep>
	);
}
