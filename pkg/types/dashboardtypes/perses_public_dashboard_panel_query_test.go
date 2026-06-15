package dashboardtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboardV2GetPanelQuery(t *testing.T) {
	t.Run("returns error when the panel does not exist", func(t *testing.T) {
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": {
						Spec: PanelSpec{
							Plugin: PanelPlugin{Kind: PanelKindTimeSeries},
							Queries: []Query{
								{
									Kind: qb.RequestTypeTimeSeries,
									Spec: QuerySpec{
										Plugin: QueryPlugin{
											Kind: QueryKindBuilder,
											Spec: &BuilderQuerySpec{Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A"}},
										},
									},
								},
							},
						},
					},
				},
			},
		}

		_, err := dashboard.GetPanelQuery(1, 2, "wrongPanelKey")
		require.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
	})

	t.Run("returns error when the panel is nil", func(t *testing.T) {
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": nil,
				},
			},
		}

		_, err := dashboard.GetPanelQuery(1, 2, "panel-1")
		require.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
	})

	t.Run("returns error unless the panel has exactly one query", func(t *testing.T) {
		cases := []struct {
			description string
			queries     []Query
		}{
			{description: "zero queries", queries: nil},
			{description: "two queries", queries: []Query{{}, {}}},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				dashboard := &DashboardV2{
					Spec: DashboardSpec{
						Panels: map[string]*Panel{
							"panel-1": {
								Spec: PanelSpec{Queries: tc.queries},
							},
						},
					},
				}

				_, err := dashboard.GetPanelQuery(1, 2, "panel-1")
				require.Error(t, err)
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			})
		}
	})

	t.Run("builds a single-envelope request for a builder query", func(t *testing.T) {
		builder := qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A"}
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": {
						Spec: PanelSpec{
							Plugin: PanelPlugin{Kind: PanelKindTimeSeries},
							Queries: []Query{
								{
									Kind: qb.RequestTypeTimeSeries,
									Spec: QuerySpec{
										Plugin: QueryPlugin{
											Kind: QueryKindBuilder,
											Spec: &BuilderQuerySpec{Spec: builder},
										},
									},
								},
							},
						},
					},
				},
			},
		}

		req, err := dashboard.GetPanelQuery(100, 200, "panel-1")
		require.NoError(t, err)

		assert.Equal(t, "v1", req.SchemaVersion)
		assert.Equal(t, uint64(100), req.Start)
		assert.Equal(t, uint64(200), req.End)
		assert.Equal(t, qb.RequestTypeTimeSeries, req.RequestType)
		require.Len(t, req.CompositeQuery.Queries, 1)
		assert.Equal(t, qb.QueryTypeBuilder, req.CompositeQuery.Queries[0].Type)
		assert.Equal(t, builder, req.CompositeQuery.Queries[0].Spec)
		require.NotNil(t, req.FormatOptions)
		assert.False(t, req.FormatOptions.FormatTableResultForUI)
	})

	t.Run("uses a composite query as-is", func(t *testing.T) {
		composite := &qb.CompositeQuery{Queries: []qb.QueryEnvelope{
			{Type: qb.QueryTypeBuilder, Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A"}},
			{Type: qb.QueryTypePromQL, Spec: qb.PromQuery{Name: "B"}},
		}}
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": {
						Spec: PanelSpec{
							Plugin: PanelPlugin{Kind: PanelKindTimeSeries},
							Queries: []Query{
								{
									Kind: qb.RequestTypeTimeSeries,
									Spec: QuerySpec{
										Plugin: QueryPlugin{
											Kind: QueryKindComposite,
											Spec: composite,
										},
									},
								},
							},
						},
					},
				},
			},
		}

		req, err := dashboard.GetPanelQuery(1, 2, "panel-1")
		require.NoError(t, err)
		assert.Equal(t, composite.Queries, req.CompositeQuery.Queries)
	})

	t.Run("wraps a leaf query in a single typed envelope", func(t *testing.T) {
		cases := []struct {
			description  string
			plugin       QueryPlugin
			expectedType qb.QueryType
		}{
			{
				description:  "promql",
				plugin:       QueryPlugin{Kind: QueryKindPromQL, Spec: &qb.PromQuery{Name: "A", Query: "up"}},
				expectedType: qb.QueryTypePromQL,
			},
			{
				description:  "clickhouse",
				plugin:       QueryPlugin{Kind: QueryKindClickHouseSQL, Spec: &qb.ClickHouseQuery{Name: "A", Query: "SELECT 1"}},
				expectedType: qb.QueryTypeClickHouseSQL,
			},
			{
				description:  "formula",
				plugin:       QueryPlugin{Kind: QueryKindFormula, Spec: &qb.QueryBuilderFormula{Name: "F1", Expression: "A / B"}},
				expectedType: qb.QueryTypeFormula,
			},
			{
				description:  "trace operator",
				plugin:       QueryPlugin{Kind: QueryKindTraceOperator, Spec: &qb.QueryBuilderTraceOperator{Name: "T1", Expression: "A => B"}},
				expectedType: qb.QueryTypeTraceOperator,
			},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				dashboard := &DashboardV2{
					Spec: DashboardSpec{
						Panels: map[string]*Panel{
							"panel-1": {
								Spec: PanelSpec{
									Plugin: PanelPlugin{Kind: PanelKindTimeSeries},
									Queries: []Query{
										{
											Kind: qb.RequestTypeTimeSeries,
											Spec: QuerySpec{Plugin: tc.plugin},
										},
									},
								},
							},
						},
					},
				}

				req, err := dashboard.GetPanelQuery(1, 2, "panel-1")
				require.NoError(t, err)
				require.Len(t, req.CompositeQuery.Queries, 1)
				assert.Equal(t, tc.expectedType, req.CompositeQuery.Queries[0].Type)
			})
		}
	})

	t.Run("sets FormatTableResultForUI only for table panels", func(t *testing.T) {
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": {
						Spec: PanelSpec{
							Plugin: PanelPlugin{Kind: PanelKindTable},
							Queries: []Query{
								{
									Kind: qb.RequestTypeScalar,
									Spec: QuerySpec{
										Plugin: QueryPlugin{
											Kind: QueryKindBuilder,
											Spec: &BuilderQuerySpec{Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A"}},
										},
									},
								},
							},
						},
					},
				},
			},
		}

		req, err := dashboard.GetPanelQuery(1, 2, "panel-1")
		require.NoError(t, err)
		require.NotNil(t, req.FormatOptions)
		assert.True(t, req.FormatOptions.FormatTableResultForUI)
	})

	t.Run("sets FillGaps from the panel visualization", func(t *testing.T) {
		cases := []struct {
			description      string
			panelPlugin      PanelPlugin
			expectedFillGaps bool
		}{
			{
				description:      "timeseries with fillSpans enabled",
				panelPlugin:      PanelPlugin{Kind: PanelKindTimeSeries, Spec: &TimeSeriesPanelSpec{Visualization: TimeSeriesVisualization{FillSpans: true}}},
				expectedFillGaps: true,
			},
			{
				description:      "timeseries with fillSpans disabled",
				panelPlugin:      PanelPlugin{Kind: PanelKindTimeSeries, Spec: &TimeSeriesPanelSpec{Visualization: TimeSeriesVisualization{FillSpans: false}}},
				expectedFillGaps: false,
			},
			{
				description:      "bar chart with fillSpans enabled",
				panelPlugin:      PanelPlugin{Kind: PanelKindBarChart, Spec: &BarChartPanelSpec{Visualization: BarChartVisualization{FillSpans: true}}},
				expectedFillGaps: true,
			},
			{
				description:      "table panel has no fillSpans",
				panelPlugin:      PanelPlugin{Kind: PanelKindTable, Spec: &TablePanelSpec{}},
				expectedFillGaps: false,
			},
		}

		for _, tc := range cases {
			t.Run(tc.description, func(t *testing.T) {
				dashboard := &DashboardV2{
					Spec: DashboardSpec{
						Panels: map[string]*Panel{
							"panel-1": {
								Spec: PanelSpec{
									Plugin: tc.panelPlugin,
									Queries: []Query{
										{
											Kind: qb.RequestTypeTimeSeries,
											Spec: QuerySpec{
												Plugin: QueryPlugin{
													Kind: QueryKindBuilder,
													Spec: &BuilderQuerySpec{Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A"}},
												},
											},
										},
									},
								},
							},
						},
					},
				}

				req, err := dashboard.GetPanelQuery(1, 2, "panel-1")
				require.NoError(t, err)
				require.NotNil(t, req.FormatOptions)
				assert.Equal(t, tc.expectedFillGaps, req.FormatOptions.FillGaps)
			})
		}
	})

	t.Run("returns error for an unsupported plugin spec", func(t *testing.T) {
		dashboard := &DashboardV2{
			Spec: DashboardSpec{
				Panels: map[string]*Panel{
					"panel-1": {
						Spec: PanelSpec{
							Plugin: PanelPlugin{Kind: PanelKindTimeSeries},
							Queries: []Query{
								{
									Kind: qb.RequestTypeTimeSeries,
									Spec: QuerySpec{
										Plugin: QueryPlugin{
											Kind: QueryKindBuilder,
											Spec: "not-a-query",
										},
									},
								},
							},
						},
					},
				},
			},
		}

		_, err := dashboard.GetPanelQuery(1, 2, "panel-1")
		require.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
	})
}
