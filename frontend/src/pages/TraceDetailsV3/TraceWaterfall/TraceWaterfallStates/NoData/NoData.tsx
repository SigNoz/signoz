import { Typography } from '@signozhq/ui/typography';

interface INoDataProps {
	id: string;
}

function NoData(props: INoDataProps): JSX.Element {
	const { id } = props;
	return (
		<Typography
			variant="paragraph"
			size="base"
			weight="regular"
			color="inherit"
			as="span"
			textOverflow="wrap"
		>
			No Trace found with the id: {id}{' '}
		</Typography>
	);
}

export default NoData;
