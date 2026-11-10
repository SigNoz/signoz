import type { Querybuildertypesv5LabelDTO } from 'api/generated/services/sigNoz.schemas';
import type { Labels } from 'types/api/alerts/def';

export function labelsArrayToObject(
	labels: Querybuildertypesv5LabelDTO[] | null | undefined,
): Labels {
	if (!labels) {
		return {};
	}

	return labels.reduce<Labels>((acc, label) => {
		const key = label.key?.name ?? '';
		const value = String(label.value ?? '');
		if (key) {
			acc[key] = value;
		}
		return acc;
	}, {});
}
