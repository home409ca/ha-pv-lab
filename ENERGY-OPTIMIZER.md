# Optymalizator zużycia energii — analiza architektury i zasady

PV Lab używa Node.js i natywnych modułów ES; serwer HTTP działa za Ingress Home Assistant. Frontend to HTML/CSS/JavaScript bez dodatkowego frameworka. Integracja HA jest napisana w Pythonie. Trwałe dane są zapisywane atomowo do JSON/JSONL w /data; nie dodajemy bazy danych.

Wspólne źródła: cachedForecast.fullRows to końcowa prognoza PV co 15 minut; appliance-profiles.json zawiera rzeczywiste przebiegi urządzeń co 5 minut; istniejący planner.mjs odczytuje saldo bieżącego okresu. HA.states zapewnia jeden wspólny odczyt aktualnych encji. model.ensembleScores przechowuje błędy wcześniej opublikowanych prognoz według horyzontu. Historia AC/Influx i profile urządzeń pozostają źródłem prawdy.

Nowa warstwa: optimizer-settings.mjs (walidacja), optimizer-tariff.mjs (strefy, ceny), optimizer-load.mjs (oczyszczone zużycie bazowe), optimizer.mjs (bilans, koszt, rekomendacje i wspólny harmonogram), optimizer-history.mjs (zapis planów i weryfikacja). Osobne API /api/optimizer; rekomendacje tylko do odczytu w /api/integration.

Brakujące dane użytkownika: aktualne brutto stawki energii i dystrybucji, RCEm oraz ewentualna prognoza RCEm. Nie wstawiamy przykładowych cen jako rzeczywistych. Bez cen moduł pokaże listę braków zamiast pozornej opłacalności. Saldo depozytu, jego wygasanie i faktury nie są modelowane; wartość eksportu jest nominalnym kosztem utraconej możliwości. Prognoza RCEm musi być dostarczona przez użytkownika/encję; przeniesienie ostatniej ceny jest oznaczonym założeniem, nie prognozą rynku.

Bazowy pobór domu można prognozować wyłącznie z danych po odjęciu monitorowanych urządzeń. Jeżeli brakuje historii któregokolwiek odejmowanego urządzenia, przedział jest pomijany. Sama stara historia mocy całego domu z InfluxDB nie staje się automatycznie profilem bazowym — mogłaby liczyć pralkę/zmywarkę dwukrotnie. Wtedy używana jest jawna stała rezerwa z istniejącego planowania.

Koszt jest różnicą pełnego rozliczenia domu z urządzeniem i bez niego. Bilansowanie godzinowe zamyka energię w obrębie godziny; nie jest magazynem przenoszącym energię dalej. Wariant bez bilansowania korzysta z rozdzielczości prognozy PV i profilu, nie udaje sekundowej symulacji. Wspólny harmonogram powstaje przez planowanie priorytetowe i poprawki współrzędnych; jest heurystyką, bez gwarancji globalnego minimum.

Tryb wyłącznie analityczny. Żadna akcja modułu nie uruchamia urządzeń, nie zmienia stanu gniazdek ani nie odcina zasilania.

Źródła zasad (sprawdzone 13.11.2026):
- PGE, przewodnik grup taryfowych: https://www.gkpge.pl/dla-domu/strefa-klienta/aktualnosci/przewodnik-po-wyborze-grupy-taryfowej-energii-dla-domu
- PGE Dystrybucja, taryfa 2026: https://pgedystrybucja.pl/taryfa
- PGE, net-billing i współczynnik depozytu: https://www.gkpge.pl/dla-domu/strefa-klienta/przewodnik-prosumenta/pytania-i-odpowiedzi
- Dni wolne: https://eli.gov.pl/api/acts/DU/2025/296/text/T/D20250296L.pdf

Domyślne godziny PGE G12w są sezonowe: lato IV–IX 15–17 i 22–6; zima X–III 13–15 i 22–6, weekendy i święta w taniej strefie. Można je zmienić zgodnie z umową i licznikiem. Wigilia jest świętem od 2025 r. Daty lokalne, powtórzone godziny i zmiana czasu zachowują odrębne znaczniki UTC.
