import {
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';

const VERTICAL_LABELS: Record<DashboardtypesVerticalAlignDTO, string> = {
	[DashboardtypesVerticalAlignDTO.top]: 'Top',
	[DashboardtypesVerticalAlignDTO.center]: 'Middle',
	[DashboardtypesVerticalAlignDTO.bottom]: 'Bottom',
};

const HORIZONTAL_LABELS: Record<DashboardtypesTextAlignDTO, string> = {
	[DashboardtypesTextAlignDTO.left]: 'left',
	[DashboardtypesTextAlignDTO.center]: 'center',
	[DashboardtypesTextAlignDTO.right]: 'right',
};

export interface Alignment {
	textAlign: DashboardtypesTextAlignDTO;
	verticalAlign: DashboardtypesVerticalAlignDTO;
}

export const ALIGNMENT_CELLS: Alignment[] = Object.values(
	DashboardtypesVerticalAlignDTO,
).flatMap((verticalAlign) =>
	Object.values(DashboardtypesTextAlignDTO).map((textAlign) => ({
		textAlign,
		verticalAlign,
	})),
);

export function alignmentLabel({
	textAlign,
	verticalAlign,
}: Alignment): string {
	return `${VERTICAL_LABELS[verticalAlign]} ${HORIZONTAL_LABELS[textAlign]}`;
}
