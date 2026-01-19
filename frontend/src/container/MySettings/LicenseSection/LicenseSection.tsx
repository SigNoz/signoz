import { Typography } from 'antd';
import { useNotifications } from 'hooks/useNotifications';
import { Copy } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCopyToClipboard } from 'react-use';

function LicenseSection(): JSX.Element {
	const { activeLicense } = useAppContext();
	const { notifications } = useNotifications();
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const getMaskedKey = (key: string): string => {
		if (!key || key.length < 4) return key || 'N/A';
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

	return (
		<div className="user-preference-section">
			<div className="user-preference-section-header">
				<div className="user-preference-section-title">License</div>
			</div>

			<div className="user-preference-section-content">
				<div className="user-preference-section-content-item">
					<div className="user-preference-section-content-item-title-action">
						<span>License key</span>
						{activeLicense?.key ? (
							<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Typography.Text code>
									{getMaskedKey(activeLicense.key)}
								</Typography.Text>
								<Copy
									size={14}
									style={{ cursor: 'pointer' }}
									onClick={(): void => handleCopyKey(activeLicense.key)}
								/>
							</span>
						) : (
							<Typography.Text>N/A</Typography.Text>
						)}
					</div>

					<div className="user-preference-section-content-item-description">
						Your SigNoz license key.
					</div>
				</div>
			</div>
		</div>
	);
}

export default LicenseSection;
