# Script de sincronización local
# Ejecuta los jobs que no se pueden automatizar en GitHub Actions
# (nba_api está bloqueado desde los runners de Azure).
#
# Uso: doble click sobre el archivo, o desde terminal:
#   .\scripts\local-sync.ps1

$ErrorActionPreference = "Stop"

# Movernos a services/ingestion
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ingestionDir = Join-Path $rootDir "services\ingestion"

Set-Location $ingestionDir

# Activar el venv
$venvActivate = Join-Path $ingestionDir ".venv\Scripts\Activate.ps1"
if (-Not (Test-Path $venvActivate)) {
    Write-Host "⚠️  No se encuentra .venv. Crealo con:" -ForegroundColor Red
    Write-Host "    python -m venv .venv" -ForegroundColor Yellow
    Write-Host "    .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "    pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

& $venvActivate

Write-Host ""
Write-Host "===== Sincronizacion local NBA Scores =====" -ForegroundColor Cyan
Write-Host ""

# 1. Jugadores (plantillas actuales)
Write-Host ">>> [1/4] Sincronizando jugadores..." -ForegroundColor Cyan
python -m src.jobs.sync_players
Write-Host ""

# 2. Partidos finalizados
Write-Host ">>> [2/4] Sincronizando partidos finalizados..." -ForegroundColor Cyan
python -m src.jobs.sync_games
Write-Host ""

# 3. Box scores por partido
Write-Host ">>> [3/4] Sincronizando box scores..." -ForegroundColor Cyan
python -m src.jobs.sync_box_scores
Write-Host ""

# 4. Stats de temporada
Write-Host ">>> [4/4] Sincronizando stats de temporada..." -ForegroundColor Cyan
python -m src.jobs.sync_season_stats
Write-Host ""

Write-Host "===== Completado =====" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Enter para cerrar..."
Read-Host