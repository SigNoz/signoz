import './RegionSelector.style.scss';

import { Checkbox } from 'antd';
import { Dispatch, SetStateAction, useMemo } from 'react';

import { regions } from '../ServicesSection/data';

export function RegionSelector({
	selectedRegions,
	setSelectedRegions,
	setIncludeAllRegions,
}: {
	selectedRegions: string[];
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
	const allRegionIds = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.id)),
		[],
	);
	const handleSelectAll = (checked: boolean): void => {
		setIncludeAllRegions(checked);
		setSelectedRegions(checked ? ['all'] : []);
	};

	const handleRegionSelect = (regionId: string): void => {
		if (selectedRegions.includes('all')) {
			const filteredRegionIds = allRegionIds.filter((id) => id !== regionId);

			setSelectedRegions(filteredRegionIds);
			setIncludeAllRegions(false);
			return;
		}

		setSelectedRegions((prev) => {
			const newSelection = prev.includes(regionId)
				? prev.filter((id) => id !== regionId)
				: [...prev, regionId];

			if (newSelection.length === allRegionIds.length) {
				setIncludeAllRegions(true);
				return ['all'];
			}

			return newSelection;
		});
	};

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
