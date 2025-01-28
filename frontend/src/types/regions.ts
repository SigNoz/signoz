export interface Region {
	id: string;
	name: string;
	subRegions: SubRegion[];
}

export interface SubRegion {
	id: string;
	name: string;
	displayName: string;
}
