import { GripVertical } from '@signozhq/icons';
import { Switch } from 'antd';

import { holdIconStyle } from '../config';
import { LastActionColumn } from '../styles';

function DragAction({ isEnabled, onChange }: DragActionProps): JSX.Element {
	return (
		<LastActionColumn>
			<Switch defaultChecked={isEnabled} onChange={onChange} />
			<GripVertical size="lg" style={holdIconStyle} />
		</LastActionColumn>
	);
}

interface DragActionProps {
	isEnabled: boolean;
	onChange: (checked: boolean) => void;
}

export default DragAction;
