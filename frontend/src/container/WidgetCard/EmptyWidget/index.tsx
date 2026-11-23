import { Typography } from '@signozhq/ui/typography';

import { Container } from 'container/WidgetCard/EmptyWidget/styles';

function EmptyWidget(): JSX.Element {
	return (
		<Container>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				Click one of the widget types above (Time Series / Value) to add here
			</Typography>
		</Container>
	);
}

export default EmptyWidget;
