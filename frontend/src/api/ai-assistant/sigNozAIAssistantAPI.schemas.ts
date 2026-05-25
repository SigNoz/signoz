/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz AI Assistant
 * * regenerate with 'yarn generate:api'
 * SigNoz AI Assistant API
 * OpenAPI spec version: 0.1.0
 */
/**
 * Result of an undo/revert/restore operation as reported to the client.
 */
export enum ActionLifecycleResultDTO {
	deleted = 'deleted',
	reverted = 'reverted',
	restored = 'restored',
}
/**
 * Shared response for undo, revert, restore.
 */
export interface ActionResultResponseDTO {
	/**
	 * @type boolean
	 */
	success?: boolean;
	/**
	 * @type string
	 */
	resourceType: string;
	/**
	 * @type string
	 */
	resourceId: string;
	action: ActionLifecycleResultDTO;
}

export enum ApplyFilterSignalDTO {
	logs = 'logs',
	traces = 'traces',
	metrics = 'metrics',
}
/**
 * Resolved approval (approved/rejected/superseded) anchored on the assistant message that proposed it. Pending approvals never appear here - they live at the top-level pendingApproval slot.
 */
export interface ApprovalActionSummaryDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	approvalId: string;
	state: ApprovalStateDTO;
	actionType: ApprovalActionTypeDTO;
	/**
	 * @type string
	 */
	resourceType: string;
	/**
	 * @type string
	 */
	summary: string;
	/**
	 * @type string
	 * @format date-time
	 */
	resolvedAt: string;
}

export enum ApprovalActionTypeDTO {
	modify = 'modify',
	delete = 'delete',
}
export enum ApprovalStateDTO {
	pending = 'pending',
	approved = 'approved',
	rejected = 'rejected',
	superseded = 'superseded',
}
export type ApprovalSummaryDTODiff = { [key: string]: unknown };

export interface ApprovalSummaryDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	approvalId: string;
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
	/**
	 * @type string
	 * @format uuid
	 */
	sourceMessageId: string;
	state: ApprovalStateDTO;
	actionType: ApprovalActionTypeDTO;
	/**
	 * @type string
	 */
	resourceType: string;
	/**
	 * @type string
	 */
	summary: string;
	/**
	 * @type object
	 */
	diff?: ApprovalSummaryDTODiff;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
}

export interface ApproveRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	approvalId: string;
}

/**
 * Approve starts a new execution for the replay.
 */
export interface ApproveResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
}

export interface CancelRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	threadId: string;
}

export interface CancelResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
	previousState: ExecutionStateDTO;
	state: ExecutionStateDTO;
}

export type ClarificationFieldDTOOptions = string[] | null;

export type ClarificationFieldDTODefault = string | string[] | null;

export interface ClarificationFieldDTO {
	/**
	 * @type string
	 */
	id: string;
	type: ClarificationFieldTypeDTO;
	/**
	 * @type string
	 */
	label: string;
	/**
	 * @type boolean
	 */
	required?: boolean;
	options?: ClarificationFieldDTOOptions;
	/**
	 * @type boolean
	 */
	allowCustom?: boolean;
	default?: ClarificationFieldDTODefault;
}

export enum ClarificationFieldTypeDTO {
	text = 'text',
	number = 'number',
	select = 'select',
	multi_select = 'multi_select',
	boolean = 'boolean',
}
export enum ClarificationStateDTO {
	pending = 'pending',
	submitted = 'submitted',
	superseded = 'superseded',
}
export type ClarificationSummaryDTODiscoveredContextAnyOf = {
	[key: string]: unknown;
};

export type ClarificationSummaryDTODiscoveredContext =
	ClarificationSummaryDTODiscoveredContextAnyOf | null;

export interface ClarificationSummaryDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	clarificationId: string;
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
	/**
	 * @type string
	 * @format uuid
	 */
	sourceMessageId: string;
	state: ClarificationStateDTO;
	/**
	 * @type string
	 */
	message: string;
	discoveredContext?: ClarificationSummaryDTODiscoveredContext;
	/**
	 * @type array
	 */
	fields?: ClarificationFieldDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
}

export type ClarifyRequestDTOAnswers = { [key: string]: unknown };

export interface ClarifyRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	clarificationId: string;
	/**
	 * @type object
	 */
	answers: ClarifyRequestDTOAnswers;
}

