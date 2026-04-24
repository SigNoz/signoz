import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LearnMore from 'components/LearnMore/LearnMore';
import { MCP_USE_CASES_URL } from '../clients';

import './UseCasesCard.styles.scss';

interface UseCasesCardProps {
	onDocsLinkClick: (target: string) => void;
}

function UseCasesCard({ onDocsLinkClick }: UseCasesCardProps): JSX.Element {
	const { t } = useTranslation('mcpServer');

	const handleClick = useCallback(
		() => onDocsLinkClick('use-cases'),
		[onDocsLinkClick],
	);

	return (
		<section className="mcp-use-cases-card">
			<h3 className="mcp-use-cases-card__title">{t('use_cases_title')}</h3>
			<ul className="mcp-use-cases-card__list">
				<li>{t('use_cases_item_1')}</li>
				<li>{t('use_cases_item_2')}</li>
				<li>{t('use_cases_item_3')}</li>
				<li>{t('use_cases_item_4')}</li>
			</ul>
			<LearnMore
				text={t('use_cases_docs_link')}
				url={MCP_USE_CASES_URL}
				onClick={handleClick}
			/>
		</section>
	);
}

export default UseCasesCard;
