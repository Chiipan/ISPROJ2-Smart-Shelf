<#
  One-command database setup: creates the DB if missing, then applies
  database\01_schema.sql and database\02_seed.sql.

  !! Re-running RESETS the database (schema drops + recreates all tables). !!

  Usage:
    npm run db:setup                              # LocalDB / .env defaults
    .\scripts\setup-db.ps1 -Server "PC\SQLEXPRESS"  # explicit server
#>
param(
  [string]$Server,
  [string]$Database
)

$root = Split-Path $PSScriptRoot -Parent

# Fall back to .env values, then to the same defaults src/config.js uses
$envVals = @{}
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$') {
      $envVals[$Matches[1]] = $Matches[2]
    }
  }
}
if (-not $Server) {
  if ($envVals['DB_SERVER']) { $Server = $envVals['DB_SERVER'] }
  else { $Server = '(localdb)\MSSQLLocalDB' }
}
if (-not $Database) {
  if ($envVals['DB_NAME']) { $Database = $envVals['DB_NAME'] }
  else { $Database = 'tabletop' }
}

Write-Host "Setting up [$Database] on [$Server]..."

sqlcmd -S $Server -E -b -Q "IF DB_ID('$Database') IS NULL CREATE DATABASE [$Database];"
if ($LASTEXITCODE -ne 0) { Write-Error "Cannot reach $Server - is SQL Server running?"; exit 1 }

# -I: filtered indexes in the schema require QUOTED_IDENTIFIER ON
sqlcmd -S $Server -d $Database -E -b -I -i (Join-Path $root 'database\01_schema.sql')
if ($LASTEXITCODE -ne 0) { Write-Error 'Schema script failed.'; exit 1 }

sqlcmd -S $Server -d $Database -E -b -I -i (Join-Path $root 'database\02_seed.sql')
if ($LASTEXITCODE -ne 0) { Write-Error 'Seed script failed.'; exit 1 }

Write-Host "Done. [$Database] is ready on [$Server]."
