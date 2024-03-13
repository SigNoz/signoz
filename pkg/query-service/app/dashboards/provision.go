package dashboards

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"go.uber.org/zap"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
)

func readCurrentDir(dir string, fm interfaces.FeatureLookup) error {
	file, err := os.Open(dir)
	if err != nil {
		zap.L().Warn("failed opening directory", zap.Error(err))
		return nil
	}
	defer file.Close()

	list, _ := file.Readdirnames(0) // 0 to read all files and folders
	for _, filename := range list {
		zap.L().Info("Provisioning dashboard: ", zap.String("filename", filename))

		// using filepath.Join for platform specific path creation
		// which is equivalent to "dir+/+filename" (on unix based systems) but cleaner
		plan, err := os.ReadFile(filepath.Join(dir, filename))
		if err != nil {
			zap.L().Error("Creating Dashboards: Error in reading json fron file", zap.String("filename", filename), zap.Error(err))
			continue
		}
		var data map[string]interface{}
		err = json.Unmarshal(plan, &data)
		if err != nil {
			zap.L().Error("Creating Dashboards: Error in unmarshalling json from file", zap.String("filename", filename), zap.Error(err))
			continue
		}
		err = IsPostDataSane(&data)
		if err != nil {
			zap.L().Info("Creating Dashboards: Error in file", zap.String("filename", filename), zap.Error(err))
			continue
		}

		_, apiErr := GetDashboard(context.Background(), data["uuid"].(string))
		if apiErr == nil {
			zap.L().Info("Creating Dashboards: Error in file", zap.String("filename", filename), zap.String("error", "Dashboard already present in database"))
			continue
		}

		_, apiErr = CreateDashboard(context.Background(), data, fm)
		if apiErr != nil {
			zap.L().Error("Creating Dashboards: Error in file", zap.String("filename", filename), zap.Error(apiErr.Err))
			continue
		}

	}
	return nil
}

func LoadDashboardFiles(fm interfaces.FeatureLookup) error {
	dashboardsPath := constants.GetOrDefaultEnv("DASHBOARDS_PATH", "./config/dashboards")
	return readCurrentDir(dashboardsPath, fm)
}
