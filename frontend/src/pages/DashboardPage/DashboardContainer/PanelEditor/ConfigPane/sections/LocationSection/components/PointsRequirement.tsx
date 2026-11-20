import { SolidAlertTriangle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { Typography } from '@signozhq/ui/typography';

import styles from '../LocationSection.module.scss';

interface PointsRequirementProps {
	/** Lat/lon keys to add to Group By. */
	missing: string[];
	/** A country or state column the rows can be placed by instead, if any. */
	areaColumn: string | undefined;
	/** Adds the keys and runs the query; absent outside the query builder. */
	onAddGroupBy: ((keys: string[]) => void) | undefined;
	onUseAreas: () => void;
}

/** How to make points draw, and a way back when the query already names countries or states. */
function PointsRequirement({
	missing,
	areaColumn,
	onAddGroupBy,
	onUseAreas,
}: PointsRequirementProps): JSX.Element {
	const keys = missing.map((key, index) => (
		<span key={key}>
			{index > 0 && <span> and </span>}
			<span className={styles.mono}>{key}</span>
		</span>
	));

	return (
		<Callout
			color="warning"
			size="sm"
			icon={<SolidAlertTriangle />}
			testId="geo-location-points-requirement"
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="medium"
				color="inherit"
				as="p"
				textOverflow="wrap"
			>
				Points need latitude and longitude columns
			</Typography>
			{onAddGroupBy ? (
				<div className={styles.alternative}>
					<span>Add {keys} to Group By.</span>
					<Button
						variant="solid"
						color="primary"
						size="sm"
						testId="geo-location-points-add-group-by"
						onClick={(): void => onAddGroupBy(missing)}
					>
						Add and run query
					</Button>
				</div>
			) : (
				<ol className={styles.steps}>
					<li>Add {keys} to Group By.</li>
					<li>Run the query.</li>
				</ol>
			)}
			{areaColumn && (
				<div className={styles.alternative}>
					<span>Or place each row by a column the query already has.</span>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						testId="geo-location-points-use-areas"
						onClick={onUseAreas}
					>
						Use <span className={styles.mono}>{areaColumn}</span>
					</Button>
				</div>
			)}
		</Callout>
	);
}

export default PointsRequirement;
