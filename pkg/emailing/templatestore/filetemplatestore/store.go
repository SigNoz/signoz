package filetemplatestore

import (
	"context"
	"html/template"
	"log/slog"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

const (
	emailTemplateExt = ".gotmpl"
)

type store struct {
	fs map[emailtypes.TemplateName]*template.Template
}

func NewStore(ctx context.Context, baseDir string, templates []emailtypes.TemplateName, logger *slog.Logger) (emailtypes.TemplateStore, error) {
	fs := make(map[emailtypes.TemplateName]*template.Template)
	fis, err := os.ReadDir(filepath.Clean(baseDir))
	if err != nil {
		return nil, err
	}

	foundTemplates := make(map[emailtypes.TemplateName]bool)
	for _, fi := range fis {
		if fi.IsDir() || filepath.Ext(fi.Name()) != emailTemplateExt {
			continue
		}

		templateName, err := parseTemplateName(fi.Name())
		if err != nil {
			continue
		}

		if !slices.Contains(templates, templateName) {
			continue
		}

		t, err := parseTemplateFile(filepath.Join(baseDir, fi.Name()), templateName)
		if err != nil {
			logger.ErrorContext(ctx, "failed to parse template file", "template", templateName, "path", filepath.Join(baseDir, fi.Name()), "error", err)
			continue
		}

		fs[templateName] = t
		foundTemplates[templateName] = true
	}

	if err := checkMissingTemplates(templates, foundTemplates); err != nil {
		logger.ErrorContext(ctx, "some templates are missing", "error", err)
	}

	return &store{fs: fs}, nil
}

func NewEmptyStore() emailtypes.TemplateStore {
	return &store{fs: make(map[emailtypes.TemplateName]*template.Template)}
}

func (repository *store) Get(ctx context.Context, name emailtypes.TemplateName) (*template.Template, error) {
	template, ok := repository.fs[name]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "cannot find template with name %q", name.StringValue())
	}

	return template.Clone()
}

func parseTemplateName(fileName string) (emailtypes.TemplateName, error) {
	name := strings.TrimSuffix(fileName, emailTemplateExt)
	return emailtypes.NewTemplateName(name)
}

func parseTemplateFile(filePath string, templateName emailtypes.TemplateName) (*template.Template, error) {
	contents, err := os.ReadFile(filepath.Clean(filePath))
	if err != nil {
		return nil, err
	}

	return template.New(templateName.StringValue()).Parse(string(contents))
}

func checkMissingTemplates(supportedTemplates []emailtypes.TemplateName, foundTemplates map[emailtypes.TemplateName]bool) error {
	var missingTemplates []string
	for _, template := range supportedTemplates {
		if !foundTemplates[template] {
			missingTemplates = append(missingTemplates, template.StringValue())
		}
	}

	if len(missingTemplates) > 0 {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "missing email templates: %s", strings.Join(missingTemplates, ", "))
	}

	return nil
}
