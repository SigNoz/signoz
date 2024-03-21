package ottlfunctions

import (
	"context"
	"fmt"

	"github.com/antonmedv/expr"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog"
)

type ExprArguments struct {
	Expression string
}

func NewExprFactory() ottl.Factory[ottllog.TransformContext] {
	return ottl.NewFactory("EXPR", &ExprArguments{}, createExprFunction)
}

func createExprFunction(_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[ottllog.TransformContext], error) {
	args, ok := oArgs.(*ExprArguments)

	if !ok {
		return nil, fmt.Errorf("ExprFactory args must be of type *ExprArguments[K]")
	}

	return exprFunc(args.Expression)
}

func exprFunc(expression string) (ottl.ExprFunc[ottllog.TransformContext], error) {
	program, err := expr.Compile(expression)
	if err != nil {
		return nil, fmt.Errorf("could not compile expression %s: %w", expression, err)
	}

	return func(ctx context.Context, tCtx ottllog.TransformContext) (interface{}, error) {
		// Need to match https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/entry.md
		// for parity
		exprEnv := map[string]interface{}{
			"attributes":    tCtx.GetLogRecord().Attributes().AsRaw(),
			"resource":      tCtx.GetResource().Attributes().AsRaw(),
			"body":          tCtx.GetLogRecord().Body().AsRaw(),
			"timestamp":     tCtx.GetLogRecord().Timestamp().AsTime(),
			"severity_text": tCtx.GetLogRecord().SeverityText(),
			"severity":      int(tCtx.GetLogRecord().SeverityNumber()),
		}
		output, err := expr.Run(program, exprEnv)
		if err != nil {
			return nil, fmt.Errorf("could not evaluate expression %s: %w", expression, err)
		}

		// ottl only supports int64, so convert the output as needed.
		// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/a4853ed/pkg/ottl/contexts/internal/value.go#L17
		if v, ok := output.(int); ok {
			output = int64(v)

		} else if v, isSlice := output.([]interface{}); isSlice && len(v) > 0 {
			// if slice of ints, convert to slice of int64
			if _, isInt := v[0].(int); isInt {
				int64Slice := []int64{}
				for _, iv := range v {
					int64Slice = append(int64Slice, int64(iv.(int)))
				}
				output = int64Slice
			}
		}

		return output, nil
	}, nil
}
