package ottlfunctions

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
)

type HexToIntArguments[K any] struct {
	Target ottl.StandardStringGetter[K]
}

func NewHexToIntFactory[K any]() ottl.Factory[K] {
	return ottl.NewFactory("HexToInt", &HexToIntArguments[K]{}, createHexToIntFunction[K])
}

func createHexToIntFunction[K any](_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[K], error) {
	args, ok := oArgs.(*HexToIntArguments[K])

	if !ok {
		return nil, fmt.Errorf("HexToIntFactory args must be of type *HexToIntArguments[K]")
	}

	return hexToInt(args.Target)
}

func hexToInt[K any](target ottl.StandardStringGetter[K]) (ottl.ExprFunc[K], error) {

	return func(ctx context.Context, tCtx K) (interface{}, error) {
		val, err := target.Get(ctx, tCtx)
		if err != nil {
			return nil, err
		}

		normalized := strings.TrimPrefix(strings.ToLower(val), "0x")
		result, err := strconv.ParseInt(normalized, 16, 64)
		if err != nil {
			return nil, fmt.Errorf("could not parse hex value %s: %w", val, err)
		}
		return result, nil
	}, nil
}
