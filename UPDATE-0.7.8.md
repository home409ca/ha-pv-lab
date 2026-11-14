# PV Lab 0.7.8 — zużycie domu, nadwyżka i czytelna skala

Paczka zawiera tylko zmienione pliki względem 0.7.7. Wgraj zawartość do głównego katalogu repozytorium, zachowując strukturę. Niczego nie usuwaj. Po publikacji wydania zaktualizuj aplikację i otwórz panel ponownie.

Na wykresie „Porównanie prognoz i produkcji” wybierz kWh. Dwie nowe linie — „Zużycie domu — baza” oraz „Nadwyżka PV po odjęciu domu” — są domyślnie odznaczone. Można włączyć je niezależnie. Dom oznacza bazę bez wskazanych urządzeń planowanych osobno, zgodnie z Optymalizatorem. Nadwyżka to max(PV − baza, 0) dla pełnej godziny, przed dodatkowymi cyklami. Bieżąca godzina nie oznacza energii pozostałej od teraz; do tego służy planowanie z saldem.

Usunięto stałe rozciąganie skali W do 6000. Przy niskiej produkcji próg falownika nie tworzy pustej przestrzeni. Dla limitu 5500 W próg pojawi się przy produkcji zbliżonej do 5000 W lub 5 kWh w godzinie; ograniczenie obliczeń pozostaje zawsze aktywne.

Nie potrzeba ponownego importu historii ani zmiany ustawień bazy. Instrukcja jest uaktualniona. Dla zmian wystarczy aktualizacja aplikacji; integracja HACS ma zgodny numer 0.7.8.
