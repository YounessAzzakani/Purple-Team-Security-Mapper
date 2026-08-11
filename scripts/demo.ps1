# ============================================================
# Purple Team Mapper - Demo PFE (scenario complet)
#   1. Import du jeu de regles SOC (fichier Sigma)
#   2. Analyse 1 : SOC sans aucun controle actif  (avant)
#   3. Analyse 2 : controles de base               (milieu)
#   4. Analyse 3 : posture renforcee               (apres)
#   5. Comparaison avant / apres
#   6. Simulation de campagnes APT (apt28, lockbit) avant / apres
#   7. Exports (Navigator JSON, CSV, CSV de simulation) -> demo-artifacts/
#
# Usage:
#   powershell -File scripts/demo.ps1                  # backend deja lance (port 8000)
#   powershell -File scripts/demo.ps1 -ResetDb         # remet la base a zero puis demarre le backend
#   powershell -File scripts/demo.ps1 -Port 8001 -Token mon-token
#
# NOTE: le fichier doit rester 100% ASCII (pas d'accents ni em-dash):
# PS 5.1 lit les .ps1 sans BOM en CP1252 et les caracteres UTF-8
# peuvent degenerer en guillemets parasites qui cassent le parsing.
# ============================================================

param(
    [int]$Port = 8000,
    [string]$Token = "dev-token",
    [switch]$ResetDb,
    [int]$Runs = 1000,
    [int]$Seed = 42
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$dbFile = Join-Path $backendDir "data\ptm.db"
$sigmaFile = Join-Path $root "test-samples\sigma_rules_soc_demo.yml"
$artifacts = Join-Path $root "demo-artifacts"
$baseUrl = "http://localhost:$Port"
$headers = @{ Authorization = "Bearer $Token" }

New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

function Invoke-Api {
    param([string]$Method, [string]$Path, $Body = $null)
    $params = @{ Method = $Method; Uri = "$baseUrl$Path"; Headers = $headers }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }
    return Invoke-RestMethod @params
}

function Write-Step {
    param([string]$Msg)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host $Msg -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

# ---------- Demarrage du backend si necessaire ----------
$startedByScript = $false
$health = (curl.exe -s -m 2 "$baseUrl/health")
if ($health -match '"ok"') {
    Write-Host "[INFO] Backend deja en ligne sur $baseUrl" -ForegroundColor Green
} else {
    if ($ResetDb -and (Test-Path $dbFile)) {
        Write-Host "[INFO] Suppression de la base existante ($dbFile)" -ForegroundColor Yellow
        Remove-Item $dbFile -Force
    }
    Write-Host "[INFO] Demarrage de uvicorn (app.main:app) sur le port $Port..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock {
        param($dir, $port)
        Set-Location $dir
        python -m uvicorn app.main:app --port $port
    } -ArgumentList $backendDir, $Port
    $startedByScript = $true
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        if ((curl.exe -s -m 2 "$baseUrl/health") -match '"ok"') {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        Write-Host "[ERREUR] Le backend n'a pas demarre" -ForegroundColor Red
        Remove-Job $job -Force
        exit 1
    }
    Write-Host "[INFO] Backend pret" -ForegroundColor Green
}

