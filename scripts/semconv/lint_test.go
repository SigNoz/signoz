package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLintRepositoryRejectsSeededOldLiteral(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "pkg/example"), 0o755))
	require.NoError(t, os.WriteFile(
		filepath.Join(root, "pkg/example/example.go"),
		[]byte("package example\nvar field = \"http.method\"\n"),
		0o644,
	))
	exceptions := filepath.Join(root, "exceptions.yaml")
	require.NoError(t, os.WriteFile(exceptions, []byte("exceptions: []\n"), 0o644))

	err := lintRepository(root, []generatedFamily{{
		Current: "http.request.method",
		Old:     []string{"http.method"},
		Kind:    kindAttribute,
	}}, exceptions)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "pkg/example/example.go:2: http.method -> http.request.method", "lint error should identify the old literal and its replacement")
}

func TestLintRepositoryIgnoresCommentsAndCurrentNames(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "frontend/src/example"), 0o755))
	require.NoError(t, os.WriteFile(
		filepath.Join(root, "frontend/src/example/current.ts"),
		[]byte("// http.method is historical\nexport const field = 'http.request.method';\n"),
		0o644,
	))
	exceptions := filepath.Join(root, "exceptions.yaml")
	require.NoError(t, os.WriteFile(exceptions, []byte("exceptions: []\n"), 0o644))

	assert.NoError(t, lintRepository(root, []generatedFamily{{
		Current: "http.request.method",
		Old:     []string{"http.method"},
		Kind:    kindAttribute,
	}}, exceptions), "comments and current names should not trigger old-name lint")
}

func TestLintRepositoryRequiresLiveReasonedExceptions(t *testing.T) {
	root := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(root, "frontend/src/example"), 0o755))
	require.NoError(t, os.WriteFile(
		filepath.Join(root, "frontend/src/example/compat.ts"),
		[]byte("export const field = `http.method`;\n"),
		0o644,
	))
	exceptions := filepath.Join(root, "exceptions.yaml")
	require.NoError(t, os.WriteFile(exceptions, []byte(`exceptions:
  - path: frontend/src/example/compat.ts
    name: http.method
    reason: Reads an external legacy payload verbatim.
`), 0o644))
	assert.NoError(t, lintRepository(root, []generatedFamily{{
		Current: "http.request.method",
		Old:     []string{"http.method"},
		Kind:    kindAttribute,
	}}, exceptions), "a live exception with a reason should suppress the old-name warning")

	require.NoError(t, os.WriteFile(
		filepath.Join(root, "frontend/src/example/compat.ts"),
		[]byte("export const field = `http.request.method`;\n"),
		0o644,
	))
	err := lintRepository(root, []generatedFamily{{
		Current: "http.request.method",
		Old:     []string{"http.method"},
		Kind:    kindAttribute,
	}}, exceptions)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "stale semantic-convention lint exceptions", "lint should reject exceptions after the old literal is removed")
}
