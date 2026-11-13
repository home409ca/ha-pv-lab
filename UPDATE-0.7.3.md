# PV Lab 0.7.3

Wgraj zawartość tej paczki do głównego katalogu repozytorium, zachowując podfoldery. To wyłącznie zmienione pliki względem 0.7.2; niczego nie usuwaj. Po udanym wydaniu GitHub zaktualizuj aplikację i otwórz panel ponownie.

Instrukcja jest dostępna z bocznego menu i w dokumentacji aplikacji HA. W optymalizatorze kliknij „Przelicz symulację”: powinien ponowić odczyt HA i pokazać moc domu lub konkretną przyczynę braku.

Jeśli stara encja domu już nie istnieje, nowy domyślny pomiar sieci to sensor.grid_power_total_historia, plus import, minus eksport. Przy dostępnej mocy PV dom obliczamy z bilansu. Własnych skonfigurowanych pomiarów sieci nie nadpisujemy. Nie zamieniamy braku PV na zero.

Wybierz „Historia oczyszczonego zużycia”, zapisz i odczytaj historię bazy. Sprawdź liczniki importu i tabelę źródła kwadransów. Dostępne: stany HA, InfluxDB oraz statystyki energii HA z wielu lat. Ta ostatnia metoda wymaga poprawnych przyrostów produkcji/importu/eksportu i energii wszystkich odejmowanych urządzeń; bez nich nie udajemy oczyszczonej bazy. Godzinowe przyrosty nie są pomiarami kwadransowymi.

Integracja HACS ma zgodny numer 0.7.3; same poprawki panelu i importu działają po aktualizacji aplikacji.
