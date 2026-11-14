# PV Lab 0.7.5 — podgląd eksportu do Energii

Tylko zmienione pliki względem 0.7.4. Wgraj zawartość do głównego katalogu repozytorium, zachowaj podfoldery i niczego nie usuwaj. Po publikacji wydania zaktualizuj aplikację i otwórz panel ponownie. Dla nowego widoku wystarczy aktualizacja aplikacji; integracja ma zgodny numer 0.7.5.

W „Prognozach” wybierz dzień nad wykresem. Pod istniejącą tabelą godzinową znajdziesz „PV Lab a panel Energia”. Porównaj aktualne PV Lab i przekazywane do Energii w kWh, różnice, wersję i moment zapisu. Użyj „Odczytaj prognozę z Home Assistant”, aby sprawdzić także odebrane dane platformy Energia. Ta operacja nie zmienia preferencji HA i nie odświeża przymusowo integracji.

Pełne godziny pokazano jawnie z UTC. Dymek wykresu HA nie definiuje okresu źródłowego; jego wygląd zależy od wersji interfejsu. Nie przesuwamy danych o pół godziny. Archiwum pozostaje bez zmian i nie jest kasowane; import historii nie jest potrzebny. Instrukcja opisuje nowy widok i różnice między mocą kwadransową, energią godzinową oraz starszymi zapisami.
