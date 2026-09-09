package implspanmapper

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testUser = "user@signoz.io"

func newTestSQLStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()

	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider:   "sqlite",
		Connection: sqlstore.ConnectionConfig{MaxOpenConns: 10},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	for _, model := range []any{
		(*spantypes.StorableSpanMapperGroup)(nil),
		(*spantypes.StorableSpanMapper)(nil),
	} {
		_, err := store.BunDB().NewCreateTable().Model(model).IfNotExists().Exec(context.Background())
		require.NoError(t, err)
	}

	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_span_mapper_group_org_name ON span_mapper_group (org_id, name)`)
	require.NoError(t, err)
	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_span_mapper_group_name ON span_mapper (group_id, name)`)
	require.NoError(t, err)

	return store
}

func newTestModule(t *testing.T, sqlStore sqlstore.SQLStore, definitions ...spantypes.SpanMapperGroupDefinition) *module {
	t.Helper()

	registry, err := spantypes.NewSpanMapperGroupRegistry(definitions)
	require.NoError(t, err)

	return NewModule(NewStore(sqlStore), nil, registry, factorytest.NewSettings()).(*module)
}

func newTestDefinition(t *testing.T, version int, body string) spantypes.SpanMapperGroupDefinition {
	t.Helper()

	definition, err := spantypes.NewSpanMapperGroupDefinition([]byte(`{"version": ` + itoa(version) + `, "definition": ` + body + `}`))
	require.NoError(t, err)

	return definition
}

func itoa(i int) string {
	return string(rune('0' + i))
}

// llmV1 ships two mappers; llmV2 renames a source, adds a mapper and drops one.
const llmV1 = `{
	"name": "llm",
	"condition": {"attributes": [{"value": "model"}], "resource": []},
	"enabled": true,
	"mappers": [
		{"name": "gen_ai.request.model", "fieldContext": "attribute", "config": {"sources": [
			{"key": "llm.model_name", "context": "attribute", "operation": "copy", "priority": 20},
			{"key": "ai.model.id", "context": "attribute", "operation": "copy", "priority": 10}
		]}},
		{"name": "gen_ai.input.messages", "fieldContext": "attribute", "config": {"sources": [
			{"key": "gen_ai.prompt", "context": "attribute", "operation": "copy", "priority": 10}
		]}}
	]
}`

const llmV2 = `{
	"name": "llm",
	"condition": {"attributes": [{"value": "model"}, {"value": "llm."}], "resource": []},
	"enabled": true,
	"mappers": [
		{"name": "gen_ai.request.model", "fieldContext": "attribute", "config": {"sources": [
			{"key": "llm.model_name", "context": "attribute", "operation": "copy", "priority": 20},
			{"key": "langfuse.observation.model.name", "context": "attribute", "operation": "copy", "priority": 10}
		]}},
		{"name": "gen_ai.provider.name", "fieldContext": "attribute", "config": {"sources": [
			{"key": "llm.vendor", "context": "attribute", "operation": "copy", "priority": 10}
		]}}
	]
}`

func findMapper(t *testing.T, mappers []*spantypes.SpanMapper, name string) *spantypes.SpanMapper {
	t.Helper()
	for _, m := range mappers {
		if m.Name == name {
			return m
		}
	}
	require.Failf(t, "mapper not found", "no mapper named %q", name)
	return nil
}

func findSource(t *testing.T, sources []spantypes.SpanMapperSource, key string, origin spantypes.SpanMapperOrigin) spantypes.SpanMapperSource {
	t.Helper()
	for _, s := range sources {
		if s.Key == key && s.Origin == origin {
			return s
		}
	}
	require.Failf(t, "source not found", "no %s source with key %q", origin.StringValue(), key)
	return spantypes.SpanMapperSource{}
}

