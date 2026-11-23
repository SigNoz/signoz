import { ArrowUpRight, KeyRound } from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';

interface SetupGuideCalloutProps {
	description: string;
	docsUrl: string;
	linkLabel: string;
}

function SetupGuideCallout({
	description,
	docsUrl,
	linkLabel,
}: SetupGuideCalloutProps): JSX.Element {
	return (
		<Callout
			color="primary"
			size="sm"
			icon={<KeyRound />}
			testId="gcp-setup-guide-callout"
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{description}
			</Typography>
			<Callout.Link href={docsUrl} target="_blank" testId="gcp-setup-guide-link">
				{linkLabel}
				<ArrowUpRight size={12} />
			</Callout.Link>
		</Callout>
	);
}

export default SetupGuideCallout;
