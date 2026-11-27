# PV Lab 0.10.4 — remis planów i zaplanowane uruchomienie

Wgraj pliki aktualizacji do głównego katalogu repozytorium z zachowaniem podkatalogów. Zbiorcza paczka zawiera wyłącznie zmienione pliki względem 0.10.0, również naprawy 0.10.1–0.10.3 dla częściowych aktualizacji. Nie wymaga usuwania danych ani plików.

1. Poczekaj na zielone Actions → Publish PV Lab version.
2. Zaktualizuj aplikację PV Lab do 0.10.4 w HA.
3. Zaktualizuj integrację HACS do 0.10.4 i uruchom ponownie Home Assistant.
4. Odśwież dashboard. Ponownie naciśnij Zaplanuj, aby ocenić nowe propozycje. Zatwierdzony plan nie zmienia godzin od samej aktualizacji.

Przy tej samej cenie do grosza, pełnym zakupie energii i takim samym koszcie gorszej pogody wcześniejszy start taniej strefy wygrywa np. z 13:15. Przygotowanie Auto i progi zmiany już zatwierdzonych terminów pozostają bez zmian.

Nowa encja: binary_sensor.pv_lab_zaplanowane_uruchomienie. On oznacza oczekiwanie na co najmniej jedno uzbrojone polecenie włączenia; po wysłaniu wszystkich poleceń lub anulowaniu jest Off. Faktyczną pracę nadal pokazują osobne encje urządzeń. Dane nieaktualne oznaczają niedostępność, a nie pewne Off. YAML karty bez zmian.
