// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package ottlfunctions

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/pdata/pcommon"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/vjeantet/grok"
)

type GrokParseArguments[K any] struct {
	Target  ottl.StringGetter[K]
	Pattern string
}

func NewGrokParseFactory[K any]() ottl.Factory[K] {
	return ottl.NewFactory("GrokParse", &GrokParseArguments[K]{}, createGrokParseFunction[K])
}

func createGrokParseFunction[K any](_ ottl.FunctionContext, oArgs ottl.Arguments) (ottl.ExprFunc[K], error) {
	args, ok := oArgs.(*GrokParseArguments[K])

	if !ok {
		return nil, fmt.Errorf("GrokParseFactory args must be of type *GrokParseArguments[K]")
	}

	return grokParse(args.Target, args.Pattern)
}

func grokParse[K any](target ottl.StringGetter[K], pattern string) (ottl.ExprFunc[K], error) {
	g, err := grok.NewWithConfig(&grok.Config{NamedCapturesOnly: true})
	if err != nil {
		return nil, fmt.Errorf("could not create grok object: %w", err)
	}

	// Ensure supplied pattern is valid during construction
	_, err = g.ParseTyped(pattern, "")
	if err != nil {
		return nil, fmt.Errorf("the pattern supplied to GrokParse is not a valid pattern: %w", err)
	}

	return func(ctx context.Context, tCtx K) (interface{}, error) {
		val, err := target.Get(ctx, tCtx)
		if err != nil {
			return nil, err
		}

		parsedValues, err := g.ParseTyped(pattern, val)
		if err != nil {
			return nil, fmt.Errorf("could not grok parse '%s' with pattern %s: %w", val, pattern, err)
		}

		result := pcommon.NewMap()
		err = result.FromRaw(parsedValues)
		if err != nil {
			return nil, fmt.Errorf("could not create pcommon.Map from grok parsing result map: %w", err)
		}

		return result, err
	}, nil
}
