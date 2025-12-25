# Script to remove git conflict markers
param(
    [string]$FilePath
)

Write-Host "ניקוי conflicts מ-$FilePath..." -ForegroundColor Cyan

$lines = Get-Content $FilePath
$cleaned = @()
$inConflict = $false
$skipUntilEnd = $false

foreach ($line in $lines) {
    if ($line -match '^<<<<<<<\s') {
        $inConflict = $true
        $skipUntilEnd = $false
        continue
    }
    elseif ($line -match '^=======\s*$' -and $inConflict) {
        $skipUntilEnd = $true
        continue
    }
    elseif ($line -match '^>>>>>>>\s' -and $inConflict) {
        $inConflict = $false
        $skipUntilEnd = $false
        continue
    }
    
    if (-not $skipUntilEnd) {
        $cleaned += $line
    }
}

$cleaned | Set-Content $FilePath -Encoding UTF8
Write-Host "✅ סיימתי!" -ForegroundColor Green
