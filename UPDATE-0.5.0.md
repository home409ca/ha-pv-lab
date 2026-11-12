# PV Lab 0.5.0

Wgraj całą zawartość ZIP do głównego katalogu repozytorium, razem z .github i scripts, jednym zatwierdzeniem. Poczekaj na poprawne zakończenie Actions i wydanie v0.5.0. Zaktualizuj aplikację i integrację HACS; uruchom ponownie HA. Zmiana nie zeruje dotychczasowej kalibracji.

## Pierwsze uruchomienie analizy

1. W PV Lab → Ustawienia sprawdź współrzędne i potwierdź właściwe statystyki energii dla całości, PV1 i PV2, wraz z AC/DC oraz informacją o oszacowaniu. Nie potwierdzamy za użytkownika liczników połaci. sensor.energia_czynna_pv1 z omawianego podziału AC należy oznaczyć jako AC i oszacowanie. Dla PV2 należy sprawdzić analogiczne pochodzenie.
2. Wskaż początek okresu zgodnego z obecną instalacją i wyklucz znane okresy awarii, śniegu, rozbudowy itp. Nie znamy dokładnego okresu usterki optymalizatora w 2023, więc nie zgadujemy dat wykluczenia.
3. Otwórz Historyczny potencjał → Odczytaj całą historię HA. Aplikacja najpierw ustala początek historii przez statystyki miesięczne, następnie pobiera godzinowe przyrosty energii po 30 dni. Można też wybrać ograniczony zakres na stronie Historia i trendy.
4. Po zakończeniu wybierz datę odniesienia i Pokaż profil dnia. Starszy import podsumowań trzeba powtórzyć: nie przechowywał godzin potrzebnych do percentyli. Po pierwszym imporcie ostatnie 7 dni są automatycznie uzupełniane raz na dobę; można wyłączyć tę opcję. Powtórny import nie dubluje godzin i zachowuje wcześniejsze okresy.

## Wyniki

Osobne wykresy i tabele PV1, PV2 i całego falownika: rzeczywista produkcja wybranego dnia (jeśli zaimportowana), maksimum, 95. percentyl, mediana, model bezchmurnego nieba i wysoki poziom po normalizacji. Przy każdej godzinie liczba dni/lat, liczba wstępnie jasnych dni, odchylenie od modelu oraz przyczyna gotowości albo blokady korekty. Rekordy godzin mogą pochodzić z różnych dni i nie tworzą rekordu dobowego. Całość wyliczamy z jej własnego licznika, nigdy z sumy niezależnych maksimów połaci.

Domyślnie porównujemy 31 dni wokół daty ze wszystkich zaimportowanych lat. Okno jest konfigurowalne (7–91 dni, nieparzyste). Dopasowanie według czasu słonecznego ogranicza wpływ zmiany czasu; prezentacja pozostaje w czasie HA, z rozróżnieniem powtórzonej godziny. Zwykłe percentyle i maksimum pokazują pełną zgodną historię. Znormalizowany wysoki poziom uwzględnia wiek danych: połowa wagi po 3 latach.

## Korekta

Korekta końcowej prognozy wykorzystuje potwierdzony licznik AC całej instalacji. Profile połaci są diagnostyką; nie przypisujemy dostawcom rozbicia na połacie, którego nie udostępniają. Wymagane domyślnie 30 jasnych, kompletnych dni z co najmniej 2 niezależnych sezonów rocznych. Jasny dzień to heurystyka: wszystkie pełne godziny i co najmniej 60% energii modelu. Dane ze znanymi problemami są wykluczane, a nocny stan czuwania i normalne ograniczenie 5500 W nie dyskwalifikują profilu osiągalnej produkcji.

Sprawdzamy już skalibrowany wynik PV Lab, po korekcie bieżącej. Jeśli przekracza znormalizowany wysoki poziom z marginesem 15%, stosujemy łagodne zmniejszenie zależne od liczby obserwacji, maksymalnie 25%. Wynik poniżej odniesienia pozostaje bez zmian. Nie mnożymy ponownie przez wyliczoną procentową stratę. Nie podwyższamy prognozy pochmurnego dnia do rekordu. To nie jest twardy limit historyczny; fizyczny limit falownika pozostaje osobno.

Przed i po korekcie zapisujemy rzeczywiście wydane warianty prognozy. Ocena skuteczności pojawi się po zakończeniu nowych okresów produkcji; nie przeliczamy dawnych prognoz nową metodą.

## Przechowywanie i ograniczenia

/data/historical-energy.json: tylko identyfikatory źródeł, typ AC/DC, znaczniki czasu godzin, przyrosty kWh i krótka flaga jakości; bez stanów liczników i surowych napięć. Plik pozostaje do wykorzystania w kolejnych latach i jest w eksporcie. /data/statistics.json zawiera podsumowania, a nie nową bazę danych. Bieżąca retencja napięć pozostaje bez zmian.

Model odniesienia jest uproszczony, bez rzeczywistej temperatury, zmętnienia atmosfery i śniegu. Nieznana historyczna jakość napięcia/statusu jest jawnie oznaczona. Różnica od modelu nie dowodzi zacienienia. Po zmianie geometrii instalacji profil przestaje korygować do ponownego importu; ustaw wtedy właściwy początek zgodnego okresu.

Położenie Słońca jest pokazane czytelnie, np. „Kierunek 140–160° od północy · wysokość 10–20°”, zamiast 7:1.

Interfejs ma wersjonowane adresy wszystkich modułów i stylów oraz stronę startową bez cache. Po pierwszym przejściu ze starej wersji może być potrzebne zamknięcie starej karty i ponowne otwarcie PV Lab. Następne wydania pobiorą pliki pod nowym adresem wersji.
