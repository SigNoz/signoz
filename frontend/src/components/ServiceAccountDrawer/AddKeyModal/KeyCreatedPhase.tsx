import { Badge } from '@signozhq/badge';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Check, Copy } from '@signozhq/icons';
import type { ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO } from 'api/generated/services/sigNoz.schemas';

export interface KeyCreatedPhaseProps {
	createdKey: ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO;
	hasCopied: boolean;
	expiryLabel: string;
	onCopy: () => void;
}

function KeyCreatedPhase({
	createdKey,
	hasCopied,
	expiryLabel,
	onCopy,
}: KeyCreatedPhaseProps): JSX.Element {
	return (
		<div className="add-key-modal__form">
			<div className="add-key-modal__field">
				<span className="add-key-modal__label">Key</span>
				<div className="add-key-modal__key-display">
					<span className="add-key-modal__key-text">{createdKey.key}</span>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						onClick={onCopy}
						className="add-key-modal__copy-btn"
					>
						{hasCopied ? <Check size={12} /> : <Copy size={12} />}
					</Button>
				</div>
			</div>

			<div className="add-key-modal__expiry-meta">
				<span className="add-key-modal__expiry-label">Expiration</span>
				<Badge color="vanilla">{expiryLabel}</Badge>
			</div>

			<Callout
				type="info"
				showIcon
				message="Store the key securely. This is the only time it will be displayed."
			/>
		</div>
	);
}

export default KeyCreatedPhase;