/**
 * Clarify starts a new execution for the continuation.
 */
export interface ClarifyResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
}

export type CreateMessageRequestDTOContexts = MessageContextDTO[] | null;

export type CreateMessageRequestDTOForkFromMessageId = string | null;

export interface CreateMessageRequestDTO {
	/**
	 * @type string
	 * @maxLength 20000
	 * @minLength 1
	 */
	content: string;
	contexts?: CreateMessageRequestDTOContexts;
	forkFromMessageId?: CreateMessageRequestDTOForkFromMessageId;
}

export interface CreateMessageResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
}

export type CreateThreadRequestDTOTitle = string | null;

export interface CreateThreadRequestDTO {
	title?: CreateThreadRequestDTOTitle;
}

export interface CreateThreadResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	threadId: string;
}

export type ErrorBodyDTOErrors = ErrorResponseAdditionalDTO[] | null;

export type ErrorBodyDTOUrl = string | null;

/**
 * Inner error object — matches Go ErrorsJSON.
 */
export interface ErrorBodyDTO {
	/**
	 * @type string
	 * @pattern ^[a-z_]+$
	 */
	code: string;
	/**
	 * @type string
	 */
	message: string;
	errors?: ErrorBodyDTOErrors;
	url?: ErrorBodyDTOUrl;
}

/**
 * Top-level error envelope — matches Go RenderErrorResponse.
 */
export interface ErrorResponseDTO {
	/**
	 * @type string
	 */
	status?: string;
	error: ErrorBodyDTO;
}

/**
 * Single sub-error entry — matches Go ErrorsResponseerroradditional.
 */
export interface ErrorResponseAdditionalDTO {
	/**
	 * @type string
	 */
	message: string;
}

export enum ExecutionStateDTO {
	queued = 'queued',
	running = 'running',
	awaiting_approval = 'awaiting_approval',
	awaiting_clarification = 'awaiting_clarification',
	resumed = 'resumed',
	completed = 'completed',
	failed = 'failed',
	canceled = 'canceled',
}
export enum FeedbackRatingDTO {
	positive = 'positive',
	negative = 'negative',
}
export type FeedbackRequestDTOComment = string | null;

export interface FeedbackRequestDTO {
	rating: FeedbackRatingDTO;
	comment?: FeedbackRequestDTOComment;
}

export interface FeedbackResponseDTO {
	[key: string]: unknown;
}

export interface HTTPValidationErrorDTO {
	/**
	 * @type array
	 */
	detail?: ValidationErrorDTO[];
}

export const HealthResponseDTOValue = {
	/**
	 * @type string
	 */
	status: 'ok',
} as const;
export type HealthResponseDTO = typeof HealthResponseDTOValue;

export type MessageActionDTOActionMetadataId = string | null;

export type MessageActionDTOResourceType = string | null;

export type MessageActionDTOResourceId = string | null;

export type MessageActionDTOState = string | null;

export type MessageActionDTOInputAnyOf = { [key: string]: unknown };

export type MessageActionDTOInput = MessageActionDTOInputAnyOf | null;

export type MessageActionDTOTooltip = string | null;

export type MessageActionDTOSignal = ApplyFilterSignalDTO | null;

export type MessageActionDTOQueryAnyOf = { [key: string]: unknown };

export type MessageActionDTOQuery = MessageActionDTOQueryAnyOf | null;

export type MessageActionDTOUrl = string | null;

/**
 * Assistant action. Kind-specific requirements: rollback actions require actionMetadataId/resourceType/resourceId; follow_up requires input.intent; open_resource requires resourceType/resourceId; apply_filter requires signal and query; open_docs requires a SigNoz docs url.
 */
export interface MessageActionDTO {
	kind: MessageActionKindDTO;
	/**
	 * @type string
	 */
	label: string;
	actionMetadataId?: MessageActionDTOActionMetadataId;
	resourceType?: MessageActionDTOResourceType;
	resourceId?: MessageActionDTOResourceId;
	state?: MessageActionDTOState;
	input?: MessageActionDTOInput;
	tooltip?: MessageActionDTOTooltip;
	signal?: MessageActionDTOSignal;
	query?: MessageActionDTOQuery;
	url?: MessageActionDTOUrl;
}

