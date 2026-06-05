# Script de sincronización local
# Ejecuta los jobs que no se pueden automatizar en GitHub Actions
# (nba_api está bloqueado desde los runners de Azure).
#
# Uso manual: doble click sobre el archivo, o desde terminal:
#   .\scripts\local-sync.ps1
#
# Uso programado (Task Scheduler):
#   .\scripts\local-sync.ps1 -Unattended

$lockFile = Join-Path $env:TEMP "nba-scores-sync.lock"

# Si existe un lockfile reciente (menos de 2 horas), abortar
if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalHours -lt 2) {
        Write-Host "[INFO] Otra sync ya en marcha (lock: $lockFile). Abortando." -ForegroundColor Yellow
        exit 0
    }
    # Si el lock es viejo (>2h), asumimos que fue una sync colgada y lo borramos
    Remove-Item $lockFile -Force
}

# Crear el lockfile
New-Item -ItemType File -Path $lockFile -Force | Out-Null

# Asegurar que se borra el lockfile al terminar, incluso si hay error
trap {
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force
    }
}

param(
    [switch]$Unattended
)

$ErrorActionPreference = "Stop"

# Movernos a services/ingestion
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ingestionDir = Join-Path $rootDir "services\ingestion"

# Configurar log si es modo desatendido
if ($Unattended) {
    $logsDir = Join-Path $rootDir "logs"
    if (-Not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
    }
    $logFile = Join-Path $logsDir "sync-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
    Start-Transcript -Path $logFile -Append
}

Set-Location $ingestionDir

# Activar el venv
$venvActivate = Join-Path $ingestionDir ".venv\Scripts\Activate.ps1"
if (-Not (Test-Path $venvActivate)) {
    Write-Host "[ERROR] No se encuentra .venv. Crealo con:" -ForegroundColor Red
    Write-Host "    python -m venv .venv" -ForegroundColor Yellow
    Write-Host "    .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "    pip install -r requirements.txt" -ForegroundColor Yellow
    if ($Unattended) { Stop-Transcript }
    exit 1
}

& $venvActivate

Write-Host ""
Write-Host "===== Sincronizacion local NBA Scores =====" -ForegroundColor Cyan
Write-Host "Inicio: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$hasErrors = $false

try {
    # 1. Jugadores (plantillas actuales)
    Write-Host ">>> [1/4] Sincronizando jugadores..." -ForegroundColor Cyan
    python -m src.jobs.sync_players
    if ($LASTEXITCODE -ne 0) { throw "sync_players fallo con codigo $LASTEXITCODE" }
    Write-Host ""

    # 2. Partidos finalizados
    Write-Host ">>> [2/4] Sincronizando partidos finalizados..." -ForegroundColor Cyan
    python -m src.jobs.sync_games
    if ($LASTEXITCODE -ne 0) { throw "sync_games fallo con codigo $LASTEXITCODE" }
    Write-Host ""

    # 3. Box scores por partido
    Write-Host ">>> [3/4] Sincronizando box scores..." -ForegroundColor Cyan
    python -m src.jobs.sync_box_scores
    if ($LASTEXITCODE -ne 0) { throw "sync_box_scores fallo con codigo $LASTEXITCODE" }
    Write-Host ""

    # 4. Stats de temporada
    Write-Host ">>> [4/4] Sincronizando stats de temporada..." -ForegroundColor Cyan
    python -m src.jobs.sync_season_stats
    if ($LASTEXITCODE -ne 0) { throw "sync_season_stats fallo con codigo $LASTEXITCODE" }
    Write-Host ""

    $duration = (Get-Date) - $startTime
    Write-Host "===== Completado en $($duration.ToString('hh\:mm\:ss')) =====" -ForegroundColor Green
}
catch {
    $hasErrors = $true
    Write-Host ""
    Write-Host "===== ERROR durante la sincronizacion =====" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""

# Solo esperar input en modo manual
if (-Not $Unattended) {
    Write-Host "Presiona Enter para cerrar..."
    Read-Host
}

if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
}

if ($Unattended) {
    Stop-Transcript
}

if ($hasErrors) { exit 1 }