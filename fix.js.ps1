Set-Location 'C:\Users\30651\Desktop\微调'
$ErrorActionPreference = 'Stop'

$content = [IO.File]::ReadAllText('.\app.js', [Text.Encoding]::UTF8)
$len = $content.Length

# Extract the hardcoded unit char from the already-fixed callHangupMin expression
$m = [regex]::Match($content, 'callHangupMin=x\([^)]+\)')
if (-not $m.Success) { Write-Output 'callHangupMin not found'; exit 1 }
$expr = $m.Value
$cm = [regex]::Match($expr, '\|\|"([^"]+)"\)')
if (-not $cm.Success) { Write-Output 'char not found in callHangupMin'; exit 1 }
$ch = $cm.Groups[1].Value
Write-Output "unit char found"

$fixes = @(
    @('activeMsgMin','activeMsgUnit'),
    @('activeMsgMax','activeMsgUnit'),
    @('letterReplyMin','letterReplyMinUnit'),
    @('letterReplyMax','letterReplyMaxUnit'),
    @('partnerLetterMin','partnerLetterUnit'),
    @('partnerLetterMax','partnerLetterUnit'),
    @('postReplyMin','postReplyUnit'),
    @('postReplyMax','postReplyUnit'),
    @('commentReplyMin','commentReplyUnit'),
    @('commentReplyMax','commentReplyUnit'),
    @('momentMin','momentUnit'),
    @('momentMax','momentUnit'),
    @('statusMin','statusUnit'),
    @('statusMax','statusUnit')
)

$count = 0
foreach ($f in $fixes) {
    $s = $f[0]; $u = $f[1]
    $old = "d.$s=x(parseFloat(this.value)||0,""$ch"",d.$u||""$ch"")"
    $new = "d.$s=x(parseFloat(this.value)||0,d.$u||""$ch"",d.$u||""$ch"")"
    if ($content.Contains($old)) {
        $content = $content.Replace($old, $new)
        $count++
        Write-Output "Fixed: $s"
    } else {
        $chk = "d.$s=x(parseFloat(this.value)||0,d.$u||""$ch"",d.$u||""$ch"")"
        if ($content.Contains($chk)) {
            Write-Output "Already: $s"
        } else {
            Write-Output "NotFound: $s"
        }
    }
}

$bom = New-Object Text.UTF8Encoding $true
[IO.File]::WriteAllText('.\app.js', $content, $bom)
Write-Output "Saved. Fixed: $count"

# Verify
$v = [IO.File]::ReadAllText('.\app.js', [Text.Encoding]::UTF8)
foreach ($f in $fixes) {
    $s = $f[0]; $u = $f[1]
    $chk = "d.$u||""$ch"""
    $bad = ",""$ch"",d.$u"
    $idx = $v.IndexOf("d.$s=x(")
    if ($idx -ge 0) {
        $pc = 0; $end = $idx
        for ($i = $idx; $i -lt $v.Length; $i++) {
            if ($v[$i] -eq '(') { $pc++ }
            if ($v[$i] -eq ')') { $pc--; if ($pc -eq 0) { $end = $i; break } }
        }
        $ex = $v.Substring($idx, $end - $idx + 1)
        $hasBad = $ex.Contains($bad)
        $st = if ($hasBad) { 'BUG' } else { 'OK' }
        Write-Output "$st : $s"
    }
}
