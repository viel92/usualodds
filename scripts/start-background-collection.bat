@echo off
REM Lancement collecte historique Phase 1 en arrière-plan
echo Demarrage collecte historique Phase 1...
echo Logs disponibles dans scripts/collection.log

cd /d "C:\USUALODDS\usualodds"

REM Lancer la collecte Phase 1 en arrière-plan
start "UsualOdds Collection Phase 1" node scripts/run-collection.js phase 1

echo.
echo ✅ Collecte Phase 1 demarree en arriere-plan
echo.
echo Pour suivre la progression:
echo   node scripts/run-collection.js status
echo.
echo Pour voir les logs en temps reel:
echo   Get-Content scripts\collection.log -Wait
echo.
echo Duree estimee: ~6 heures (1900 matchs)
echo.
pause