export enum MessageActionKindDTO {
	undo = 'undo',
	revert = 'revert',
	restore = 'restore',
	follow_up = 'follow_up',
	open_resource = 'open_resource',
	open_docs = 'open_docs',
	apply_filter = 'apply_filter',
}
export enum MessageContentTypeDTO {
	markdown = 'markdown',
}
/**
 * "auto" if derived from current page; "mention" if explicitly @-picked.
 */
export enum MessageContextDTOSource {
	auto = 'auto',
	mention = 'mention',
}
/**
 * Resource taxonomy. Use metadata.page for concrete page identity.
 */
export enum MessageContextDTOType {
	dashboard = 'dashboard',
	alert = 'alert',
	saved_view = 'saved_view',
	logs_explorer = 'logs_explorer',
	traces_explorer = 'traces_explorer',
	metrics_explorer = 'metrics_explorer',
	service = 'service',
}
/**
 * Required for resource-detail pages: dashboard_detail, panel_edit, panel_fullscreen, alert_edit, service_detail. Always required for saved_view (mention-only — no list page in V1). Must be null for list/index/draft/detail-as-metadata pages such as dashboard_list, alert_list, alert_new, alerts_triggered, services_list, log_detail, and trace_detail.
 */
export type MessageContextDTOResourceId = string | null;

export type MessageContextDTOResourceName = string | null;

export type MessageContextDTOMetadataAnyOf = { [key: string]: unknown };

/**
 * Page-specific extras. metadata.page identifies list/draft pages and detail-as-metadata pages. Required non-empty metadata keys: panel_edit.widgetId, panel_fullscreen.widgetId, trace_detail.traceId. timeRange.{start,end} use Unix milliseconds.
 */
export type MessageContextDTOMetadata = MessageContextDTOMetadataAnyOf | null;

export interface MessageContextDTO {
	/**
	 * @enum auto,mention
	 * @type string
	 * @description "auto" if derived from current page; "mention" if explicitly @-picked.
	 */
	source: MessageContextDTOSource;
	/**
	 * @enum dashboard,alert,saved_view,logs_explorer,traces_explorer,metrics_explorer,service
	 * @type string
	 * @description Resource taxonomy. Use metadata.page for concrete page identity.
	 */
	type: MessageContextDTOType;
	/**
	 * @description Required for resource-detail pages: dashboard_detail, panel_edit, panel_fullscreen, alert_edit, service_detail. Always required for saved_view (mention-only — no list page in V1). Must be null for list/index/draft/detail-as-metadata pages such as dashboard_list, alert_list, alert_new, alerts_triggered, services_list, log_detail, and trace_detail.
	 */
	resourceId?: MessageContextDTOResourceId;
	resourceName?: MessageContextDTOResourceName;
	/**
	 * @description Page-specific extras. metadata.page identifies list/draft pages and detail-as-metadata pages. Required non-empty metadata keys: panel_edit.widgetId, panel_fullscreen.widgetId, trace_detail.traceId. timeRange.{start,end} use Unix milliseconds.
	 */
	metadata?: MessageContextDTOMetadata;
}

export enum MessageRoleDTO {
	user = 'user',
	assistant = 'assistant',
	system = 'system',
}
export type MessageSummaryDTOContent = string | null;

export type MessageSummaryDTOToolCallsAnyOfItem = { [key: string]: unknown };

export type MessageSummaryDTOToolCalls =
	| MessageSummaryDTOToolCallsAnyOfItem[]
	| null;

export type MessageSummaryDTOBlocksAnyOfItem = { [key: string]: unknown };

export type MessageSummaryDTOBlocks = MessageSummaryDTOBlocksAnyOfItem[] | null;

export type MessageSummaryDTOContexts = MessageContextDTO[] | null;

export type MessageSummaryDTOActions = MessageActionDTO[] | null;

/**
 * Resolved approvals (approved/rejected/superseded) anchored to this assistant message. Pending approvals appear only at top-level pendingApproval, never here.
 */
export type MessageSummaryDTOApprovals = ApprovalActionSummaryDTO[] | null;

export type MessageSummaryDTOFeedbackRating = FeedbackRatingDTO | null;

export type MessageSummaryDTOFeedbackComment = string | null;

export type MessageSummaryDTOExecutionId = string | null;

