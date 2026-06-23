package querybuildertypesv5

import "context"

// filterIntentKey is the context key used to mark that usage is for a filter (WHERE) clause
type filterIntentKey struct{}

func WithFilterIntent(ctx context.Context) context.Context {
	return context.WithValue(ctx, filterIntentKey{}, true)
}

func IsFilterIntent(ctx context.Context) bool {
	v, ok := ctx.Value(filterIntentKey{}).(bool)
	return ok && v
}
