/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesBlobPartDTO } from './aiobservabilitytypesBlobPartDTO';
import type { AiobservabilitytypesCompactionPartDTO } from './aiobservabilitytypesCompactionPartDTO';
import type { AiobservabilitytypesFilePartDTO } from './aiobservabilitytypesFilePartDTO';
import type { AiobservabilitytypesGenericPartDTO } from './aiobservabilitytypesGenericPartDTO';
import type { AiobservabilitytypesReasoningPartDTO } from './aiobservabilitytypesReasoningPartDTO';
import type { AiobservabilitytypesServerToolCallPartDTO } from './aiobservabilitytypesServerToolCallPartDTO';
import type { AiobservabilitytypesServerToolCallResponsePartDTO } from './aiobservabilitytypesServerToolCallResponsePartDTO';
import type { AiobservabilitytypesTextPartDTO } from './aiobservabilitytypesTextPartDTO';
import type { AiobservabilitytypesToolCallRequestPartDTO } from './aiobservabilitytypesToolCallRequestPartDTO';
import type { AiobservabilitytypesToolCallResponsePartDTO } from './aiobservabilitytypesToolCallResponsePartDTO';
import type { AiobservabilitytypesUriPartDTO } from './aiobservabilitytypesUriPartDTO';

export type AiobservabilitytypesPartDTO =
	| AiobservabilitytypesTextPartDTO
	| AiobservabilitytypesToolCallRequestPartDTO
	| AiobservabilitytypesToolCallResponsePartDTO
	| AiobservabilitytypesServerToolCallPartDTO
	| AiobservabilitytypesServerToolCallResponsePartDTO
	| AiobservabilitytypesBlobPartDTO
	| AiobservabilitytypesFilePartDTO
	| AiobservabilitytypesUriPartDTO
	| AiobservabilitytypesReasoningPartDTO
	| AiobservabilitytypesCompactionPartDTO
	| AiobservabilitytypesGenericPartDTO;
