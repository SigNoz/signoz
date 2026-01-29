import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/button';
import { Typography } from 'antd';
import { useNotifications } from 'hooks/useNotifications';
import { Copy } from 'lucide-react';
import { useAppContext } from 'providers/App/App';

import './LicenseSection.styles.scss';

function LicenseSection(): JSX.Element | null {
	const { activeLicense } = useAppContext();
	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const getMaskedKey = (key: string): string => {
		if (!key || key.length < 4) {
			return key || 'N/A';
		}
		return `${key.substring(0, 2)}********${key
			.substring(key.length - 2)
			.trim()}`;
	};

	const handleCopyKey = (text: string): void => {
		handleCopyToClipboard(text);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	if (!activeLicense?.key) {
		return <></>;
	}

	return (
		<div className="license-section">
			<div className="license-section-header">
				<div className="license-section-title">License</div>
			</div>

			<div className="license-section-content">
				<div className="license-section-content-item">
					<div className="license-section-content-item-title-action">
						<span>License key</span>
						<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<Typography.Text code>{getMaskedKey(activeLicense.key)}</Typography.Text>
							<Button
								variant="ghost"
								aria-label="Copy license key"
								data-testid="license-key-copy-btn"
								onClick={(): void => handleCopyKey(activeLicense.key)}
							>
								<Copy size={14} />
							</Button>
						</span>
					</div>

					<div className="license-section-content-item-description">
						Your SigNoz license key.
					</div>
				</div>
			</div>
		</div>
	);
}

export default LicenseSection;
