# PV Lab 0.8.1

Wgraj zawartość aktualizacji do głównego katalogu repozytorium z zachowaniem struktury. Zawiera wyłącznie zmienione pliki względem 0.8.0. Niczego nie usuwaj. Zaktualizuj aplikację PV Lab i otwórz panel ponownie. Ponowny import historii nie jest potrzebny. Wersja integracji HACS jest zgodna z aplikacją.

Wykres Prognoz: wybierz miniony dzień i wersję zapisu. W Prognoza a produkcja dostępny jest wybór dnia wykresu i linie źródeł, a także przycisk Odśwież pomiary kWh. Bieżąca niepełna godzina nie udaje pełnego pomiaru. Odczytaj dane wymusza odczyt dostępnych prognoz, pomiarów i statystyk HA, nie czeka na interwał PV Lab.

Domyślnie kwalifikowany profil całości AC wyznacza godzinowy limit po normalizacji bez marginesu, z bezpiecznikiem maksymalnie 75% redukcji. Zachowane są warunki jakości i liczebności. Parametry i dawny tryb łagodny wybierzesz w ustawieniach profilu historycznego. Stare raporty i archiwum Energii pozostają bez zmian.

Pliki i retencja automatycznie pokazują listę i łączny rozmiar kodu oraz danych. Pobierz zapisuje cały wybrany plik. Rozmiar nie obejmuje kontenera, baz HA/InfluxDB ani kopii HA. Prywatne pliki nie są udostępniane. Pełna instrukcja jest w menu aplikacji.
