/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesNamespaceRecordDTOCounts } from './inframonitoringtypesNamespaceRecordDTOCounts';
import type { InframonitoringtypesNamespaceRecordDTOMeta } from './inframonitoringtypesNamespaceRecordDTOMeta';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesNamespaceRecordDTO {
	/**
	 * @type object
	 */
	counts: InframonitoringtypesNamespaceRecordDTOCounts;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesNamespaceRecordDTOMeta;
	/**
	 * @type number
	 * @format double
	 */
	namespaceCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	namespaceMemory: number;
	/**
	 * @type string
	 */
	namespaceName: string;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}
