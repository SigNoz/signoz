// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

// Package msk implements the required IAM auth used by AWS' managed Kafka platform
// to be used with the Surama kafka producer.
//
// Further details on how the SASL connector works can be viewed here:
//
//	https://github.com/aws/aws-msk-iam-auth#details
package awsmsk // import "github.com/open-telemetry/opentelemetry-collector-contrib/internal/kafka/awsmsk"
