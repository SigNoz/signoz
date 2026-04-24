import { useCallback } from 'react';
import LearnMore from 'components/LearnMore/LearnMore';
import { MCP_USE_CASES_URL } from '../clients';

import './UseCasesCard.styles.scss';

interface UseCasesCardProps {
	onDocsLinkClick: (target: string) => void;
}

function UseCasesCard({ onDocsLinkClick }: UseCasesCardProps): JSX.Element {
	const handleClick = useCallback(
		() => onDocsLinkClick('use-cases'),
		[onDocsLinkClick],
	);

	return (
		<section className="mcp-use-cases-card">
			<h3 className="mcp-use-cases-card__title">What you can do with it</h3>
			<ul className="mcp-use-cases-card__list">
				<li>Ask your AI assistant to investigate a spiking error rate.</li>
				<li>Debug a slow service by walking through recent traces.</li>
				<li>Summarize an alert and suggest likely root causes.</li>
				<li>Generate dashboards or queries from a natural-language description.</li>
			</ul>
			<LearnMore
				text="See more use cases"
				url={MCP_USE_CASES_URL}
				onClick={handleClick}
			/>
		</section>
	);
}

export default UseCasesCard;
