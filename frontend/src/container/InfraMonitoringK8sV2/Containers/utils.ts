import { InframonitoringtypesContainerRecordDTO } from 'api/generated/services/sigNoz.schemas';

import { INFRA_MONITORING_ATTR_KEYS } from '../constants';

export const CONTAINERS_DOC_PATH =
	'/infrastructure-monitoring/kubernetes/containers';

/** Renders as `name:tag`; the tag is dropped when the image is not pinned. */
export function getContainerImageWithTag(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	const name = container.meta?.[INFRA_MONITORING_ATTR_KEYS.CONTAINER_IMAGE_NAME];
	const tag = container.meta?.[INFRA_MONITORING_ATTR_KEYS.CONTAINER_IMAGE_TAG];

	if (!name) {
		return '';
	}

	return tag ? `${name}:${tag}` : name;
}

export function getContainerName(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	return (
		container.containerName ||
		container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME] ||
		''
	);
}

export function getContainerPodUID(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	return (
		container.podUID ||
		container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID] ||
		''
	);
}
