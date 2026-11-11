Aktualizacja wykresu porównującego trzech dostawców i PV Lab: [0.2.4](UPDATE-0.2.4.md).

# PV Lab 0.2

Integracja **0.2.2** poprawia widoczność PV Lab w wyborze prognozy Energii. [Poprawka Energii](ENERGY-FIX-0.2.2.md). Obsługuje instalację z HACS. Aplikacja obliczeniowa **0.2.4** dodaje tabelę godzinową, czytelne wykresy, diagnostykę kalibracji i podłączenia do Energii. [Aktualizacja 0.2.3](UPDATE-0.2.3.md). [Poprawka importu statystyk](STATISTICS-FIX.md) · [Instalacja HACS](HACS-INSTALL.md).

Lokalna analiza produkcji i kalibracja prognoz PV dla Home Assistant, bez AI i bez dodatkowej bazy danych.

- Panel WWW przez Ingress: prognozy dostawców, korekty, wagi i historia zmian.
- Najlepsze ciągłe okna 2 h i 3 h z sumą kWh.
- Integracja HA: prognozy, okna i daty zmian jako encje oraz przebieg dla Energii.
- Statystyki historyczne z HA przez API, bez SQL.
- Surowe napięcia domyślnie nie są zapisywane; zachowywane są flagi jakości.

**[Instalacja, aktualizacja i instrukcja obsługi](GUIDE.md)**

**[Krytyczna ocena załączonego podsumowania](REVIEW.md)**

W głównym katalogu repozytorium mają być `repository.yaml`, `pv_lab/` i `custom_components/`. Katalog aplikacji `pv_lab/` instalujesz przez sklep aplikacji HA. Integrację `custom_components/pv_lab/` kopiujesz osobno do `/config/custom_components/pv_lab/`, następnie restartujesz HA i dodajesz integrację PV Lab w interfejsie.

Wersja eksperymentalna. Obliczenia i kontrakty są testowane lokalnie; pierwsze uruchomienie na rzeczywistym HA i dostępność formatów Twoich integracji wymagają potwierdzenia. Brak gwarancji poprawy dokładności — panel pokazuje porównania, które mają ją sprawdzić.
