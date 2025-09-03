@echo off
echo Building SigNoz on Windows...
echo.

REM Check if Go is installed
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Go is not installed or not in PATH
    echo Please install Go from https://go.dev/dl/
    pause
    exit /b 1
)
echo Go found: 
go version

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found:
node --version

REM Check if Yarn is installed
yarn --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Yarn...
    npm install -g yarn
    if %errorlevel% neq 0 (
        echo Error: Failed to install Yarn
        pause
        exit /b 1
    )
)
echo Yarn found:
yarn --version

echo.
echo Building Go backend...
cd cmd\community

REM Set environment variables for the build
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=1

REM Build the binary
go build -o "..\..\target\signoz-community.exe" -tags timetzdata
if %errorlevel% neq 0 (
    echo Error: Go backend build failed
    pause
    exit /b 1
)

REM Go back to project root
cd ..\..

REM Create target directory if it doesn't exist
if not exist "target" mkdir target

echo Go backend built successfully: target\signoz-community.exe

echo.
echo Building frontend...
cd frontend

REM Install dependencies
echo Installing frontend dependencies...
yarn install
if %errorlevel% neq 0 (
    echo Error: Frontend dependencies installation failed
    pause
    exit /b 1
)

REM Build frontend
echo Building frontend for production...
yarn build
if %errorlevel% neq 0 (
    echo Error: Frontend build failed
    pause
    exit /b 1
)

REM Go back to project root
cd ..

echo.
echo Build completed successfully!
echo Backend binary: target\signoz-community.exe
echo Frontend build: frontend\build\
echo.
echo To run the backend:
echo   cd cmd\community
echo   .\signoz-community.exe server --config ..\..\conf\prometheus.yml --cluster cluster
echo.
echo To run the frontend:
echo   cd frontend
echo   yarn dev
echo.
pause
