import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { useNotifications } from 'hooks/useNotifications';
import { Copy } from '@signozhq/icons';
import useActiveLicenseKey from 'hooks/useActiveLicenseKey/useActiveLicenseKey';
import { getMaskedKey } from 'utils/maskedKey';

import './LicenseSection.styles.scss';

function LicenseSection(): JSX.Element | null {
	const { licenseKey } = useActiveLicenseKey();
	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const handleCopyKey = (text: string): void => {
		handleCopyToClipboard(text);
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	if (!licenseKey) {
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
							<Typography.Text code>{getMaskedKey(licenseKey)}</Typography.Text>
							<Button
								variant="link"
								color="none"
								aria-label="Copy license key"
								data-testid="license-key-copy-btn"
								onClick={(): void => handleCopyKey(licenseKey)}
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
