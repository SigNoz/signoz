import { Typography } from '@signozhq/ui/typography';

function PaginationInfoText(
	total: number,
	[start, end]: number[],
): JSX.Element {
	return (
		<span
			style={{
				position: 'absolute',
				left: 0,
				width: 'max-content',
				marginLeft: '16px',
			}}
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{start} &#8212; {end}
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{' '}
				of {total}
			</Typography>
		</span>
	);
}

export default PaginationInfoText;
