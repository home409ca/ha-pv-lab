# PV Lab 0.5.0

Aplikacja i integracja Home Assistant do korekty prognoz PV, raportów i planowania odbiorników. Bez AI i nowej bazy danych.

Nowe: profile pracy pralki i zmywarki z historii HA, wybór cykli, trzy warianty profilu, ręczna korekta faz i wybór w WWW/HA. Zachowano raporty, bilansowanie i okna 1/2/3 h z 0.3.0.

## Aktualizacja

Wgraj całą zawartość `pv-lab-update-0.5.0.zip` do głównego katalogu repozytorium w jednym zatwierdzeniu, także `.github/` i `scripts/`. GitHub sam przetestuje kod i opublikuje numerowane wydanie v0.5.0. Bez zewnętrznych Actions i bez osobnego tokenu.

Poczekaj na pomyślne zadanie Publish PV Lab version i wydanie w Releases. Odśwież HACS, zaktualizuj aplikację oraz integrację do 0.5.0, uruchom ponownie cały HA i odśwież WWW. Numer wydania będzie widoczny przed instalacją; sam tekst przycisku ustala HACS. Domyślna gałąź jest ukryta.

[Pełna instrukcja 0.5.0](UPDATE-0.5.0.md) · [Funkcje 0.3.0](UPDATE-0.3.0.md) · [Przewodnik](GUIDE.md) · [Testy](VALIDATION.md).

## Pierwszy profil

Profile urządzeń → Pralka/Zmywarka → Odczytaj historię → wybierz cykle tego samego programu → nazwij i zapisz profil → Użyj w planowaniu PV. Domyślnie ustawiono wskazane encje mocy i energii użytkownika; pełne identyfikatory są w instrukcji.

Wymagana jest szczegółowa historia mocy w Recorder. Same dobowe kWh nie odtworzą faz pracy. Progi można zmienić w Ustawieniach. Profil z jednego cyklu jest wstępny i nie gwarantuje przyszłego poboru.

## Dane

Dane pozostają w /data: ustawienia, model, raporty i pochodne profile. Surowa historia urządzeń jest odczytywana z HA tylko na czas analizy. Dane i kalibracja nie są kasowane. Nie publikuj katalogu /data, klucza parowania ani eksportu w GitHub.
