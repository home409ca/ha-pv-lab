# PV Lab 0.5.2 — aktualizacja przyrostowa z 0.5.1

ZIP pv-lab-update-0.5.2.zip zawiera tylko pliki zmienione lub nowe względem 0.5.1, z zachowaniem katalogów. Rozpakuj i wgraj całą jego zawartość do głównego katalogu istniejącego repozytorium GitHub jednym zatwierdzeniem. Niczego nie usuwaj. Poczekaj na Actions i wydanie v0.5.2, zaktualizuj aplikację i integrację HACS, następnie otwórz PV Lab ponownie. Nie trzeba ponownie importować historii.

## Godziny produkcji

- Prognozy i korekty: tabela godzinowa i wykres prognoz pokazują zakres godzin produkcyjnych, zamiast doby 00–24. Uwzględniamy położenie Słońca oraz rzeczywistą produkcję lub niezerową prognozę. Nie chowamy dziennych zer przy zachmurzeniu ani luk w danych.
- Bieżąca godzina jest zielona, np. o 12:23 podświetlony jest wiersz 12:00–13:00.
- Prognoza a produkcja: nowe nocne zerowe okresy nie są tworzone. Zakończona doba wymaga kompletu godzin produkcyjnych, a nie nocnych zer. Starsze nocne wiersze są ukryte w widoku, pozostając w archiwum do końca zwykłej retencji. Dawnych podsumowań miesięcznych i rocznych bez godzin nie przeliczamy nową metodą.
- Przy nieznanych współrzędnych zachowujemy ostrożne zachowanie, zamiast uznawać brakujące dane dzienne za noc. Poprawne współrzędne są potrzebne do ustalenia świtu i zmierzchu. Nietypowa niezerowa produkcja lub prognoza powyżej 1 Wh może rozszerzyć zakres.

## Efekt historii

- Prognozy i korekty → Wpływ historii na prognozę: wynik PV Lab przed profilem historycznym, wynik końcowy, różnica kWh, liczba zmienionych godzin oraz powód zastosowania albo pominięcia korekty. Porównujemy te same pełne godziny bieżącej krzywej; suma dzisiaj nie jest tym samym co licznik „pomiar + pozostało”.
- Prognoza a produkcja: osobna kolumna „PV Lab przed historią” i karta „Czy historia poprawiła prognozę?”. Porównujemy sumę bezwzględnych błędów obu wariantów na tych samych zakończonych godzinach z pomiarem. Pokazujemy także pogorszenie i brak wpływu, nie zakładamy poprawy.
- Jeśli w archiwum istnieje dokładnie ten wcześniej wydany wariant przed historią, używamy go. Nie rekonstruujemy dawnych prognoz nowym modelem. Bez kompletnych zapisów i pomiarów karta wyjaśnia brak porównania. Dane pojawiają się po zakończeniu odpowiednich godzin produkcji.
- Zasady łagodnej korekty historycznej i jej progi pozostają zgodne z 0.5.1. Ta aktualizacja ujawnia wpływ i pozwala oceniać skuteczność.

## Napięcia i przestoje

- Skala V dopasowuje się do rzeczywistych widocznych odczytów trzech faz z małym marginesem, np. 234–236 V daje zakres 232–238 V. Rzeczywiście niski odczyt nie jest ukrywany. Próg ostrzegawczy rysujemy, jeśli mieści się w skali; jego wartość jest zawsze w opisie.
- Próbki wymagające uwagi obejmują dzienne odczyty. Nocny postój PV nie zaśmieca listy.

Archiwum, ustawienia i kalibracja pozostają zachowane. Nowe porównanie skuteczności historii jest również agregowane do podsumowań dni, miesięcy i lat.
