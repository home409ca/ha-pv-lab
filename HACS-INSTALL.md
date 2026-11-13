# PV Lab i HACS

Dodaj repozytorium jako niestandardową integrację HACS. Pliki integracji są w `custom_components/pv_lab`. Numer dostępnej wersji pochodzi z opublikowanego wydania GitHub Release; sam numer w manifest.json nie wystarcza. Po wgraniu aktualizacji sprawdź zielony wynik „Publish PV Lab version” w Actions i odśwież informacje repozytorium w HACS.

Plik hacs.json zawiera render_readme:true, więc opis integracji jest pobierany z README.md. Numerowane wydania są niezmienne — poprawki wymagają kolejnej wersji.

Aplikację aktualizuj osobno w sklepie dodatków HA. Po aktualizacji integracji uruchom ponownie HA. Nie usuwaj integracji ani jej ustawień przy zwykłej aktualizacji.
