import { Dispatch, SetStateAction } from 'react';
import { Checkbox } from '@signozhq/ui/checkbox';
import { useRegionSelection } from 'hooks/integration/aws/useRegionSelection';
import { regions } from 'utils/regions';

import './RegionSelector.style.scss';

export function RegionSelector({
	selectedRegions,
	setSelectedRegions,
	setIncludeAllRegions,
}: {
	selectedRegions: string[];
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
	const { allRegionIds, handleSelectAll, handleRegionSelect } =
		useRegionSelection({
			selectedRegions,
			setSelectedRegions,
			setIncludeAllRegions,
		});

	const allSelected =
		allRegionIds.length > 0 &&
		allRegionIds.every((regionId) => selectedRegions.includes(regionId));
	const someSelected =
		selectedRegions.length > 0 && selectedRegions.length < allRegionIds.length;

	return (
		<div className="region-selector">
			<div className="select-all">
				<Checkbox
					value={allSelected ? true : someSelected ? 'indeterminate' : false}
					onChange={(checked): void => handleSelectAll(checked === true)}
				>
					Select All Regions
				</Checkbox>
			</div>

			<div className="regions-grid">
				{regions.map((region) => (
					<div key={region.id} className="region-group">
						<h3>{region.name}</h3>
						{region.subRegions.map((subRegion) => (
							<Checkbox
								key={subRegion.id}
								value={selectedRegions.includes(subRegion.id)}
								onChange={(): void => handleRegionSelect(subRegion.id)}
							>
								{subRegion.name}
							</Checkbox>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