export interface MessageSummaryDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	messageId: string;
	role: MessageRoleDTO;
	contentType?: MessageContentTypeDTO;
	content?: MessageSummaryDTOContent;
	/**
	 * @type boolean
	 */
	complete?: boolean;
	toolCalls?: MessageSummaryDTOToolCalls;
	blocks?: MessageSummaryDTOBlocks;
	contexts?: MessageSummaryDTOContexts;
	actions?: MessageSummaryDTOActions;
	/**
	 * @description Resolved approvals (approved/rejected/superseded) anchored to this assistant message. Pending approvals appear only at top-level pendingApproval, never here.
	 */
	approvals?: MessageSummaryDTOApprovals;
	feedbackRating?: MessageSummaryDTOFeedbackRating;
	feedbackComment?: MessageSummaryDTOFeedbackComment;
	executionId?: MessageSummaryDTOExecutionId;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}

export enum ReadinessChecksDTODatabase {
	ok = 'ok',
	failed = 'failed',
}
export enum ReadinessChecksDTORedis {
	ok = 'ok',
	failed = 'failed',
}
export interface ReadinessChecksDTO {
	/**
	 * @type string
	 * @enum ok,failed
	 */
	database: ReadinessChecksDTODatabase;
	/**
	 * @type string
	 * @enum ok,failed
	 */
	redis: ReadinessChecksDTORedis;
}

export enum ReadinessResponseDTOStatus {
	ok = 'ok',
	degraded = 'degraded',
}
export interface ReadinessResponseDTO {
	/**
	 * @type string
	 * @enum ok,degraded
	 */
	status: ReadinessResponseDTOStatus;
	checks: ReadinessChecksDTO;
}

export interface RegenerateResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	executionId: string;
}

export interface RejectRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	approvalId: string;
}

export interface RestoreRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	actionMetadataId: string;
}

export interface RevertRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	actionMetadataId: string;
}

export type ThreadDetailResponseDTOTitle = string | null;

export type ThreadDetailResponseDTOState = ExecutionStateDTO | null;

export type ThreadDetailResponseDTOActiveExecutionId = string | null;

export type ThreadDetailResponseDTOPendingApproval = ApprovalSummaryDTO | null;

export type ThreadDetailResponseDTOPendingClarification =
	ClarificationSummaryDTO | null;

/**
 * Full thread state for cold-start reconstruction (GET /threads/{id}).
 */
export interface ThreadDetailResponseDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	threadId: string;
	title?: ThreadDetailResponseDTOTitle;
	state?: ThreadDetailResponseDTOState;
	activeExecutionId?: ThreadDetailResponseDTOActiveExecutionId;
	/**
	 * @type boolean
	 */
	archived?: boolean;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type array
	 */
	messages?: MessageSummaryDTO[];
	pendingApproval?: ThreadDetailResponseDTOPendingApproval;
	pendingClarification?: ThreadDetailResponseDTOPendingClarification;
}

export type ThreadListResponseDTONextCursor = string | null;

export interface ThreadListResponseDTO {
	/**
	 * @type array
	 */
	threads: ThreadSummaryDTO[];
	nextCursor?: ThreadListResponseDTONextCursor;
	/**
	 * @type boolean
	 */
	hasMore?: boolean;
}

export type ThreadSummaryDTOTitle = string | null;

export type ThreadSummaryDTOState = ExecutionStateDTO | null;

export type ThreadSummaryDTOActiveExecutionId = string | null;

/**
 * Thread list item.
 */
export interface ThreadSummaryDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	threadId: string;
	title?: ThreadSummaryDTOTitle;
	state?: ThreadSummaryDTOState;
	activeExecutionId?: ThreadSummaryDTOActiveExecutionId;
	/**
	 * @type boolean
	 */
	archived?: boolean;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}

export interface UndoRequestDTO {
	/**
	 * @type string
	 * @format uuid
	 */
	actionMetadataId: string;
}

export type UpdateThreadRequestDTOTitle = string | null;

export type UpdateThreadRequestDTOArchived = boolean | null;

export interface UpdateThreadRequestDTO {
	title?: UpdateThreadRequestDTOTitle;
	archived?: UpdateThreadRequestDTOArchived;
}

export type ValidationErrorDTOLocItem = string | number;

export type ValidationErrorDTOCtx = { [key: string]: unknown };

