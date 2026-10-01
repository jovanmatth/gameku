# ==============================================================================
# PlanCalender — Real-Time Auto Sync Daemon to GitHub & Vercel
# ==============================================================================
# Watches repository files and automatically commits & pushes to GitHub 'main'
# whenever any file is edited or saved, triggering automatic Vercel deployment.
# ==============================================================================

$RepoPath = $PSScriptRoot
Set-Location $RepoPath

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PlanCalender Auto-Sync Daemon Started!" -ForegroundColor Green
Write-Host "Watching: $RepoPath" -ForegroundColor Yellow
Write-Host "Any modification will be auto-pushed to GitHub & Vercel!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$lastSync = Get-Date

while ($true) {
    try {
        # Check git status for changes or untracked files
        $status = git status --porcelain 2>&1
        $ahead = git status -sb 2>&1 | Select-String "ahead"

        if ($status -or $ahead) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Change detected! Waiting 3s to debounce..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3

            # Update version.json buildTimestamp so clients detect live patch
            $vPath = Join-Path $RepoPath "version.json"
            if (Test-Path $vPath) {
                try {
                    $vObj = Get-Content $vPath -Raw -Encoding UTF8 | ConvertFrom-Json
                    $vObj.buildTimestamp = [long]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
                    $vObj.releaseDate = (Get-Date -Format 'dd MMMM yyyy HH:mm WIB')
                    [System.IO.File]::WriteAllText($vPath, ($vObj | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
                } catch {}
            }

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Staging files..." -ForegroundColor Gray
            git add -A

            $commitMsg = "auto: sync live updates to vercel [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]"
            git commit -m $commitMsg

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushing to GitHub origin/main..." -ForegroundColor Cyan
            $pushResult = git push origin main 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] SUCCESS! Deployed to GitHub & Vercel auto-triggered!" -ForegroundColor Green
            } else {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Push failed: $pushResult" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Sync error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds 3
}
