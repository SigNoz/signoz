import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import logEvent from 'api/common/logEvent';
import LearnMore from 'components/LearnMore/LearnMore';

import './NotCloudFallback.styles.scss';
import { MCP_DOCS_URL } from '../clients';

const DOCS_LINK_EVENT = 'MCP Settings: Docs link clicked';

function NotCloudFallback(): JSX.Element {
	const { t } = useTranslation('mcpServer');

	const handleDocsClick = useCallback(() => {
		void logEvent(DOCS_LINK_EVENT, { target: 'fallback' });
	}, []);

	return (
		<div className="not-cloud-fallback">
			<div className="not-cloud-fallback__content">
				<h2 className="not-cloud-fallback__title">{t('fallback_title')}</h2>
				<p className="not-cloud-fallback__body">{t('fallback_body')}</p>
				<LearnMore
					text={t('fallback_docs_link')}
					url={MCP_DOCS_URL}
					onClick={handleDocsClick}
				/>
			</div>
		</div>
	);
}

export default NotCloudFallback;
