# Script de sincronizacion local
# Ejecuta los jobs que no se pueden automatizar en GitHub Actions
# (nba_api esta bloqueado desde los runners de Azure).
#
# Uso manual: doble click sobre el archivo, o desde terminal:
#   .\scripts\local-sync.ps1
#
# Uso programado (Task Scheduler):
#   .\scripts\local-sync.ps1 -Unattended

param(
    [switch]$Unattended
)

$ErrorActionPreference = "Stop"

# Los jobs imprimen flechas y emojis; sin esto Python peta con 'charmap'
# en cuanto la salida se redirige (transcript, Task Scheduler, fichero).
$env:PYTHONIOENCODING = "utf-8"

$rootDir = Split-Path -Parent $PSScriptRoot
$ingestionDir = Join-Path $rootDir "services\ingestion"
$venvPython = Join-Path $ingestionDir ".venv\Scripts\python.exe"
$lockFile = Join-Path $env:TEMP "nba-scores-sync.lock"

$jobs = @(
    @{ Label = "jugadores";            Module = "src.jobs.sync_players" },
    @{ Label = "partidos finalizados"; Module = "src.jobs.sync_games" },
    @{ Label = "box scores";           Module = "src.jobs.sync_box_scores" },
    @{ Label = "stats de temporada";   Module = "src.jobs.sync_season_stats" }
)

# Si existe un lockfile reciente (menos de 2 horas), abortar.
# Salimos antes de crear nada para no borrar el lock de la otra sync.
if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalHours -lt 2) {
        Write-Host "[INFO] Otra sync ya en marcha (lock: $lockFile). Abortando." -ForegroundColor Yellow
        exit 0
    }
    # Si el lock es viejo (>2h), asumimos que fue una sync colgada y lo borramos
    Remove-Item $lockFile -Force
}

New-Item -ItemType File -Path $lockFile -Force | Out-Null

$transcriptStarted = $false
$exitCode = 0

# El finally garantiza que el lockfile se borra pase lo que pase,
# incluidos los errores y las salidas tempranas.
try {
    if ($Unattended) {
        $logsDir = Join-Path $rootDir "logs"
        if (-Not (Test-Path $logsDir)) {
            New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
        }
        $logFile = Join-Path $logsDir "sync-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
        Start-Transcript -Path $logFile -Append | Out-Null
        $transcriptStarted = $true
    }

    if (-Not (Test-Path $venvPython)) {
        Write-Host "[ERROR] No se encuentra .venv. Crealo con:" -ForegroundColor Red
        Write-Host "    cd services\ingestion" -ForegroundColor Yellow
        Write-Host "    python -m venv .venv" -ForegroundColor Yellow
        Write-Host "    .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
        Write-Host "    pip install -r requirements.txt" -ForegroundColor Yellow
        $exitCode = 1
    }
    else {
        Set-Location $ingestionDir

        Write-Host ""
        Write-Host "===== Sincronizacion local NBA Scores =====" -ForegroundColor Cyan
        Write-Host "Inicio: $(Get-Date)" -ForegroundColor Cyan
        Write-Host ""

        $startTime = Get-Date

        try {
            $step = 0
            foreach ($job in $jobs) {
                $step++
                Write-Host ">>> [$step/$($jobs.Count)] Sincronizando $($job.Label)..." -ForegroundColor Cyan
                & $venvPython -m $job.Module
                if ($LASTEXITCODE -ne 0) {
                    throw "$($job.Module) fallo con codigo $LASTEXITCODE"
                }
                Write-Host ""
            }

            $duration = (Get-Date) - $startTime
            Write-Host "===== Completado en $($duration.ToString('hh\:mm\:ss')) =====" -ForegroundColor Green
        }
        catch {
            $exitCode = 1
            Write-Host ""
            Write-Host "===== ERROR durante la sincronizacion =====" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }

        Write-Host ""
    }
}
finally {
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force
    }

    # Solo esperar input en modo manual
    if (-Not $Unattended) {
        Write-Host "Presiona Enter para cerrar..."
        Read-Host | Out-Null
    }

    if ($transcriptStarted) {
        Stop-Transcript | Out-Null
    }
}

exit $exitCode
