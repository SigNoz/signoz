package dashboardtypes

// TestDashboardDataMatchesPerses asserts that DashboardData
// and every nested SigNoz-owned type cover the JSON field set of their Perses
// counterpart.

import (
	"reflect"
	"sort"
	"strings"
	"testing"

	v1 "github.com/perses/perses/pkg/model/api/v1"
	"github.com/perses/perses/pkg/model/api/v1/dashboard"

	"github.com/stretchr/testify/assert"
)

func TestDashboardDataMatchesPerses(t *testing.T) {
	cases := []struct {
		name   string
		ours   reflect.Type
		perses reflect.Type
	}{
		{"DashboardSpec", typeOf[DashboardData](), typeOf[v1.DashboardSpec]()},
		{"Panel", typeOf[Panel](), typeOf[v1.Panel]()},
		{"PanelSpec", typeOf[PanelSpec](), typeOf[v1.PanelSpec]()},
		{"Query", typeOf[Query](), typeOf[v1.Query]()},
		{"QuerySpec", typeOf[QuerySpec](), typeOf[v1.QuerySpec]()},
		{"DatasourceSpec", typeOf[DatasourceSpec](), typeOf[v1.DatasourceSpec]()},
		{"Variable", typeOf[Variable](), typeOf[dashboard.Variable]()},
		{"ListVariableSpec", typeOf[ListVariableSpec](), typeOf[dashboard.ListVariableSpec]()},
		{"Layout", typeOf[Layout](), typeOf[dashboard.Layout]()},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			missing, extra := drift(c.ours, c.perses)

			assert.Empty(t, missing,
				"DashboardData (%s) is missing json fields present on Perses %s — upstream likely added or renamed a field",
				c.ours.Name(), c.perses.Name())
			assert.Empty(t, extra,
				"DashboardData (%s) has json fields absent on Perses %s — upstream likely removed a field or we added one without the counterpart",
				c.ours.Name(), c.perses.Name())
		})
	}
}

func TestDriftDetectionMechanics(t *testing.T) {
	t.Run("upstream added a field", func(t *testing.T) {
		type ours struct {
			Name string `json:"name"`
		}
		type perses struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		missing, extra := drift(typeOf[ours](), typeOf[perses]())
		assert.Equal(t, []string{"description"}, missing, "missing fires: upstream has a field we don't")
		assert.Empty(t, extra)
	})

	t.Run("upstream removed a field", func(t *testing.T) {
		type ours struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		type perses struct {
			Name string `json:"name"`
		}
		missing, extra := drift(typeOf[ours](), typeOf[perses]())
		assert.Empty(t, missing)
		assert.Equal(t, []string{"description"}, extra, "extra fires: we kept a field upstream removed")
	})

	t.Run("upstream renamed a field", func(t *testing.T) {
		type ours struct {
			Name string `json:"name"`
		}
		type perses struct {
			Name string `json:"title"`
		}
		missing, extra := drift(typeOf[ours](), typeOf[perses]())
		assert.Equal(t, []string{"title"}, missing, "missing fires for the new name")
		assert.Equal(t, []string{"name"}, extra, "extra fires for the old name — both fire on a rename")
	})

	t.Run("we added a field upstream does not have", func(t *testing.T) {
		type ours struct {
			Name     string `json:"name"`
			Internal string `json:"internal"`
		}
		type perses struct {
			Name string `json:"name"`
		}
		missing, extra := drift(typeOf[ours](), typeOf[perses]())
		assert.Empty(t, missing)
		assert.Equal(t, []string{"internal"}, extra, "extra fires: we added a field with no upstream counterpart")
	})

	t.Run("embedded struct flattens — drift inside the embed is caught", func(t *testing.T) {
		type embedded struct {
			Display string `json:"display"`
			NewBit  string `json:"newBit"` // upstream added this inside the embed
		}
		type ours struct {
			Display string `json:"display"`
			Name    string `json:"name"`
		}
		type perses struct {
			embedded `json:",inline"`
			Name     string `json:"name"`
		}
		missing, extra := drift(typeOf[ours](), typeOf[perses]())
		assert.Equal(t, []string{"newBit"}, missing, "field added inside an inlined embed surfaces at the parent level")
		assert.Empty(t, extra)
	})
}

func drift(ours, perses reflect.Type) (missing, extra []string) {
	o, p := jsonFields(ours), jsonFields(perses)
	return sortedDiff(p, o), sortedDiff(o, p)
}

// jsonFields returns the set of json tag names for a struct, flattening
// anonymous embedded fields (matching encoding/json behavior).
func jsonFields(t reflect.Type) map[string]struct{} {
	out := map[string]struct{}{}
	if t.Kind() != reflect.Struct {
		return out
	}
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		// Skip unexported fields (e.g., dashboard.ListVariableSpec has an
		// unexported `variableSpec` interface tag).
		if !f.IsExported() && !f.Anonymous {
			continue
		}
		tag := f.Tag.Get("json")
		name := strings.Split(tag, ",")[0]
		// Anonymous embed with empty json name (no tag, or `json:",inline"` /
		// `json:",omitempty"`-style options-only tag) is flattened by encoding/json.
		if f.Anonymous && name == "" {
			for k := range jsonFields(f.Type) {
				out[k] = struct{}{}
			}
			continue
		}
		if tag == "-" || name == "" {
			continue
		}
		out[name] = struct{}{}
	}
	return out
}

// sortedDiff returns keys in a but not in b, sorted.
func sortedDiff(a, b map[string]struct{}) []string {
	var diff []string
	for k := range a {
		if _, ok := b[k]; !ok {
			diff = append(diff, k)
		}
	}
	sort.Strings(diff)
	return diff
}

func typeOf[T any]() reflect.Type { return reflect.TypeOf((*T)(nil)).Elem() }
