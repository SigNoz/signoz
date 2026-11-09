package telemetrystore

import "context"

type profileKey struct{}

// NewContextWithProfile runs the queries of ctx with the named ClickHouse settings profile. The profile is
// defined in ClickHouse, so its constraints also bind a SETTINGS clause in the query.
func NewContextWithProfile(ctx context.Context, profile string) context.Context {
	return context.WithValue(ctx, profileKey{}, profile)
}

// ProfileFromContext returns the profile set with NewContextWithProfile, or "".
func ProfileFromContext(ctx context.Context) string {
	profile, _ := ctx.Value(profileKey{}).(string)
	return profile
}
