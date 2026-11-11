# PV Lab 0.4.0 i HACS

Wgraj pełną paczkę do głównego katalogu repozytorium, także .github/ i scripts/. Po pomyślnym zadaniu Publish PV Lab version pojawi się wydanie v0.4.0. Odśwież HACS i zaktualizuj integrację. Aplikację aktualizuje się osobno w sklepie aplikacji HA. Następnie uruchom ponownie cały HA.

Workflow używa tylko run, bez zewnętrznych Actions. Job deklaruje contents:write; ustawienia domyślne read-only i wyłączone tworzenie PR-ów są odpowiednie. Osobny token nie jest potrzebny.

Osobna paczka pv-lab-hacs-0.4.0.zip zawiera wyłącznie integrację i nie wystarcza do skonfigurowania publikacji. Repozytorium aktualizuj pełną paczką pv-lab-update-0.4.0.zip.

[Instrukcja](UPDATE-0.4.0.md). Źródła: [wydania HACS](https://www.hacs.xyz/docs/publish/integration/#github-releases-optional), [uprawnienia GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions), [API wydań](https://docs.github.com/en/rest/releases/releases).
