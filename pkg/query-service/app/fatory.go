// Reader finds and loads traces and other data from storage.
type QueryReader interface {
	// GetTrace(ctx context.Context, traceID model.TraceID) (*model.Trace, error)
	GetServices(ctx context.Context)
	// GetOperations(ctx context.Context, query OperationQueryParameters) ([]Operation, error)
	// FindTraces(ctx context.Context, query *TraceQueryParameters) ([]*model.Trace, error)
	// FindTraceIDs(ctx context.Context, query *TraceQueryParameters) ([]model.TraceID, error)
}

func NewQueryReader() {

}
