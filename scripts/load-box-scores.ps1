# Carga box scores temporada a temporada, de la mas reciente a la mas
# antigua. Cada temporada son ~1300 partidos y unos 33 minutos, asi que
# esto esta pensado para dejarlo corriendo largo rato.
#
# Es reanudable: el job salta los partidos que ya tienen box score, asi
# que si lo cortas y lo relanzas retoma donde iba.
#
# Uso:
#   .\scripts\load-box-scores.ps1                      # 2024-25 hasta 1984-85
#   .\scripts\load-box-scores.ps1 -Desde 2023-24       # desde otra temporada
#   .\scripts\load-box-scores.ps1 -Desde 2023-24 -Hasta 2015-16

param(
    [string]$Desde = "2024-25",
    [string]$Hasta = "1984-85"
)

$ErrorActionPreference = "Stop"

# Los jobs imprimen flechas y emojis; sin esto Python peta con 'charmap'
# en cuanto la salida se redirige a un fichero.
$env:PYTHONIOENCODING = "utf-8"

$rootDir = Split-Path -Parent $PSScriptRoot
$ingestionDir = Join-Path $rootDir "services\ingestion"
$venvPython = Join-Path $ingestionDir ".venv\Scripts\python.exe"
$logsDir = Join-Path $rootDir "logs"
$lockFile = Join-Path $env:TEMP "nba-scores-boxscores.lock"

if (-Not (Test-Path $venvPython)) {
    Write-Host "[ERROR] No se encuentra .venv en services\ingestion" -ForegroundColor Red
    exit 1
}

# Dos hilos pidiendo a stats.nba.com a la vez es la mejor forma de que
# nos capen la IP, asi que solo una ejecucion cada vez.
if (Test-Path $lockFile) {
    $edad = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($edad.TotalHours -lt 24) {
        Write-Host "[INFO] Ya hay una carga en marcha (lock: $lockFile)." -ForegroundColor Yellow
        Write-Host "       Si estas seguro de que no, borra ese fichero." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $lockFile -Force
}
New-Item -ItemType File -Path $lockFile -Force | Out-Null

if (-Not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

# "2024-25" -> 2024. La temporada se nombra por el ano en que empieza.
$anioDesde = [int]($Desde.Split("-")[0])
$anioHasta = [int]($Hasta.Split("-")[0])

$temporadas = @()
for ($y = $anioDesde; $y -ge $anioHasta; $y--) {
    $fin = ($y + 1) % 100
    $temporadas += "{0}-{1:D2}" -f $y, $fin
}

Write-Host ""
Write-Host "===== Carga de box scores =====" -ForegroundColor Cyan
Write-Host "$($temporadas.Count) temporadas: $($temporadas[0]) -> $($temporadas[-1])" -ForegroundColor Cyan
Write-Host "Estimacion: ~33 min por temporada, unas $([math]::Round($temporadas.Count * 33 / 60, 1)) horas en total" -ForegroundColor Cyan
Write-Host "Inicio: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

Set-Location $ingestionDir

$inicio = Get-Date
$hechas = 0
$fallidas = @()

try {
    foreach ($temporada in $temporadas) {
        $n = $hechas + 1
        $t0 = Get-Date
        Write-Host ">>> [$n/$($temporadas.Count)] $temporada ..." -ForegroundColor Cyan

        $log = Join-Path $logsDir "boxscores-$temporada.log"
        & $venvPython -u -m src.jobs.sync_box_scores --season $temporada *> $log

        if ($LASTEXITCODE -ne 0) {
            $fallidas += $temporada
            Write-Host "    fallo (codigo $LASTEXITCODE). Log: $log" -ForegroundColor Red
        }
        else {
            # El job cuenta al final cuantas lineas inserto
            $resumen = Select-String -Path $log -Pattern "Entradas insertadas:" |
                Select-Object -Last 1
            $duracion = ((Get-Date) - $t0).ToString('hh\:mm\:ss')
            $detalle = if ($resumen) { $resumen.Line.Trim() } else { "sin partidos nuevos" }
            Write-Host "    OK en $duracion  |  $detalle" -ForegroundColor Green
        }

        $hechas++
    }
}
finally {
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force
    }
}

$total = ((Get-Date) - $inicio).ToString('hh\:mm\:ss')
Write-Host ""
Write-Host "===== Completado en $total =====" -ForegroundColor Green
Write-Host "Temporadas procesadas: $hechas de $($temporadas.Count)"
if ($fallidas.Count -gt 0) {
    Write-Host "Con errores: $($fallidas -join ', ')" -ForegroundColor Yellow
    Write-Host "Relanza el script y retomara solo lo que falte." -ForegroundColor Yellow
}
