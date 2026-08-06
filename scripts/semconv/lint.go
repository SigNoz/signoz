package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

type lintExceptionFile struct {
	Exceptions []lintException `yaml:"exceptions"`
}

type lintException struct {
	Path   string `yaml:"path"`
	Name   string `yaml:"name"`
	Reason string `yaml:"reason"`
}

type lintFinding struct {
	Path    string
	Line    int
	Old     string
	Current string
}

type sourceLiteral struct {
	value string
	line  int
}

func lintRepository(root string, families []generatedFamily, exceptionsPath string) error {
	oldToCurrent := make(map[string]string)
	for _, family := range families {
		for _, old := range family.Old {
			oldToCurrent[old] = family.Current
		}
	}

	exceptions, err := readLintExceptions(exceptionsPath, oldToCurrent)
	if err != nil {
		return err
	}
	exceptionIndex := make(map[string]lintException, len(exceptions))
	usedExceptions := make(map[string]bool, len(exceptions))
	for _, exception := range exceptions {
		key := exception.Path + "\x00" + exception.Name
		if _, exists := exceptionIndex[key]; exists {
			return fmt.Errorf("duplicate semantic-convention lint exception for %s: %s", exception.Path, exception.Name)
		}
		exceptionIndex[key] = exception
	}

	var findings []lintFinding
	for _, sourceRoot := range []string{"pkg", "cmd", "internal", "ee", "frontend/src"} {
		path := filepath.Join(root, sourceRoot)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			continue
		}
		err := filepath.WalkDir(path, func(path string, entry os.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			relative, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			relative = filepath.ToSlash(relative)
			if entry.IsDir() {
				if shouldSkipLintDirectory(relative) {
					return filepath.SkipDir
				}
				return nil
			}
			if shouldSkipLintFile(relative) {
				return nil
			}

			literals, err := sourceLiterals(path)
			if err != nil {
				return fmt.Errorf("read literals from %s: %w", relative, err)
			}
			for _, literal := range literals {
				for old, current := range oldToCurrent {
					if !containsSemconvName(literal.value, old) {
						continue
					}
					key := relative + "\x00" + old
					if _, excepted := exceptionIndex[key]; excepted {
						usedExceptions[key] = true
						continue
					}
					findings = append(findings, lintFinding{
						Path: relative, Line: literal.line, Old: old, Current: current,
					})
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
	}

	var stale []string
	for key, exception := range exceptionIndex {
		if !usedExceptions[key] {
			stale = append(stale, fmt.Sprintf("%s: %s", exception.Path, exception.Name))
		}
	}
	if len(stale) > 0 {
		sort.Strings(stale)
		return fmt.Errorf("stale semantic-convention lint exceptions:\n  %s", strings.Join(stale, "\n  "))
	}
	if len(findings) == 0 {
		return nil
	}

	sort.Slice(findings, func(i, j int) bool {
		if findings[i].Path != findings[j].Path {
			return findings[i].Path < findings[j].Path
		}
		if findings[i].Line != findings[j].Line {
			return findings[i].Line < findings[j].Line
		}
		return findings[i].Old < findings[j].Old
	})
	lines := make([]string, len(findings))
	for i, finding := range findings {
		lines[i] = fmt.Sprintf("%s:%d: %s -> %s", finding.Path, finding.Line, finding.Old, finding.Current)
	}
	return fmt.Errorf(
		"old semantic-convention names found in product string literals:\n  %s\nuse the current name or add a narrow, reasoned exception",
		strings.Join(lines, "\n  "),
	)
}

func readLintExceptions(path string, oldToCurrent map[string]string) ([]lintException, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read semantic-convention lint exceptions: %w", err)
	}
	var file lintExceptionFile
	if err := yaml.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("parse semantic-convention lint exceptions: %w", err)
	}
	for i, exception := range file.Exceptions {
		if exception.Path == "" || exception.Name == "" || strings.TrimSpace(exception.Reason) == "" {
			return nil, fmt.Errorf("semantic-convention lint exception %d requires path, name, and reason", i+1)
		}
		if filepath.IsAbs(exception.Path) || filepath.ToSlash(filepath.Clean(exception.Path)) != exception.Path {
			return nil, fmt.Errorf("semantic-convention lint exception path must be a clean repository-relative path: %q", exception.Path)
		}
		if _, enabled := oldToCurrent[exception.Name]; !enabled {
			return nil, fmt.Errorf("semantic-convention lint exception %s names an old field that is not enabled: %s", exception.Path, exception.Name)
		}
	}
	return file.Exceptions, nil
}

func shouldSkipLintDirectory(path string) bool {
	base := filepath.Base(path)
	if base == "testdata" || base == "tests" || base == "__test__" || base == "__tests__" || base == "__mocks__" || base == "mocks-server" || base == "generated" {
		return true
	}
	return base == "node_modules" || base == "dist" || base == "build"
}

func shouldSkipLintFile(path string) bool {
	base := filepath.Base(path)
	if strings.HasSuffix(base, "_test.go") || strings.HasSuffix(base, "_test.ts") || strings.HasSuffix(base, "_test.tsx") ||
		strings.Contains(base, ".test.") || strings.Contains(base, ".testUtils.") || strings.Contains(base, ".spec.") || strings.Contains(base, ".stories.") ||
		strings.HasSuffix(base, ".gen.go") || strings.HasSuffix(base, ".gen.ts") || strings.HasSuffix(base, "_gen.go") || base == "test_data.go" {
		return true
	}
	switch filepath.Ext(base) {
	case ".go", ".ts", ".tsx", ".js", ".jsx":
		return false
	default:
		return true
	}
}

func sourceLiterals(path string) ([]sourceLiteral, error) {
	if filepath.Ext(path) == ".go" {
		return goSourceLiterals(path)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return scriptSourceLiterals(string(data)), nil
}

func goSourceLiterals(path string) ([]sourceLiteral, error) {
	set := token.NewFileSet()
	file, err := parser.ParseFile(set, path, nil, 0)
	if err != nil {
		return nil, err
	}
	var literals []sourceLiteral
	ast.Inspect(file, func(node ast.Node) bool {
		literal, ok := node.(*ast.BasicLit)
		if !ok || literal.Kind != token.STRING {
			return true
		}
		value, err := strconv.Unquote(literal.Value)
		if err == nil {
			literals = append(literals, sourceLiteral{value: value, line: set.Position(literal.Pos()).Line})
		}
		return true
	})
	return literals, nil
}

func scriptSourceLiterals(source string) []sourceLiteral {
	var literals []sourceLiteral
	line := 1
	for index := 0; index < len(source); {
		switch {
		case source[index] == '\n':
			line++
			index++
		case index+1 < len(source) && source[index:index+2] == "//":
			index += 2
			for index < len(source) && source[index] != '\n' {
				index++
			}
		case index+1 < len(source) && source[index:index+2] == "/*":
			index += 2
			for index+1 < len(source) && source[index:index+2] != "*/" {
				if source[index] == '\n' {
					line++
				}
				index++
			}
			if index+1 < len(source) {
				index += 2
			}
		case source[index] == '\'' || source[index] == '"' || source[index] == '`':
			quote := source[index]
			startLine := line
			index++
			var value strings.Builder
			for index < len(source) {
				if source[index] == '\\' && index+1 < len(source) {
					value.WriteByte(source[index])
					value.WriteByte(source[index+1])
					index += 2
					continue
				}
				if source[index] == quote {
					index++
					break
				}
				if source[index] == '\n' {
					line++
				}
				value.WriteByte(source[index])
				index++
			}
			literals = append(literals, sourceLiteral{value: value.String(), line: startLine})
		default:
			index++
		}
	}
	return literals
}

func containsSemconvName(text, name string) bool {
	for offset := 0; offset < len(text); {
		index := strings.Index(text[offset:], name)
		if index < 0 {
			return false
		}
		index += offset
		beforeOK := index == 0 || !isSemconvNameCharacter(text[index-1])
		after := index + len(name)
		afterOK := after == len(text) || !isSemconvNameCharacter(text[after])
		if beforeOK && afterOK {
			return true
		}
		offset = index + 1
	}
	return false
}

func isSemconvNameCharacter(value byte) bool {
	return value >= 'a' && value <= 'z' || value >= 'A' && value <= 'Z' ||
		value >= '0' && value <= '9' || value == '_' || value == '.' || value == '-'
}
