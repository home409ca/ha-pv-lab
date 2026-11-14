# PV Lab 0.7.6 — naprawa wykresu Energii

Tylko zmienione pliki względem 0.7.5. Wgraj zawartość do głównego katalogu repozytorium, zachowując podfoldery. Niczego nie usuwaj. Po publikacji wydania zaktualizuj aplikację i otwórz panel ponownie.

W „Prognozach” → „PV Lab a panel Energia” widać już linie prognozy godzinowej. Przyczyną pustego wykresu było traktowanie godzinnych odstępów jak luk w danych o krótszej rozdzielczości.

Nie ma przycisku ręcznego odczytu. Porównanie korzysta od razu z prognozy udostępnianej integracji HACS. Dodatkowa kontrola tego, co odebrał HA, działa automatycznie w tle najwyżej raz na minutę. Nie wymusza odświeżenia dostawców ani nie blokuje lokalnego widoku przy braku łączności.

Prognoza i archiwum nie zmieniają się. Nie trzeba ponawiać importu. Dla poprawki wystarczy aktualizacja aplikacji; integracja ma zgodny numer 0.7.6. Pełna instrukcja jest uaktualniona.
