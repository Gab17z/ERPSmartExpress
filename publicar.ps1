param([string]$msg = "")

if (-not $msg) {
    Write-Host "Informe a mensagem do que foi alterado!" -ForegroundColor Red
    Write-Host "Uso: npm run publicar -- `"Descricao das alteracoes`"" -ForegroundColor Yellow
    exit 1
}

# Garantir que estamos no develop
git checkout develop 2>$null

Write-Host "Salvando alteracoes no develop..." -ForegroundColor Cyan
git add -u
git add src public *.json *.html *.js *.jsx *.ts *.tsx *.css *.md publicar.ps1 2>$null
git commit -m $msg

if ($LASTEXITCODE -ne 0) {
    Write-Host "Nenhuma alteracao para salvar, continuando mesmo assim..." -ForegroundColor Yellow
}

Write-Host "Publicando no main..." -ForegroundColor Green
git checkout main
git pull origin main --no-edit
git merge develop --no-edit
git push origin main

Write-Host "Voltando para develop..." -ForegroundColor Cyan
git checkout develop

Write-Host ""
Write-Host "Publicado com sucesso! A Vercel vai atualizar em 1-2 minutos." -ForegroundColor Green
