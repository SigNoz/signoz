import { Button } from 'antd';
import { Play } from 'lucide-react';

export default function RightToolbarActions(): JSX.Element {
	return (
		<div>
			<Button type="primary" icon={<Play size={14} />}>
				Stage & Run Query
			</Button>
		</div>
	);
}