export interface ValidationErrorDTO {
	/**
	 * @type array
	 */
	loc: ValidationErrorDTOLocItem[];
	/**
	 * @type string
	 */
	msg: string;
	/**
	 * @type string
	 */
	type: string;
	input?: unknown;
	/**
	 * @type object
	 */
	ctx?: ValidationErrorDTOCtx;
}

export type ApprovalEventDTODiff = { [key: string]: unknown };

export interface ApprovalEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	/**
	 * @type string
	 */
	approvalId: string;
	actionType: ApprovalActionTypeDTO;
	/**
	 * @type string
	 */
	resourceType: string;
	/**
	 * @type string
	 */
	summary: string;
	/**
	 * @type object
	 */
	diff?: ApprovalEventDTODiff;
}

export type ClarificationFieldEventDTOOptions = string[] | null;

export type ClarificationFieldEventDTODefault = string | string[] | null;

export interface ClarificationFieldEventDTO {
	/**
	 * @type string
	 */
	id: string;
	type: ClarificationFieldTypeDTO;
	/**
	 * @type string
	 */
	label: string;
	/**
	 * @type boolean
	 */
	required?: boolean;
	options?: ClarificationFieldEventDTOOptions;
	/**
	 * @type boolean
	 */
	allowCustom?: boolean;
	default?: ClarificationFieldEventDTODefault;
}

export type ClarificationEventDTODiscoveredContextAnyOf = {
	[key: string]: unknown;
};

export type ClarificationEventDTODiscoveredContext =
	ClarificationEventDTODiscoveredContextAnyOf | null;

export interface ClarificationEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	/**
	 * @type string
	 */
	clarificationId: string;
	/**
	 * @type string
	 */
	message: string;
	discoveredContext?: ClarificationEventDTODiscoveredContext;
	/**
	 * @type array
	 */
	fields?: ClarificationFieldEventDTO[];
}

export interface ConversationEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	threadId: string;
	/**
	 * @type string
	 */
	title: string;
}

export interface DoneEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	/**
	 * @type integer
	 */
	tokenInput: number;
	/**
	 * @type integer
	 */
	tokenOutput: number;
	/**
	 * @type integer
	 */
	latencyMs: number;
}

export enum RetryActionDTO {
	auto = 'auto',
	manual = 'manual',
	none = 'none',
}
export interface ErrorEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	error: ErrorBodyDTO;
	retryAction?: RetryActionDTO;
}

export type MessageActionEventDTOActionMetadataId = string | null;

export type MessageActionEventDTOResourceType = string | null;

export type MessageActionEventDTOResourceId = string | null;

export type MessageActionEventDTOState = string | null;

export type MessageActionEventDTOInputAnyOf = { [key: string]: unknown };

export type MessageActionEventDTOInput = MessageActionEventDTOInputAnyOf | null;

export type MessageActionEventDTOTooltip = string | null;

export type MessageActionEventDTOSignal = ApplyFilterSignalDTO | null;

export type MessageActionEventDTOQueryAnyOf = { [key: string]: unknown };

export type MessageActionEventDTOQuery = MessageActionEventDTOQueryAnyOf | null;

export type MessageActionEventDTOUrl = string | null;

/**
 * Assistant action. Kind-specific requirements: rollback actions require actionMetadataId/resourceType/resourceId; follow_up requires input.intent; open_resource requires resourceType/resourceId; apply_filter requires signal and query; open_docs requires a SigNoz docs url.
 */
export interface MessageActionEventDTO {
	kind: MessageActionKindDTO;
	/**
	 * @type string
	 */
	label: string;
	actionMetadataId?: MessageActionEventDTOActionMetadataId;
	resourceType?: MessageActionEventDTOResourceType;
	resourceId?: MessageActionEventDTOResourceId;
	state?: MessageActionEventDTOState;
	input?: MessageActionEventDTOInput;
	tooltip?: MessageActionEventDTOTooltip;
	signal?: MessageActionEventDTOSignal;
	query?: MessageActionEventDTOQuery;
	url?: MessageActionEventDTOUrl;
}

export type MessageEventDTOActions = MessageActionEventDTO[] | null;

export interface MessageEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	/**
	 * @type string
	 */
	messageId: string;
	/**
	 * @type string
	 */
	delta: string;
	/**
	 * @type boolean
	 */
	done?: boolean;
	actions?: MessageEventDTOActions;
}

export interface StatusEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	state: ExecutionStateDTO;
}

export interface ThinkingEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	/**
	 * @type string
	 */
	content: string;
}

