import { useTranslation } from 'react-i18next';
import { Badge, Button } from '@signozhq/ui';
import { Info, KeyRound } from 'lucide-react';
import CopyIconButton from '../CopyIconButton';

import './AuthCard.styles.scss';

interface AuthCardProps {
	isAdmin: boolean;
	instanceUrl: string;
	onCopyInstanceUrl: () => void;
	onCreateServiceAccount: () => void;
}

function AuthCard({
	isAdmin,
	instanceUrl,
	onCopyInstanceUrl,
	onCreateServiceAccount,
}: AuthCardProps): JSX.Element {
	const { t } = useTranslation('mcpServer');

	return (
		<section className="mcp-auth-card">
			<h3 className="mcp-auth-card__title">
				<Badge color="secondary" variant="default">
					2
				</Badge>
				{t('step2_title')}
			</h3>
			<p className="mcp-auth-card__description">{t('step2_description')}</p>

			<div className="mcp-auth-card__field">
				<span className="mcp-auth-card__field-label">
					{t('step2_instance_url_label')}
				</span>
				<div className="mcp-auth-card__endpoint-value">
					<span data-testid="mcp-instance-url">{instanceUrl}</span>
					<CopyIconButton
						ariaLabel={t('copy_aria_instance_url')}
						onCopy={onCopyInstanceUrl}
					/>
				</div>
			</div>

			<div className="mcp-auth-card__field">
				<span className="mcp-auth-card__field-label">
					{t('step2_api_key_label')}
				</span>
				{isAdmin ? (
					<div className="mcp-auth-card__cta-row">
						<Button
							variant="solid"
							color="primary"
							prefix={<KeyRound size={14} />}
							onClick={onCreateServiceAccount}
						>
							{t('step2_admin_cta')}
						</Button>
						<span className="mcp-auth-card__helper-text">
							{t('step2_admin_helper')}
						</span>
					</div>
				) : (
					<div className="mcp-auth-card__info-banner">
						<Info size={14} />
						<span className="mcp-auth-card__helper-text">
							{t('step2_viewer_helper')}
						</span>
					</div>
				)}
			</div>
		</section>
	);
}

export default AuthCard;
