import { volcano } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

function MissingSpansMessage(): JSX.Element {
	return (
		<Typography>
			<WarningOutlined style={{ color: volcano[6], marginRight: '0.3rem' }} />
			This trace has missing spans, more details{' '}
			<a
				href="https://signoz.io/docs/userguide/traces/?utm_source=product&utm_medium=trace-details#missing-spans"
				target="_blank"
				style={{ textDecoration: 'underline' }}
				rel="noreferrer"
			>
				here
			</a>
		</Typography>
	);
}

export default MissingSpansMessage;
