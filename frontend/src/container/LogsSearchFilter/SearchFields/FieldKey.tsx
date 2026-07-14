import { Typography } from '@signozhq/ui/typography';

interface FieldKeyProps {
	name: string;
	type: string;
}

function FieldKey({ name, type }: FieldKeyProps): JSX.Element {
	return (
		<span style={{ margin: '0.25rem 0', display: 'flex', gap: '0.5rem' }}>
			<Typography.Text>{name}</Typography.Text>
			<Typography.Text color="muted" italic>
				{type}
			</Typography.Text>
		</span>
	);
}

export default FieldKey;
