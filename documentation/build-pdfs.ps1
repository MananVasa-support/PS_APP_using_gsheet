# Regenerate the official PDFs from the Markdown docs.
# Usage:  cd documentation ;  ./build-pdfs.ps1
# Requires: Node (for marked) and Google Chrome.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

if (-not (Test-Path 'node_modules/marked')) { npm install marked | Out-Null }

# 1) Markdown -> styled HTML
node build-docs.mjs

# 2) HTML -> PDF via headless Chrome
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $chrome)) { throw "Chrome not found — install Chrome or convert .build/*.html manually." }

New-Item -ItemType Directory -Force -Path 'pdf' | Out-Null
$docs = 'README','01-Architecture','02-PRD','03-TRD','04-App-Flow','05-Backend-Schema'
foreach ($d in $docs) {
  $inHtml = "file:///$($here -replace '\\','/')/.build/$d.html"
  $outPdf = Join-Path $here "pdf/$d.pdf"
  & $chrome --headless --disable-gpu --no-sandbox --no-pdf-header-footer "--print-to-pdf=$outPdf" $inHtml 2>$null
  Write-Host "  -> pdf/$d.pdf"
}
Write-Host "Done. PDFs are in documentation/pdf/"
