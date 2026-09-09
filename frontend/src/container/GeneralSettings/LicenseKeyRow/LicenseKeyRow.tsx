import { useCopyToClipboard } from 'react-use';
import { Copy, KeyRound } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import useActiveLicenseKey from 'hooks/useActiveLicenseKey/useActiveLicenseKey';
import { getMaskedKey } from 'utils/maskedKey';

import './LicenseKeyRow.styles.scss';

function LicenseKeyRow(): JSX.Element | null {
	const { licenseKey } = useActiveLicenseKey();
	const [, copyToClipboard] = useCopyToClipboard();

	if (!licenseKey) {
		return null;
	}

	const handleCopyLicenseKey = (text: string): void => {
		copyToClipboard(text);
		toast.success('License key copied to clipboard.');
	};

	return (
		<div className="license-key-row">
			<span className="license-key-row__left">
				<KeyRound size={14} />
				<span className="license-key-row__label">SigNoz License Key</span>
			</span>
			<span className="license-key-row__value">
				<code className="license-key-row__code">{getMaskedKey(licenseKey)}</code>
				<Button
					type="button"
					size="sm"
					aria-label="Copy license key"
					data-testid="license-key-row-copy-btn"
					className="license-key-row__copy-btn"
					onClick={(): void => handleCopyLicenseKey(licenseKey)}
				>
					<Copy size={12} />
				</Button>
			</span>
		</div>
	);
}

export default LicenseKeyRow;