func TestReconcileUpgradeKeepsTogglesAndUserItems(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.GenerateUUID()
	sqlStore := newTestSQLStore(t)
	v1 := newTestModule(t, sqlStore, newTestDefinition(t, 1, llmV1))
	require.NoError(t, v1.ReconcileSystemGroups(ctx, orgID))

	group, err := v1.store.GetGroupByName(ctx, orgID, "llm")
	require.NoError(t, err)
	mappers, err := v1.ListMappers(ctx, orgID, group.ID)
	require.NoError(t, err)

	// Switch the shipped substring off and add a user one.
	off := false
	require.NoError(t, v1.UpdateGroup(ctx, orgID, group.ID, nil, &spantypes.SpanMapperGroupCondition{
		Attributes: []spantypes.SpanMapperGroupConditionKey{
			{Value: "model", Enabled: false, Origin: spantypes.SpanMapperOriginSystem},
			{Value: "gen_ai.request.model", Enabled: true, Origin: spantypes.SpanMapperOriginUser},
		},
		Resource: []spantypes.SpanMapperGroupConditionKey{},
	}, &off, testUser))

	// Switch a shipped source off, add a user override, and switch the mapper off.
	model := findMapper(t, mappers, "gen_ai.request.model")
	require.NoError(t, v1.UpdateMapper(ctx, orgID, group.ID, model.ID, spantypes.FieldContext{}, &spantypes.SpanMapperConfig{Sources: []spantypes.SpanMapperSource{
		{Key: "llm.model_name", Context: spantypes.FieldContextSpanAttribute, Operation: spantypes.SpanMapperOperationCopy, Priority: 20, Enabled: false, Origin: spantypes.SpanMapperOriginSystem},
		{Key: "llm.model_name", Context: spantypes.FieldContextSpanAttribute, Operation: spantypes.SpanMapperOperationMove, Priority: 1, Enabled: true, Origin: spantypes.SpanMapperOriginUser},
	}}, &off, testUser))

	// Add a user source to the mapper v2 stops shipping, so it must survive.
	messages := findMapper(t, mappers, "gen_ai.input.messages")
	require.NoError(t, v1.UpdateMapper(ctx, orgID, group.ID, messages.ID, spantypes.FieldContext{}, &spantypes.SpanMapperConfig{Sources: []spantypes.SpanMapperSource{
		{Key: "input.value", Context: spantypes.FieldContextSpanAttribute, Operation: spantypes.SpanMapperOperationCopy, Priority: 1, Enabled: true},
	}}, nil, testUser))

	// A user mapper in the shipped group.
	require.NoError(t, v1.CreateMapper(ctx, orgID, group.ID, spantypes.NewSpanMapper(group.ID, testUser, &spantypes.PostableSpanMapper{
		Name: "gen_ai.custom", FieldContext: spantypes.FieldContextSpanAttribute, Enabled: true,
		Config: spantypes.SpanMapperConfig{Sources: []spantypes.SpanMapperSource{{Key: "custom", Context: spantypes.FieldContextSpanAttribute, Operation: spantypes.SpanMapperOperationCopy, Priority: 1, Enabled: true}}},
	})))

	v2 := newTestModule(t, sqlStore, newTestDefinition(t, 2, llmV2))
	require.NoError(t, v2.ReconcileSystemGroups(ctx, orgID))

	upgraded, err := v2.GetGroup(ctx, orgID, group.ID)
	require.NoError(t, err)
	assert.Equal(t, 2, upgraded.Version)
	assert.False(t, upgraded.Enabled)
	assert.Equal(t, spantypes.ProvisionerIdentity, upgraded.UpdatedBy)
	assert.Equal(t, []spantypes.SpanMapperGroupConditionKey{
		{Value: "model", Enabled: false, Origin: spantypes.SpanMapperOriginSystem},
		{Value: "llm.", Enabled: true, Origin: spantypes.SpanMapperOriginSystem},
		{Value: "gen_ai.request.model", Enabled: true, Origin: spantypes.SpanMapperOriginUser},
	}, upgraded.Condition.Attributes)

	mappers, err = v2.ListMappers(ctx, orgID, group.ID)
	require.NoError(t, err)
	require.Len(t, mappers, 4)

	model = findMapper(t, mappers, "gen_ai.request.model")
	assert.False(t, model.Enabled)
	assert.Equal(t, spantypes.SpanMapperOriginSystem, model.Origin)
	assert.False(t, findSource(t, model.Config.Sources, "llm.model_name", spantypes.SpanMapperOriginSystem).Enabled)
	assert.True(t, findSource(t, model.Config.Sources, "langfuse.observation.model.name", spantypes.SpanMapperOriginSystem).Enabled)
	assert.Equal(t, spantypes.SpanMapperOperationMove, findSource(t, model.Config.Sources, "llm.model_name", spantypes.SpanMapperOriginUser).Operation)
	assert.Len(t, model.Config.Sources, 3)

	messages = findMapper(t, mappers, "gen_ai.input.messages")
	assert.Equal(t, spantypes.SpanMapperOriginUser, messages.Origin)
	require.Len(t, messages.Config.Sources, 1)
	assert.Equal(t, "input.value", messages.Config.Sources[0].Key)

	assert.Equal(t, spantypes.SpanMapperOriginSystem, findMapper(t, mappers, "gen_ai.provider.name").Origin)
	assert.Equal(t, spantypes.SpanMapperOriginUser, findMapper(t, mappers, "gen_ai.custom").Origin)

	// Shipping v1 again drops provider.name outright (no user sources) and
	// re-adopts the surviving user mapper input.messages as a shipped one.
	v3 := newTestModule(t, sqlStore, newTestDefinition(t, 3, llmV1))
	require.NoError(t, v3.ReconcileSystemGroups(ctx, orgID))
	mappers, err = v3.ListMappers(ctx, orgID, group.ID)
	require.NoError(t, err)
	require.Len(t, mappers, 3)
	for _, m := range mappers {
		assert.NotEqual(t, "gen_ai.provider.name", m.Name)
	}
	messages = findMapper(t, mappers, "gen_ai.input.messages")
	assert.Equal(t, spantypes.SpanMapperOriginSystem, messages.Origin)
	assert.Len(t, messages.Config.Sources, 2)
}

func TestReconcileDoesNotDowngrade(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.GenerateUUID()
	sqlStore := newTestSQLStore(t)

	require.NoError(t, newTestModule(t, sqlStore, newTestDefinition(t, 2, llmV2)).ReconcileSystemGroups(ctx, orgID))
	older := newTestModule(t, sqlStore, newTestDefinition(t, 1, llmV1))
	require.NoError(t, older.ReconcileSystemGroups(ctx, orgID))

	group, err := older.store.GetGroupByName(ctx, orgID, "llm")
	require.NoError(t, err)
	assert.Equal(t, 2, group.Version)
	mappers, err := older.ListMappers(ctx, orgID, group.ID)
	require.NoError(t, err)
	findMapper(t, mappers, "gen_ai.provider.name")
}
