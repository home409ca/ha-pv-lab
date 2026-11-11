# PV Lab 0.3.0

Lokalna aplikacja i integracja Home Assistant do analizy, korekty i oceny prognoz PV. Bez AI, SQL i nowej bazy danych. Aplikacja **0.3.0**, integracja **0.3.0**.

## Nowe w tej wersji

- Raport **Prognoza a produkcja**: rzeczywista energia, PV Lab i trzej dostawcy, błędy oraz ranking na wspólnych okresach.
- Oddzielnie plan na jutro znany przed 20:00 i prognoza bieżąca znana przed godziną. Godzinę zapisania planu można zmienić.
- Archiwum raportów: godziny 7 dni, dni 30 dni, miesiące bieżący + 11 poprzednich, starsze dane rocznie. Błędy i liczby porównań pozostają po agregacji.
- Najlepsze ciągłe okna 1/2/3 h, początki co 15 minut, dla dziś i jutra oraz opcjonalnie dalszych dni.
- Wieczorem pozostała energia i energie okien wynoszą zero. Całodzienny wynik pozostaje końcową produkcją. Data nieistniejącego okna ma stan nieznany, obok dostępna jest osobna encja statusu.
- Jeden plan urządzenia: energia, czas pracy, rezerwa domu, zakres dat, trzy tryby bilansowania, trzy najlepsze alternatywy.
- Edytowalne pola planu także jako encje number/select/datetime w HA. Rekomendacja, pokrycie i saldo jako sensory.

## Aktualizacja

Wgraj **zawartość** `pv-lab-update-0.3.0.zip` do głównego katalogu istniejącego repozytorium GitHub. W głównym katalogu mają być `repository.yaml`, `hacs.json`, `pv_lab/` i `custom_components/` — bez dodatkowego katalogu nadrzędnego.

1. Zaktualizuj aplikację w sklepie aplikacji HA do **0.3.0**.
2. W HACS odśwież i zaktualizuj integrację PV Lab do **0.3.0** (lub pobierz ponownie najnowszą gałąź).
3. Uruchom ponownie **cały Home Assistant** i odśwież panel WWW.

Nie usuwaj aplikacji, integracji ani `/data`. Zachowujemy ustawienia, dotychczasowy model, identyfikatory istniejących encji i klucz parowania. Nowe ustawienia są uzupełniane automatycznie. Zmiana parametrów instalacji lub jakości nadal może rozpocząć nową kalibrację; edycja planowania, bilansu i godziny raportów jej nie resetuje.

Szczegóły: [instrukcja 0.3.0](UPDATE-0.3.0.md), [przewodnik](GUIDE.md), [HACS](HACS-INSTALL.md), [testy i ograniczenia](VALIDATION.md).

## Parametry Twojej instalacji

PV1: 11 × 410 Wp = 4510 Wp, nachylenie 30°, azymut 220° od północy. PV2: 7 × 410 Wp = 2870 Wp, nachylenie 30°, azymut 130°. Limit Huawei: 5500 W. Parametry można edytować w panelu.

## Dane i dostęp

Pliki w trwałym katalogu `/data`: ustawienia, model, dzienniki pomiarów i prognoz, `reports.json` oraz niewielki cache końcowych wyników dobowych `daily-final.json`. Brak dodatkowego serwera bazy danych. Szczegółowe napięcia domyślnie nie trafiają na dysk; zachowujemy oznaczenia jakości.

Panel jest dostępny przez Ingress. Klucz integracji umożliwia odczyt wyników i zmianę wyłącznie wejść planu urządzenia; nie umożliwia zmiany instalacji ani sterowania urządzeniami. Nie umieszczaj klucza, eksportu danych ani katalogu `/data` w GitHub.
