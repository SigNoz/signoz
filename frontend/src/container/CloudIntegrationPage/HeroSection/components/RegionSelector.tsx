import './RegionSelector.style.scss';

import { Checkbox } from 'antd';
import { useRegionSelection } from 'hooks/integration/aws/useRegionSelection';
import { Dispatch, SetStateAction } from 'react';
import { regions } from 'utils/regions';

export function RegionSelector({
	selectedRegions,
	setSelectedRegions,
	setIncludeAllRegions,
}: {
	selectedRegions: string[];
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
	const {
		allRegionIds,
		handleSelectAll,
		handleRegionSelect,
	} = useRegionSelection({
		selectedRegions,
		setSelectedRegions,
		setIncludeAllRegions,
	});

	return (
		<div className="region-selector">
			<div className="select-all">
				<Checkbox
					checked={selectedRegions.includes('all')}
					indeterminate={
						selectedRegions.length > 20 &&
						selectedRegions.length < allRegionIds.length
					}
					onChange={(e): void => handleSelectAll(e.target.checked)}
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
								checked={
									selectedRegions.includes('all') ||
									selectedRegions.includes(subRegion.id)
								}
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
