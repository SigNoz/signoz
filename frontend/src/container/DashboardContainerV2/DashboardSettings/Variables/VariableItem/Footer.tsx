import { Button } from 'antd';
import { Check, X } from '@signozhq/icons';

import { VariableItemRow } from '../../../../DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/styles';

interface Props {
	saving: boolean;
	canSave: boolean;
	onSave: () => void;
	onCancel: () => void;
}

function Footer({ saving, canSave, onSave, onCancel }: Props): JSX.Element {
	return (
		<div className="variable-item-footer">
			<VariableItemRow>
				<Button
					type="default"
					onClick={onCancel}
					icon={<X size={14} />}
					className="footer-btn-discard"
					disabled={saving}
					data-testid="variable-cancel-v2"
				>
					Discard
				</Button>
				<Button
					type="primary"
					onClick={onSave}
					icon={<Check size={14} />}
					className="footer-btn-save"
					loading={saving}
					disabled={!canSave || saving}
					data-testid="variable-save-v2"
				>
					Save Variable
				</Button>
			</VariableItemRow>
		</div>
	);
}

export default Footer;
