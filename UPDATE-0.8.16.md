# PV Lab 0.8.16

Aktualizacja zawiera tylko zmiany względem 0.8.15, z zachowaniem podkatalogów. Nie wymaga usuwania plików ani ponownego importu historii. Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież kartę.

- Zmywarka przed pralką w aplikacji i na karcie.
- Domyślnie jeden cykl zmywarki: dziś przy choćby częściowym udziale PV/bilansu; jutro, gdy wszystkie poprawne okna na dziś są w całości płatne albo cykl nie zdąży się zakończyć. Brakujące prognozy pozostają brakiem.
- Bufor przygotowanych statystyk domu, usunięte powtarzane oceny startów i identycznych kolejności. Zachowano dokładność, ceny i zakres alternatyw.
- Świeży wspólny odczyt HA może być użyty ponownie przez 10 sekund. Nie wymuszamy ponownego pobierania historii urządzeń przy każdym kliknięciu karty.

Profile, encje, ograniczenia, zapisane ustawienia i zatwierdzone plany pozostają zachowane. Domyślny wybór formularza niczego nie uruchamia. Gemini bez zmian. Szczegóły w aktualnej instrukcji DOCS.md.
