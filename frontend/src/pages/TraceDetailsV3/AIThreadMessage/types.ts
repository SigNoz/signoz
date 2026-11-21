import type { AiobservabilitytypesBlobPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesBlobPartDTO';
import type { AiobservabilitytypesCompactionPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesCompactionPartDTO';
import type { AiobservabilitytypesFilePartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesFilePartDTO';
import type { AiobservabilitytypesOutputMessageDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesOutputMessageDTO';
import type { AiobservabilitytypesReasoningPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesReasoningPartDTO';
import type { AiobservabilitytypesServerToolCallPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesServerToolCallPartDTO';
import type { AiobservabilitytypesServerToolCallResponsePartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesServerToolCallResponsePartDTO';
import type { AiobservabilitytypesTextPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesTextPartDTO';
import type { AiobservabilitytypesToolCallRequestPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesToolCallRequestPartDTO';
import type { AiobservabilitytypesToolCallResponsePartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesToolCallResponsePartDTO';
import type { AiobservabilitytypesUriPartDTO } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesUriPartDTO';

// Generated enum `type`s as string literals, so `part.type === 'text'` narrows.
type Part<T extends { type: string }> = Omit<T, 'type'> & {
	type: `${T['type']}`;
};

// Keys the schema marks required may still be missing.
type LoosePart<T extends { type: string }> = Partial<Omit<T, 'type'>> & {
	type: `${T['type']}`;
};

/** OTel GenAI message part; `text` content is always normalised to a string. */
export type MessagePart =
	| Part<AiobservabilitytypesTextPartDTO>
	| LoosePart<AiobservabilitytypesReasoningPartDTO>
	| LoosePart<AiobservabilitytypesCompactionPartDTO>
	| LoosePart<AiobservabilitytypesToolCallRequestPartDTO>
	| LoosePart<AiobservabilitytypesToolCallResponsePartDTO>
	| LoosePart<AiobservabilitytypesServerToolCallPartDTO>
	| LoosePart<AiobservabilitytypesServerToolCallResponsePartDTO>
	| LoosePart<AiobservabilitytypesBlobPartDTO>
	| LoosePart<AiobservabilitytypesFilePartDTO>
	| LoosePart<AiobservabilitytypesUriPartDTO>
	// The API's generic part is an untyped index signature, which defeats narrowing on `type`.
	| { type: 'generic'; content?: unknown };

export type MessagePartType = MessagePart['type'];

export type MediaMessagePart = Extract<
	MessagePart,
	{ type: 'blob' | 'file' | 'uri' }
>;

// role: system | developer | user | assistant | tool; any other value renders headerless.
// finish_reason: stop | tool_call | length | content_filter | compaction | error, or provider-specific.
export type ThreadMessage = Partial<
	Omit<AiobservabilitytypesOutputMessageDTO, 'parts'>
> & {
	parts: MessagePart[];
};

export enum MessageType {
	Input = 'input',
	Output = 'output',
}