export type ToolCallEventDTOMessageId = string | null;

export type ToolCallEventDTOToolCallId = string | null;

export type ToolCallEventDTOToolInput = { [key: string]: unknown };

export type ToolCallEventDTODisplayText = string | null;

export type ToolCallEventDTOIconKey = string | null;

export interface ToolCallEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	messageId?: ToolCallEventDTOMessageId;
	toolCallId?: ToolCallEventDTOToolCallId;
	/**
	 * @type string
	 */
	toolName: string;
	/**
	 * @type object
	 */
	toolInput: ToolCallEventDTOToolInput;
	displayText?: ToolCallEventDTODisplayText;
	iconKey?: ToolCallEventDTOIconKey;
}

export type ToolResultEventDTOMessageId = string | null;

export type ToolResultEventDTOToolCallId = string | null;

export type ToolResultEventDTOResult = { [key: string]: unknown };

export type ToolResultEventDTODisplayText = string | null;

export type ToolResultEventDTOIconKey = string | null;

export interface ToolResultEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	messageId?: ToolResultEventDTOMessageId;
	toolCallId?: ToolResultEventDTOToolCallId;
	/**
	 * @type boolean
	 */
	success?: boolean;
	/**
	 * @type string
	 */
	toolName: string;
	/**
	 * @type object
	 */
	result: ToolResultEventDTOResult;
	displayText?: ToolResultEventDTODisplayText;
	iconKey?: ToolResultEventDTOIconKey;
}

export interface UserMessageEventDTO {
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	executionId: string;
	/**
	 * @type integer
	 */
	eventId?: number;
	message: MessageSummaryDTO;
}

export type CreateThreadApiV1AssistantThreadsPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type CreateThreadApiV1AssistantThreadsPostBody =
	CreateThreadRequestDTO | null;

export type ListThreadsApiV1AssistantThreadsGetParams = {
	/**
	 * @enum true,false,all
	 * @type string
	 * @description Filter: true, false, or all
	 */
	archived?: ListThreadsApiV1AssistantThreadsGetArchived;
	/**
	 * @type integer
	 * @maximum 50
	 * @minimum 1
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @description Opaque cursor from previous response's nextCursor
	 */
	cursor?: string | null;
	/**
	 * @type string
	 * @description Sort order. V1: updated_desc only
	 */
	sort?: 'updated_desc';
};

export enum ListThreadsApiV1AssistantThreadsGetArchived {
	true = 'true',
	false = 'false',
	all = 'all',
}
export type ListThreadsApiV1AssistantThreadsGetHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type GetThreadApiV1AssistantThreadsThreadIdGetPathParameters = {
	threadId: string;
};
export type GetThreadApiV1AssistantThreadsThreadIdGetHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type UpdateThreadApiV1AssistantThreadsThreadIdPatchPathParameters = {
	threadId: string;
};
export type UpdateThreadApiV1AssistantThreadsThreadIdPatchHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type CreateMessageApiV1AssistantThreadsThreadIdMessagesPostPathParameters =
	{
		threadId: string;
	};
export type CreateMessageApiV1AssistantThreadsThreadIdMessagesPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostPathParameters =
	{
		messageId: string;
	};
export type RegenerateMessageApiV1AssistantMessagesMessageIdRegeneratePostHeaders =
	{
		/**
		 * @description SigNoz auth token (Bearer or raw JWT)
		 */
		authorization?: string | null;
		/**
		 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
		 */
		'X-SigNoz-URL'?: string | null;
	};

export type ApproveApiV1AssistantApprovePostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type RejectApiV1AssistantRejectPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type ClarifyApiV1AssistantClarifyPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type CancelApiV1AssistantCancelPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type UndoApiV1AssistantUndoPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type RevertApiV1AssistantRevertPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type RestoreApiV1AssistantRestorePostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};

export type SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostPathParameters =
	{
		messageId: string;
	};
export type SubmitFeedbackApiV1AssistantMessagesMessageIdFeedbackPostHeaders = {
	/**
	 * @description SigNoz auth token (Bearer or raw JWT)
	 */
	authorization?: string | null;
	/**
	 * @description SigNoz instance base URL for multi-tenant deployments. Falls back to SIGNOZ_API_URL env var when omitted.
	 */
	'X-SigNoz-URL'?: string | null;
};
