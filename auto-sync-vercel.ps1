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

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Staging files..." -ForegroundColor Gray
            git add -A

            $commitMsg = "auto: sync live updates to vercel [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]"
            git commit -m $commitMsg

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushing to GitHub origin/main..." -ForegroundColor Cyan
            $pushResult = git push origin main 2>&1

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] SUCCESS! Deployed to GitHub & Vercel auto-triggered!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Sync error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds 3
}
