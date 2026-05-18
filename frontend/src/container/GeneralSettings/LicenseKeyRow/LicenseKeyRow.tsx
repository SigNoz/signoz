import { useCopyToClipboard } from 'react-use';
import { Copy, KeyRound } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { useAppContext } from 'providers/App/App';
import { getMaskedKey } from 'utils/maskedKey';

import './LicenseKeyRow.styles.scss';

function LicenseKeyRow(): JSX.Element | null {
	const { activeLicense } = useAppContext();
	const [, copyToClipboard] = useCopyToClipboard();

	if (!activeLicense?.key) {
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
				<code className="license-key-row__code">
					{getMaskedKey(activeLicense.key)}
				</code>
				<Button
					type="button"
					size="sm"
					aria-label="Copy license key"
					data-testid="license-key-row-copy-btn"
					className="license-key-row__copy-btn"
					onClick={(): void => handleCopyLicenseKey(activeLicense.key)}
				>
					<Copy size={12} />
				</Button>
			</span>
		</div>
	);
}

export default LicenseKeyRow;
