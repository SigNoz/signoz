import { Button, Typography } from 'antd';
import { Anvil, Bookmark } from 'lucide-react';

export const items = [
	{
		label: (
			<Button
				type="text"
				icon={<Bookmark size="14" />}
				className="flamegraph-waterfall-toggle"
			>
				Attributes
			</Button>
		),
		key: 'attributes',
		children: <Typography.Text>Attributes</Typography.Text>,
	},
	{
		label: (
			<Button
				type="text"
				icon={<Anvil size="14" />}
				className="flamegraph-waterfall-toggle"
			>
				Events
			</Button>
		),
		key: 'events',
		children: <Typography.Text>Eventss</Typography.Text>,
	},
];
