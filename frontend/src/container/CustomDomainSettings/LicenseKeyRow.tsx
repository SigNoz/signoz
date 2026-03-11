import { useCopyToClipboard } from 'react-use';
import { Button } from '@signozhq/button';
import { KeyRound } from '@signozhq/icons';
import { Copy } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { useAppContext } from 'providers/App/App';

import './CustomDomainSettings.styles.scss';

function LicenseKeyRow(): JSX.Element | null {
	const { activeLicense } = useAppContext();
	const [, copyToClipboard] = useCopyToClipboard();

	if (!activeLicense?.key) {
		return null;
	}

	const getMaskedKey = (key: string): string => {
		if (!key || key.length < 4) {
			return key || 'N/A';
		}
		return `${key.substring(0, 2)}·······${key.slice(-2).trim()}`;
	};

	const handleCopyLicenseKey = (text: string): void => {
		copyToClipboard(text);
		if (!navigator.clipboard) {
			toast.error('Failed to copy license key.', { richColors: true });
			return;
		}
		toast.success('License key copied to clipboard.', { richColors: true });
	};

	return (
		<div className="custom-domain-card-bottom">
			<span className="custom-domain-card-license-left">
				<KeyRound size={14} />
				<span className="custom-domain-card-license-label">SigNoz License Key</span>
			</span>
			<span className="custom-domain-card-license-value">
				<code className="custom-domain-license-key-code">
					{getMaskedKey(activeLicense.key)}
				</code>
				<Button
					type="button"
					size="xs"
					aria-label="Copy license key"
					data-testid="license-key-row-copy-btn"
					className="custom-domain-license-key-copy-btn"
					onClick={(): void => handleCopyLicenseKey(activeLicense.key)}
				>
					<Copy size={12} />
				</Button>
			</span>
		</div>
	);
}

export default LicenseKeyRow;
