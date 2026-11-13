# PV Lab — pierwsze kroki

1. Uruchom aplikację i włącz **Pokaż w panelu bocznym**.
2. W **Ustawieniach** sprawdź parametry instalacji, współrzędne, encje wejściowe i ograniczenia falownika. Domyślne parametry odpowiadają uzgodnionej instalacji; można je zmienić.
3. W **Źródłach danych** sprawdź odczyty Forecast.Solar, Open-Meteo i Solcast. Prognoza każdego dostawcy powinna obejmować obie połacie, bez dublowania tej samej instalacji.
4. W **Prognozach** porównasz dostawców z wynikiem PV Lab, zobaczysz energię godzina po godzinie i pięć najlepszych okien dla 1, 2 oraz 3 godzin. Objaśnienia znajdziesz przy nagłówkach i pod tabelami.
5. Poczekaj na zakończone przedziały z pomiarami i prognozami zapisanymi przed produkcją. Na ich podstawie powstają korekty dostawców i raporty. Import dawnej produkcji nie odtwarza dawnych prognoz.

## Historyczny potencjał

W ustawieniach potwierdź właściwe statystyki energii AC/DC dla całego falownika i połaci, oznaczając oszacowany podział energii. Następnie wybierz **Historyczny potencjał → Odczytaj całą historię HA**, poczekaj na zakończenie i kliknij **Pokaż profil dnia**.

Wykresy pokazują rzeczywistą produkcję wybranego dnia, rekord, wysoki percentyl, medianę i przybliżony model bezchmurnego nieba. Profil wstępny może działać od 10 jasnych, kompletnych dni i domyślnie co najmniej 2 niezależnych sezonów rocznych. Wpływ rośnie stopniowo; docelowo 30 dni oznacza profil dojrzały. Ustawienie liczby dni jest w konfiguracji. W nocy korekta nie dotyczy. To wskaźnik jakości danych, a nie dowód fizycznego zacienienia.

Pomiar wykluczony z uczenia pozostaje widoczny jako produkcja rzeczywista i jest oznaczony gwiazdką. Kreska oznacza brak zaimportowanej energii tej konkretnej godziny. Korekta końcowej prognozy używa potwierdzonego licznika AC całości. Nie sumujemy niezależnych rekordów połaci. Po pierwszym imporcie ostatni tydzień może być uzupełniany raz na dobę.

## Profile i planowanie urządzeń

W **Ustawieniach** dodaj urządzenie, wskaż encję mocy W/kW i opcjonalnie energii Wh/kWh. W **Profilach urządzeń** odczytaj historię, wybierz cykle odpowiedniego programu i zapisz profil typowy, średni lub najbardziej energochłonny. Kolejne odczyty dołączają cykle bez powtórzeń. Dla pracy ciągłej, np. klimatyzacji lub pompy ciepła, wybierz stałe okna obserwacji.

W **Planowaniu urządzenia** wybierz profil albo ręczne zapotrzebowanie i czas pracy. Ustaw zużycie bazowe domu oraz tryb bilansowania: godzinowy, kwadransowy lub bez bilansowania czasowego. Osobne saldo godzinowe ma pierwszeństwo; nie jest ponownie bilansowane licznikami importu i eksportu. Aplikacja proponuje godziny, ale nie uruchamia urządzeń automatycznie.

## Napięcia, dane i integracja

Limit falownika domyślnie wynosi **5500 W**. Próg **253 V** służy oznaczaniu danych i ochronie kalibracji, nie sterowaniu zabezpieczeniami. Szczegółowe napięcia domyślnie nie są zapisywane na dysku; pozostają flagi jakości. Pliki, retencję i eksport znajdziesz w **Pliki i retencja**.

Zmiana parametrów modelu rozpoczyna nową kalibrację. Sama retencja, ustawienia profilu historycznego i kanały statystyk jej nie zerują. Dane demonstracyjne nie są pomiarami i nie służą uczeniu instalacji; aby wrócić do własnych danych, wybierz **Wróć do danych rzeczywistych**.

Encje oraz przebieg dla panelu Energia dostarcza osobna integracja **PV Lab**, instalowana przez HACS albo z katalogu `custom_components/pv_lab`. Po instalacji uruchom ponownie HA i dodaj integrację. Adres aplikacji, klucz parowania i diagnostykę znajdziesz w **Integracja HA**. W panelu Energia zachowaj rzeczywisty licznik produkcji i wybierz PV Lab jako źródło prognozy.

Aktualizuj zarówno aplikację, jak i integrację. Pełna paczka `pv-lab-update` zawiera obie części oraz pliki GitHub Actions. Interfejs używa adresów plików z numerem wydania; po aktualizacji zamknij starą kartę i otwórz PV Lab ponownie.

## Widoczny efekt korekt

W Prognozach i korektach karta **Wpływ historii na prognozę** pokazuje wynik przed i po profilu oraz różnicę. W **Prognoza a produkcja → Czy historia poprawiła prognozę?** sprawdzisz rzeczywiste błędy obu wariantów na wspólnych zakończonych godzinach. Sama zmiana prognozy nie dowodzi poprawy trafności. Nocne zerowe okresy są pomijane, a bieżąca godzina w tabeli prognozy jest wyróżniona na zielono. Napięcia mają skalę dopasowaną do odczytów, a lista próbek wymagających uwagi obejmuje godziny dzienne.


### Trwałe prognozy w panelu Energia

Od wersji 0.5.4 plik `/data/energy-forecast-archive.json` przechowuje godzinowe prognozy PV Lab dla panelu Energia. Aplikacja nigdy nie usuwa ich automatycznie: retencja dzienników, import statystyk i zmiana ustawień nie kasują tego archiwum. Plik jest widoczny w przeglądarce plików aplikacji oraz w eksporcie kopii danych. Zabezpiecz katalog danych kopią zapasową HA — usunięcie danych dodatku usuwa też archiwum.

Dla zakończonej godziny zachowujemy ostatnią kompletną prognozę zapisaną przed jej początkiem. Nie zastępujemy jej produkcją rzeczywistą ani wynikiem późniejszego modelu. Godziny bieżące i przyszłe są aktualizowane. Czasy zapisujemy w UTC, więc zmiana czasu nie łączy dwóch różnych godzin.

Pierwsze uruchomienie odzyskuje dostępne wcześniejsze prognozy z zachowanych dzienników `published` (domyślnie 14 dni). Brakujących, wcześniej niezapisanych prognoz nie odtwarzamy. Trwała historia jest przekazywana osobnej integracji PV Lab — zaktualizuj również ją w HACS i uruchom ponownie HA. Nie wymaga nowej bazy danych.
