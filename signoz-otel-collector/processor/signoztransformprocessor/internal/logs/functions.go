// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package logs // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/logs"

import (
	"fmt"

	signozFuncs "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/ottlfunctions"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs"
)

func SignozLogFunctions() map[string]ottl.Factory[ottllog.TransformContext] {
	factoryMap := map[string]ottl.Factory[ottllog.TransformContext]{}
	for _, f := range []ottl.Factory[ottllog.TransformContext]{
		signozFuncs.NewExprFactory(),
		signozFuncs.NewGrokParseFactory[ottllog.TransformContext](),
		signozFuncs.NewHexToIntFactory[ottllog.TransformContext](),
	} {
		factoryMap[f.Name()] = f
	}
	return factoryMap
}

func LogFunctions() map[string]ottl.Factory[ottllog.TransformContext] {
	logFunctions := ottlfuncs.StandardFuncs[ottllog.TransformContext]()

	for name, factory := range SignozLogFunctions() {
		_, exists := logFunctions[name]
		if exists {
			panic(fmt.Sprintf("ottl func %s already exists", name))
		}
		logFunctions[name] = factory
	}

	return logFunctions
}
