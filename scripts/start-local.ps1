$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
New-Item -ItemType Directory -Force .local | Out-Null
if (-not (Test-Path '.local/dev-credentials.json')) {
    @{ email='atelier@velora.local'; password=[guid]::NewGuid().ToString('N') } | ConvertTo-Json | Set-Content '.local/dev-credentials.json'
}
$credentials = Get-Content '.local/dev-credentials.json' | ConvertFrom-Json
$env:ADMIN_EMAIL = $credentials.email
$env:ADMIN_PASSWORD = $credentials.password
$maven = if (Test-Path '.tools/apache-maven-3.9.9/bin/mvn.cmd') { Join-Path $projectRoot '.tools/apache-maven-3.9.9/bin/mvn.cmd' } else { 'mvn.cmd' }
if (-not (Test-Path 'frontend/node_modules')) { & npm.cmd ci --prefix frontend; if($LASTEXITCODE -ne 0){throw 'Frontend dependencies failed'} }
& $maven -f backend/pom.xml '-Dmaven.repo.local=.tools/m2' package -DskipTests
if($LASTEXITCODE -ne 0){throw 'Backend build failed'}
$socketArgument = '"-Djdk.net.unixdomain.tmpdir=' + (Join-Path $projectRoot '.local') + '"'
$apiProcess=Start-Process java -ArgumentList @($socketArgument,'-jar','backend/target/velora-1.0.0.jar','--spring.profiles.active=dev','--server.address=127.0.0.1') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/backend.log' -RedirectStandardError '.local/backend-error.log'
$nodePath=(Get-Command node).Source
$webProcess=Start-Process $nodePath -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.local/frontend.log') -RedirectStandardError (Join-Path $projectRoot '.local/frontend-error.log')
@{api=$apiProcess.Id;web=$webProcess.Id} | ConvertTo-Json | Set-Content '.local/processes.json'
Write-Host 'VELORA is starting at http://127.0.0.1:5173. Logs and generated admin credentials are in .local/.'

