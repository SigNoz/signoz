import { Radio, RadioChangeEvent, Space, Typography } from 'antd';
import { useState } from 'react';

export default function SelectMethod(): JSX.Element {
	const [value, setValue] = useState(1);

	const onChange = (e: RadioChangeEvent): void => {
		console.log('radio checked', e.target.value);
		setValue(e.target.value);
	};

	return (
		<div>
			<Radio.Group onChange={onChange} value={value}>
				<Space direction="vertical">
					<Radio value={1}>
						<Typography.Text> Use Recommended Steps </Typography.Text> <br />
						<small>Enter a short text about why we need the recommended steps.</small>
					</Radio>

					<Radio value={2}>
						<Typography.Text> Quick Start </Typography.Text> <br />
						<small>Enter a short text about why we need the quick start</small>
					</Radio>
				</Space>
			</Radio.Group>
		</div>
	);
}
