package querybuilder

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AggreFuncMap = map[valuer.String]AggrFunc{}
)

type AggrFunc struct {
	Name           valuer.String
	FuncName       string
	Aliases        []valuer.String
	RequireArgs    bool
	Numeric        bool
	FuncCombinator bool
	Rate           bool
	MinArgs        int
	MaxArgs        int
}

var (
	AggrFuncCount = AggrFunc{
		Name:        valuer.NewString("count"),
		FuncName:    "count",
		RequireArgs: false, MinArgs: 0, MaxArgs: 1,
	}
	AggrFuncCountIf = AggrFunc{
		Name:        valuer.NewString("countif"),
		FuncName:    "countIf",
		Aliases:     []valuer.String{valuer.NewString("count_if")},
		RequireArgs: true, FuncCombinator: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncCountDistinct = AggrFunc{
		Name:        valuer.NewString("countdistinct"),
		FuncName:    "countDistinct",
		Aliases:     []valuer.String{valuer.NewString("count_distinct")},
		RequireArgs: true, MinArgs: 1, MaxArgs: 10,
	}
	AggrFuncCountDistinctIf = AggrFunc{
		Name:        valuer.NewString("countdistinctif"),
		FuncName:    "countDistinctIf",
		Aliases:     []valuer.String{valuer.NewString("count_distinct_if")},
		RequireArgs: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncSum = AggrFunc{
		Name:        valuer.NewString("sum"),
		FuncName:    "sum",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncSumIf = AggrFunc{
		Name:        valuer.NewString("sumif"),
		FuncName:    "sumIf",
		Aliases:     []valuer.String{valuer.NewString("sum_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncAvg = AggrFunc{
		Name:        valuer.NewString("avg"),
		FuncName:    "avg",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncAvgIf = AggrFunc{
		Name:        valuer.NewString("avgif"),
		FuncName:    "avgIf",
		Aliases:     []valuer.String{valuer.NewString("avg_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncMin = AggrFunc{
		Name:        valuer.NewString("min"),
		FuncName:    "min",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncMinIf = AggrFunc{
		Name:        valuer.NewString("minif"),
		FuncName:    "minIf",
		Aliases:     []valuer.String{valuer.NewString("min_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncMax = AggrFunc{
		Name:        valuer.NewString("max"),
		FuncName:    "max",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncMaxIf = AggrFunc{
		Name:        valuer.NewString("maxif"),
		FuncName:    "maxIf",
		Aliases:     []valuer.String{valuer.NewString("max_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP05 = AggrFunc{
		Name:        valuer.NewString("p05"),
		FuncName:    "quantile(0.05)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP05IF = AggrFunc{
		Name:        valuer.NewString("p05if"),
		FuncName:    "quantileIf(0.05)",
		Aliases:     []valuer.String{valuer.NewString("p05_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP10 = AggrFunc{
		Name:        valuer.NewString("p10"),
		FuncName:    "quantile(0.10)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP10IF = AggrFunc{
		Name:        valuer.NewString("p10if"),
		FuncName:    "quantileIf(0.10)",
		Aliases:     []valuer.String{valuer.NewString("p10_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP20 = AggrFunc{
		Name:        valuer.NewString("p20"),
		FuncName:    "quantile(0.20)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP20IF = AggrFunc{
		Name:        valuer.NewString("p20if"),
		FuncName:    "quantileIf(0.20)",
		Aliases:     []valuer.String{valuer.NewString("p20_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP25 = AggrFunc{
		Name:        valuer.NewString("p25"),
		FuncName:    "quantile(0.25)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP25IF = AggrFunc{
		Name:        valuer.NewString("p25if"),
		FuncName:    "quantileIf(0.25)",
		Aliases:     []valuer.String{valuer.NewString("p25_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP50 = AggrFunc{
		Name:        valuer.NewString("p50"),
		FuncName:    "quantile(0.50)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP50IF = AggrFunc{
		Name:        valuer.NewString("p50if"),
		FuncName:    "quantileIf(0.50)",
		Aliases:     []valuer.String{valuer.NewString("p50_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP75 = AggrFunc{
		Name:        valuer.NewString("p75"),
		FuncName:    "quantile(0.75)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP75IF = AggrFunc{
		Name:        valuer.NewString("p75if"),
		FuncName:    "quantileIf(0.75)",
		Aliases:     []valuer.String{valuer.NewString("p75_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP90 = AggrFunc{
		Name:        valuer.NewString("p90"),
		FuncName:    "quantile(0.90)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP90IF = AggrFunc{
		Name:        valuer.NewString("p90if"),
		FuncName:    "quantileIf(0.90)",
		Aliases:     []valuer.String{valuer.NewString("p90_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP95 = AggrFunc{
		Name:        valuer.NewString("p95"),
		FuncName:    "quantile(0.95)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP95IF = AggrFunc{
		Name:        valuer.NewString("p95if"),
		FuncName:    "quantileIf(0.95)",
		Aliases:     []valuer.String{valuer.NewString("p95_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP99 = AggrFunc{
		Name:        valuer.NewString("p99"),
		FuncName:    "quantile(0.99)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP99IF = AggrFunc{
		Name:        valuer.NewString("p99if"),
		FuncName:    "quantileIf(0.99)",
		Aliases:     []valuer.String{valuer.NewString("p99_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncP999 = AggrFunc{
		Name:        valuer.NewString("p999"),
		FuncName:    "quantile(0.999)",
		RequireArgs: true, Numeric: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncP999IF = AggrFunc{
		Name:        valuer.NewString("p999if"),
		FuncName:    "quantileIf(0.999)",
		Aliases:     []valuer.String{valuer.NewString("p999_if")},
		RequireArgs: true, Numeric: true, FuncCombinator: true, MinArgs: 2, MaxArgs: 2,
	}
	AggrFuncRate = AggrFunc{
		Name:        valuer.NewString("rate"),
		FuncName:    "count",
		RequireArgs: true, Rate: true, MinArgs: 0, MaxArgs: 1,
	}
	AggrFuncRateIf = AggrFunc{
		Name:        valuer.NewString("rateif"),
		FuncName:    "count",
		Aliases:     []valuer.String{valuer.NewString("rate_if")},
		RequireArgs: true, Rate: true, FuncCombinator: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncRateSum = AggrFunc{
		Name:        valuer.NewString("rate_sum"),
		FuncName:    "sum",
		RequireArgs: true, Numeric: true, Rate: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncRateAvg = AggrFunc{
		Name:        valuer.NewString("rate_avg"),
		FuncName:    "avg",
		RequireArgs: true, Numeric: true, Rate: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncRateMin = AggrFunc{
		Name:        valuer.NewString("rate_min"),
		FuncName:    "min",
		RequireArgs: true, Numeric: true, Rate: true, MinArgs: 1, MaxArgs: 1,
	}
	AggrFuncRateMax = AggrFunc{
		Name:        valuer.NewString("rate_max"),
		FuncName:    "max",
		RequireArgs: true, Numeric: true, Rate: true, MinArgs: 1, MaxArgs: 1,
	}
)

func init() {
	var aggFuncs = []AggrFunc{
		AggrFuncCount,
		AggrFuncCountIf,
		AggrFuncCountDistinct,
		AggrFuncCountDistinctIf,
		AggrFuncSum,
		AggrFuncSumIf,
		AggrFuncAvg,
		AggrFuncAvgIf,
		AggrFuncMin,
		AggrFuncMinIf,
		AggrFuncMax,
		AggrFuncMaxIf,
		AggrFuncP05,
		AggrFuncP05IF,
		AggrFuncP10,
		AggrFuncP10IF,
		AggrFuncP20,
		AggrFuncP20IF,
		AggrFuncP25,
		AggrFuncP25IF,
		AggrFuncP50,
		AggrFuncP50IF,
		AggrFuncP75,
		AggrFuncP75IF,
		AggrFuncP90,
		AggrFuncP90IF,
		AggrFuncP95,
		AggrFuncP95IF,
		AggrFuncP99,
		AggrFuncP99IF,
		AggrFuncP999,
		AggrFuncP999IF,
		AggrFuncRate,
		AggrFuncRateIf,
		AggrFuncRateSum,
		AggrFuncRateAvg,
		AggrFuncRateMin,
		AggrFuncRateMax,
	}

	for _, aggFunc := range aggFuncs {
		AggreFuncMap[aggFunc.Name] = aggFunc
		for _, alias := range aggFunc.Aliases {
			AggreFuncMap[alias] = aggFunc
		}
	}
}
