// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package common // import "github.com/SigNoz/signoz-otel-collector/processor/signoztransformprocessor/internal/common"

import (
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlresource"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlscope"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs"
)

func ResourceFunctions() map[string]ottl.Factory[ottlresource.TransformContext] {
	return ottlfuncs.StandardFuncs[ottlresource.TransformContext]()
}

func ScopeFunctions() map[string]ottl.Factory[ottlscope.TransformContext] {
	return ottlfuncs.StandardFuncs[ottlscope.TransformContext]()
}