try {
    # ---------- 1. Nettoyage + import des regles SOC ----------
    Write-Step "1/7 - IMPORT DES REGLES SOC (fichier Sigma)"
    $rulesListing = Invoke-Api -Method Get -Path "/api/rules"
    foreach ($r in $rulesListing.rules) {
        Invoke-Api -Method Delete -Path "/api/rules/$($r.id)" | Out-Null
    }
    Write-Host "[INFO] Regles precedentes supprimees ($($rulesListing.rules.Count))"

    $form = curl.exe -s -X POST "$baseUrl/api/rules/upload" -H "Authorization: Bearer $Token" -F "file=@$sigmaFile" | ConvertFrom-Json
    Write-Host "[INFO] $($form.message) - $($form.rules.Count) regles analysees"
    $ruleLevels = $form.rules | Group-Object level | ForEach-Object { "$($_.Name):$($_.Count)" }
    Write-Host "[INFO] Repartition par niveau : $($ruleLevels -join '  ')"

    # ---------- 2. Analyse 1 : aucun controle ----------
    Write-Step "2/7 - ANALYSE 1 : SOC SANS CONTROLE ACTIF (baseline)"
    $a1 = Invoke-Api -Method Post -Path "/api/analyses" -Body @{
        name = "1. SOC initial - aucun controle actif"
        controls = @()
        maturity = @{}
        actorIds = @("apt28", "apt29", "lockbit")
    }
    $id1 = $a1.analysis.id
    Write-Host "[RESULTAT] Posture = $($a1.result.postureScore)/100 | Gaps critiques = $($a1.result.criticalGaps.Count) | Techniques = $($a1.result.totalTechniques)"
    $top5 = ($a1.result.criticalGaps | Select-Object -First 5 | ForEach-Object { $_.id }) -join ", "
    Write-Host "[RESULTAT] Gaps critiques TOP 5 : $top5"

    # ---------- 3. Analyse 2 : controles de base ----------
    Write-Step "3/7 - ANALYSE 2 : CONTROLES DE BASE (SIEM + NGFW + anti-phishing)"
    $ctrlBase = @("siem", "ngfw", "anti-phishing", "email-gateway")
    $a2 = Invoke-Api -Method Post -Path "/api/analyses" -Body @{
        name = "2. Controles de base (SIEM, NGFW, anti-phishing)"
        controls = $ctrlBase
        maturity = @{
            siem = "basic"; ngfw = "basic"
            "anti-phishing" = "intermediate"; "email-gateway" = "basic"
        }
        actorIds = @("apt28", "apt29", "lockbit")
    }
    $id2 = $a2.analysis.id
    Write-Host "[RESULTAT] Posture = $($a2.result.postureScore)/100 | Gaps critiques = $($a2.result.criticalGaps.Count)"

    # ---------- 4. Analyse 3 : posture renforcee ----------
    Write-Step "4/7 - ANALYSE 3 : POSTURE RENFORCEE (EDR + SIEM + DLP + MFA + ZTNA + PAM)"
    $ctrlFull = @("edr", "siem", "mfa", "dlp", "vpn-ztna", "pam", "ngfw", "anti-phishing", "email-gateway", "log-aggregation")
    $a3 = Invoke-Api -Method Post -Path "/api/analyses" -Body @{
        name = "3. Posture renforcee (EDR, SIEM, DLP, MFA, ZTNA, PAM)"
        controls = $ctrlFull
        maturity = @{
            edr = "advanced"; siem = "advanced"; mfa = "advanced"; dlp = "intermediate"
            "vpn-ztna" = "advanced"; pam = "intermediate"; ngfw = "intermediate"
            "anti-phishing" = "advanced"; "email-gateway" = "advanced"; "log-aggregation" = "intermediate"
        }
        actorIds = @("apt28", "apt29", "lockbit")
    }
    $id3 = $a3.analysis.id
    Write-Host "[RESULTAT] Posture = $($a3.result.postureScore)/100 | Gaps critiques = $($a3.result.criticalGaps.Count)"

    # ---------- 5. Comparaison ----------
    Write-Step "5/7 - COMPARAISON AVANT / APRES"
    $cmp = Invoke-Api -Method Get -Path "/api/analyses/$id3/compare?base=$id1"
    Write-Host "[COMPARE] Posture : $($cmp.base_posture) -> $($cmp.compare_posture) (delta $($cmp.posture_delta) pts)"
    Write-Host "[COMPARE] Gaps critiques : delta $($cmp.critical_gaps_delta)"
    $resolved = ($cmp.resolved_gaps | Select-Object -First 8) -join ", "
    Write-Host "[COMPARE] Gaps resolus : $resolved"
    $nouv = ($cmp.new_critical_gaps | Select-Object -First 5) -join ", "
    Write-Host "[COMPARE] Nouveaux gaps : $nouv"

    # ---------- 6. Simulations avant / apres ----------
    Write-Step "6/7 - SIMULATION DE CAMPAGNES APT (apt28, lockbit) - $Runs runs, graine $Seed"
    $simBody = @{ actor_ids = @("apt28", "lockbit"); runs = $Runs; seed = $Seed }
    $sim1 = Invoke-Api -Method Post -Path "/api/analyses/$id1/simulate" -Body $simBody
    $sim3 = Invoke-Api -Method Post -Path "/api/analyses/$id3/simulate" -Body $simBody

    Write-Host ""
    Write-Host ("{0,-12} {1,12} {2,12} {3,30} {4,30}" -f "ACTEUR", "SUCCES_AVT", "SUCCES_APR", "CHOKEPOINT_AVT", "CHOKEPOINT_APR")
    for ($i = 0; $i -lt $sim1.simulations.Count; $i++) {
        $s1 = $sim1.simulations[$i]
        $s3 = $sim3.simulations[$i]
        $rate1 = "{0:P0}" -f $s1.success_rate
        $rate3 = "{0:P0}" -f $s3.success_rate
        if ($s1.chokepoint) {
            $cp1 = "$($s1.chokepoint.technique_id) ($($s1.chokepoint.detection_rate))"
        } else {
            $cp1 = "-"
        }
        if ($s3.chokepoint) {
            $cp3 = "$($s3.chokepoint.technique_id) ($($s3.chokepoint.detection_rate))"
        } else {
            $cp3 = "-"
        }
        Write-Host ("{0,-12} {1,12} {2,12} {3,30} {4,30}" -f $s1.actor_id, $rate1, $rate3, $cp1, $cp3)
        $weak = $s3.weak_link
        if ($weak) {
            Write-Host "     + maillon faible restant (apres) : $($weak.technique_id) $($weak.technique_name) - P(detection) = $($weak.detection_probability)" -ForegroundColor Yellow
        }
    }

    # ---------- 7. Exports ----------
    Write-Step "7/7 - EXPORTS (demo-artifacts/)"
    $files = @(
        @{ url = "/api/analyses/$id3/export/navigator"; out = "navigator-posture-renforcee.json" },
        @{ url = "/api/analyses/$id3/export/csv";       out = "scores-posture-renforcee.csv" },
        @{ url = "/api/analyses/$id1/simulation.csv?actors=apt28,lockbit&runs=$Runs&seed=$Seed"; out = "simulation-avant.csv" },
        @{ url = "/api/analyses/$id3/simulation.csv?actors=apt28,lockbit&runs=$Runs&seed=$Seed"; out = "simulation-apres.csv" }
    )
    foreach ($f in $files) {
        $dest = Join-Path $artifacts $f.out
        curl.exe -s -o $dest "$baseUrl$($f.url)" -H "Authorization: Bearer $Token"
        Write-Host "[EXPORT] $($f.out) ($((Get-Item $dest).Length) octets)"
    }

    # ---------- Synthese ----------
    Write-Step "SYNTHESE DE LA DEMO"
    $s1a = $sim1.simulations[0]
    $s3a = $sim3.simulations[0]
    Write-Host "Posture SOC       : $($cmp.base_posture) -> $($cmp.compare_posture) / 100" -ForegroundColor Magenta
    Write-Host "Gaps critiques    : $($a1.result.criticalGaps.Count) -> $($a3.result.criticalGaps.Count)" -ForegroundColor Magenta
    Write-Host ("Taux reussite APT28 : {0:P0} -> {1:P0}" -f $s1a.success_rate, $s3a.success_rate) -ForegroundColor Magenta
    Write-Host ("Taux reussite LockBit : {0:P0} -> {1:P0}" -f $sim1.simulations[1].success_rate, $sim3.simulations[1].success_rate) -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Historique : http://localhost:$Port/docs (3 runs stockes en base)" -ForegroundColor Gray
    Write-Host "Exports : $artifacts" -ForegroundColor Gray
}
finally {
    if ($startedByScript) {
        Write-Host ""
        Write-Host "[INFO] Arret du backend demarre par le script..."
        Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
        Remove-Job $job -ErrorAction SilentlyContinue | Out-Null
    }
}