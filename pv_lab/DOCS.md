# PV Lab — pełna instrukcja użytkownika

<!-- pv-lab-manual-version: 0.10.3 -->

**Wersja aplikacji i instrukcji: 0.10.3.** Instrukcja opisuje obecny kod, również warunki braku wyniku. Wartości domyślne można zmienić.

## 1. Cel i zasada działania

PV Lab tworzy jedną prognozę produkcji AC z prognoz dostawców, pomiarów i historii. Silnik prognoz używa reguł i statystyk, bez AI. Opcjonalna Analiza AI jest osobnym doradcą i nie zmienia wyników. Wynik trafia do wykresów, planowania, optymalizatora i integracji HA. Samo obliczenie nie steruje urządzeniami. Nowe zatwierdzenie na karcie HA może uzbroić polecenia włączenia skonfigurowanych switchy; zabezpieczenia instalacji pozostają poza PV Lab. Nie prognozuje napięcia w woltach.

| Element | Wpływ na końcową prognozę PV |
| --- | --- |
| Dane dostawców i limit falownika | Tak — podstawa oraz fizyczne ograniczenie. |
| Kalibracja i wagi źródeł | Tak — poprawiają powtarzalny błąd i ustalają udział dostawców. |
| Świeża produkcja | Tak — dostosowuje najbliższy okres, ze słabnącym wpływem. |
| Historyczny potencjał całości AC | Tak, po kwalifikacji — ogranicza wynik godzinowy według poziomu po normalizacji. |
| Ostrożniejsza prognoza na jutro | Tak — po ryzyku sieci; wyłącznie obniża następną dobę, gdy wcześniejsza ocena uzasadnia źródło odniesienia. |
| Ryzyko przestojów | Tak, po kwalifikacji — odejmuje oczekiwaną stratę. |
| Panele i zacienienie | Diagnostyka; nie jest dodatkowym mnożnikiem prognozy. |
| Historia i trendy | Widok opisowy; te same dane mogą zasilać kwalifikowany potencjał. |
| Raport porównań | Ocenia wcześniejsze wyniki, nie zmienia przeszłości. |
| Profile urządzeń, zużycie domu, ceny | Zmieniają rekomendacje uruchomienia, nie produkcję PV. |
| Analiza AI | Wyłącznie raport doradczy; nie zmienia żadnych obliczeń ani urządzeń. |
| Ukrycie linii wykresu | Tylko wygląd, bez wyłączenia źródła z obliczeń. |

**Historia produkcji** to pomiary. **Historia prognoz** to zapowiedzi znane przed produkcją. **Historia ocen** to ich porównania. Import lat produkcji nie tworzy lat ocen prognoz. Data aktualizacji pliku dostawcy nie zawsze potwierdza czas wydania każdej historycznej wartości.

## 2. Uruchomienie i podstawowe pojęcia

1. Sprawdź wersję aplikacji i integracji HACS — są aktualizowane oddzielnie.
2. W Ustawieniach sprawdź lokalizację, strefę, połacie, limit i encje.
3. W Źródłach sprawdź przebiegi dostawców. Sama suma dobowa nie wystarcza do określenia godzin.
4. Potwierdź licznik rzeczywistej energii AC i zaimportuj statystyki. Opcjonalnie sprawdź encje i historię InfluxDB.
5. Poczekaj na pełne poprawne przedziały produkcji, aby uzyskać pierwsze oceny prognoz.
6. Skonfiguruj bilans, profile urządzeń, a dla optymalizatora również bazę domu i ceny.
7. Podepnij platformę prognozy PV Lab do Energii, pozostawiając prawidłowy licznik rzeczywistej produkcji.

Domyślnie: Huawei, limit AC **5500 W**, bez magazynu. PV1: 4510 Wp, 11 paneli; PV2: 2870 Wp, 7 paneli; pochylenie 30°. Azymut od północy: PV1 220°, PV2 130°; to +40° i −50° przy południu równym 0°. Zmiana geometrii może unieważnić zgodność starych profili.

| Pojęcie | Znaczenie |
| --- | --- |
| W / kW | Moc; 1000 W = 1 kW. |
| Wh / kWh | Energia; 1000 Wh = 1 kWh. 1 kW przez kwadrans daje 0,25 kWh. |
| Wp | Nominalna moc paneli, nie gwarantowana produkcja. |
| 0 | Znana wartość zerowa. |
| — / brak | Brak danych lub warunków do wyniku. Nie jest zerem. |
| Pokrycie | Dostępność danych w przedziale, nie autokonsumpcja. |
| Pewność profilu | Jakość, liczebność i dopuszczony wpływ; nie sprawność ani strata energii. |

Prognoza jest kwadransowa. Godziny wyświetla się w ustawionej strefie, domyślnie Europe/Warsaw. Pliki/API mogą używać UTC. Doba UTC zaczyna się lokalnie o 01:00/02:00; zmiana czasu daje 23/25 godzin. Nocne zera modelowe są oznaczone. Brak dziennej prognozy nie jest zastępowany zerem.

<!-- tab:overview -->
## 3. Przegląd

**Kafelki:** bieżąca moc AC, dziś, pozostało dziś, jutro. Moc wymaga świeżego odczytu. Po produkcji dzisiejsze encje prognozy i pozostałej energii mogą wynosić 0; zachowane wersje oceniasz w archiwum i Energii.

**Porównanie prognoz i produkcji:** linie źródeł, PV Lab i pomiaru. Przełącznik „Widok wykresu” wybiera „Energia w godzinie · kWh” (domyślnie) lub „Moc · W”. Wybór jest zapamiętany w przeglądarce i wspólny dla Przeglądu oraz Prognoz. Dzień, źródła i ukryte linie zachowują się w obu trybach tak samo. Oś W przedstawia średnią moc, czyli Wh kwadransa × 4. Ukrywanie linii i przełączenie wersji źródłowej/po limicie zmienia tylko wygląd. Mysz/dotyk pokazuje czas, pionową linię i wartości. Noc jest ograniczana; prawdziwe zera w dzień pozostają.

W trybie kWh punkt oznacza sumę czterech kwadransów pełnej godziny, jest rysowany w jej środku, a wskazanie myszą/dotykiem pokazuje pełny zakres. Niekompletny przebieg pozostaje brakiem. Linia zakończonych pomiarów kWh pochodzi z raportów, w pierwszej kolejności statystyk HA, a nie z przypadkowej średniej punktów wykresu. Bieżący niepełny pomiar jest pokazywany osobno jako „Wyprodukowano dotychczas”; nie udaje produkcji całej godziny.

To energia produkcji PV, a nie nadwyżka dla pralki. Przy bilansowaniu godzinowym wcześniejszy eksport w tej samej godzinie może pomóc, ale trzeba uwzględnić też inne odbiorniki. Przykład: 2 kWh produkcji minus 0,4 kWh zużycia reszty domu daje około 1,6 kWh na dodatkowy cykl w tej godzinie. To oszacowanie, nie gwarancja. Bieżącą pozostałą prognozę pokazuje tabela; wybór terminu z profilem urządzenia i domem obsługują Planowanie i Optymalizator. Przełącznik zmienia prezentację, nie model ani wyniki.

**Opcjonalne zużycie domu i nadwyżka:** w trybie kWh można osobno zaznaczyć „Zużycie domu — baza” i „Nadwyżka PV po odjęciu domu”. Obie linie są domyślnie wyłączone przy otwarciu aplikacji. Włączenie ich w trybie W automatycznie przełącza wykres na kWh. Korzystają z tego samego modelu bazy domu co Optymalizator: historii lub jawnej rezerwy, po odjęciu wskazanych urządzeń planowanych osobno. Dymek pokazuje pełną godzinę i źródło profilu. Brak pełnego pokrycia pozostaje przerwą, nie zerem; starszych godzin nie odtwarzamy dzisiejszym profilem.

Nadwyżka godzinowa = max(suma PV w godzinie − suma bazy domu w godzinie, 0). Przykład: PV 2 kWh i baza domu 0,4 kWh dają 1,6 kWh. To szacunek dla bilansowania godzinowego przed rezerwacją energii dla innych dodatkowych cykli, nie gwarancja wolnej energii w każdej minucie. Dla bilansowania 15-minutowego/bez kompensacji oraz wspólnego planu użyj modułów planowania. Bieżąca godzina jest pokazana w całości, choć część czasu już upłynęła; energia dostępna od teraz wymaga uwzględnienia bieżącego salda. Baza jest odświeżana wraz z symulacją, a odejmowana produkcja pochodzi z aktualnej prognozy wykresu. Te linie nie zmieniają modelu PV ani harmonogramu.

**Skala i limit falownika:** oś dopasowuje się do widocznych wartości bez stałego minimum 6000 W. Limit pokazywany jest dopiero po zbliżeniu widocznej produkcji do około 91% mocy falownika, czyli od 5000 W przy limicie 5500 W. W kWh odpowiednio od 5 kWh/h pojawia się 5,5 kWh w pełnej godzinie. Duże zużycie domu samo nie włącza progu PV. Ukrywanie progu na wykresie nie wyłącza rzeczywistego ograniczenia obliczeń.

**Stan kalibracji:** liczba porównań, nie dni importu. Pokazuje blokadę ostatniego kwadransa: brak mocy/statusu, pokrycia lub dostatecznej prognozy. Standardowo wymagane jest co najmniej 95% pokrycia i prognoza ≥20 Wh zapisana przed przedziałem. Nocą obserwacje produkcyjne zwykle nie przyrastają.

**Twoje połacie:** moc DC z napięcia × prąd, nie niezależny pomiar AC połaci. **Jakość danych:** kwalifikacja do uczenia. Samo wysokie napięcie przy normalnej pracy jest ostrzeżeniem, nie automatycznym wykluczeniem.

<!-- tab:forecast -->
## 4. Prognozy i korekty

Lista dni na głównym wykresie obejmuje również minione dni dostępne w raportach godzinowych. Dla minionego dnia wykres przechodzi na kWh i pokazuje oryginalne zapisane wartości: plan z poprzedniego wieczoru albo ostatnią prognozę przed każdą godziną. Drugi wariant łączy różne wydania — nie jest jednym planem znanym na początku dnia. Dostawców, PV Lab, wariant przed historią i rzeczywistą produkcję można ukrywać osobno. Dymek zawiera godzinę zapisu. Brak zapisu nie jest rekonstruowany dzisiejszym modelem. Szczegóły godzinowe są dostępne przez 7 dni; starsze podsumowania są w raportach. Wykres historii zmian pokazuje kolejne całodzienne wyniki wybranego dnia.

Na początku są wykres, najlepsze okna i tabela godzinowa. Dane dostawców, wpływ historii, kontrola panelu Energia, składniki obliczeń, historia zmian i korekta sieci pozostają dostępne w rozwijanych sekcjach. Kliknij tytuł, aby je otworzyć; otwarcie jest zachowywane podczas automatycznego odświeżania widoku. Ukrycie sekcji nie wyłącza korekty ani źródła.

### Prognoza godzina po godzinie

Sumuje kwadranse; aktualna godzina jest wyróżniona, nocne godziny ograniczane.

| Kolumna | Znaczenie |
| --- | --- |
| Dostawca po limicie falownika | Jego energia ograniczona mocą falownika, bez naszej kalibracji. |
| Połączona po limicie | Połączony punkt odniesienia dostępnych źródeł z limitem. |
| Po korektach | Końcowy wynik PV Lab. |
| Pozostało | Energia części okresu, która jeszcze nie upłynęła. |
| Pokrycie | Kompletność wymaganego przebiegu. |

### PV Lab a panel Energia

Nowa karta obok aktualnej tabeli godzinowej porównuje dwie wersje w tych samych pełnych godzinach i w kWh. Zielona linia to aktualna prognoza PV Lab, niebieska przerywana — wartości dokładnie z funkcji przekazującej prognozę integracji. Linie zgodne nakładają się. Rysowanie dopuszcza godzinny odstęp między punktami; godziny nie są traktowane jak luki w pomiarze kwadransowym. Nocne godziny bez znaczenia produkcyjnego są ograniczone.

Tabela pokazuje pełny zakres z przesunięciem strefy i znacznik UTC, aktualną energię, eksportowaną energię, różnicę (eksport minus aktualna), rodzaj wersji, moment jej zapisu i przyczynę. Zakończone godziny zachowują prognozę znaną przed ich początkiem; przyszłe mają aktualną sumę czterech kwadransów. Brak zapisu, brak pełnej godziny lub nieświeże połączenie są opisane, a brak nie staje się zerem. Archiwum nie jest zmieniane przez podgląd.

Kontrola odbioru prognozy przez Home Assistant działa automatycznie podczas korzystania z panelu, najwyżej raz na minutę. Nie wymaga przycisku. Podstawowy wykres i porównanie korzystają bezpośrednio z wyniku eksportera integracji i są dostępne niezależnie od tej kontroli. Osobne kolumny pokazują wartości odebrane przez HA i zgodność z bieżącym eksportem. Odczyt jest migawką z podaną datą; nie potwierdza odświeżenia karty Energia w innej karcie przeglądarki. W razie różnicy sprawdź czas odczytu; kontrola ponowi się automatycznie, a przyczyną może być starsza odpowiedź integracji. Awaria kontroli nie blokuje wyświetlenia lokalnej prognozy; ostatni udany odczyt pozostaje oznaczony swoją datą. Ostrzeżenie o innym dostawcy wymaga potwierdzenia jego konkretnej integracji, danych oraz przypisania do tego samego licznika co PV Lab. Samo istnienie dostępnych integracji lub przypisanie innej instalacji nie wywołuje tego komunikatu. Wielokrotne przypisanie PV Lab jest sprawdzane oddzielnie. Przy kilku instancjach bez jednoznacznego wyboru nie zgadujemy, którą porównywać.

Wykres kwadransowej mocy i wykres godzinowej energii nie muszą mieć identycznego kształtu: sumowanie godzin wygładza różnice wewnątrz godziny. Sama zmiana jednostki tylko skaluje wartości. HA dodatkowo sam pozycjonuje punkty i formatuje dymki, zależnie od wersji interfejsu. Dymek „11:30–12:30” nie jest dowodem, że źródło policzyło taki przedział. Znacznik eksportu jest początkiem pełnej godziny; podgląd pokazuje tę semantykę bez zmiany czasu danych. Ta sama godzina, wersja i jednostka powinny mieć te same wartości — temu służy nowa karta.

### Najlepsze dostępne okna

Maksymalna energia w 1/2/3 kolejnych godzinach, starty co 15 minut. Kolejne najlepsze zakresy mogą się nakładać. To ranking **produkcji**, nie nadwyżki czy kosztu urządzenia. Brak przyszłego pełnego okna oznacza energię 0 i brak terminu. Jutro także wymaga dostępnej prognozy.

### Prognozy dostawców

„Po samym limicie” jest odniesieniem, „Po kalibracji i limicie” dodaje wyuczony mnożnik. „Zmiana” to różnica tych wariantów, nie zmiana pogody od poprzedniego odczytu. „Średni udział wag” jest udziałem źródła w połączeniu; różni się między kwadransami.

### Wpływ historii

Porównuje wynik przed profilem z wynikiem po nim, przed ryzykiem sieci. Gotowy profil nie musi zmieniać prognozy: jeśli jest ona poniżej poziomu historycznego z marginesem, nie odejmujemy ponownie.

### Skąd bierze się wynik — wybrany dzień

Wszystkie dostępne przyszłe kwadranse wybranego dnia. Po dzisiejszej produkcji wybierz jutro. To rozbicie obliczeń, nie archiwum wszystkich dawnych wersji.

Wiersze dostawców są składnikami wyniku. Oryginalne Wh pochodzi ze źródła; mnożnik 0,8 oznacza 20% mniej, 1,2 — 20% więcej przed ponownym limitem. Udział to waga znormalizowana. „Dlaczego” wskazuje regułę lokalną/ogólną, horyzont i liczbę obserwacji.

Podsumowanie prowadzi przez średnią ważoną, korektę bieżącą, historię i sieć do końcowego wyniku. Liczba dni z przestojem dotyczy dopasowanego zakresu, nie całej historii.

### Kolejne dni i historia zmian

Wynik zmienia się po odczytach źródeł, kalibracji, aktualizacji profilu i upływie czasu. Czas obliczenia nie musi być czasem zmiany. Wpisy drobnych zmian są ograniczane do godziny, większa zmiana ≥0,5 kWh względem zapisu może trafić wcześniej. Widać poprzednią/nową wartość, kierunek i przyczyny.


### Ostrożniejsza prognoza na jutro (0.8.5)

Po dotychczasowej kalibracji, historii i ryzyku sieci zachowujemy wynik bazowy jako beforeTomorrowWh. Dla następnej lokalnej doby wybieramy dostawcę z najmniejszym wcześniejszym błędem ważonym (zawyżenie 100%, niedoszacowanie 50%). Zmiana przełącznika oceny w raporcie nie zmienia tej stałej reguły. Dostawca musi wypaść lepiej od bazowego PV Lab. Używamy tych samych pełnych godzin i tego samego zestawu aktywnych dostawców. Minimum to 3 kompletne dni; domyślnie bierzemy ostatnie 14 dostępnych kompletnych dni w zakresie zachowanych podsumowań dobowych. Wykluczamy dzisiejszą dobę, dzień prognozy oraz dni sprzed ostatniego resetu kalibracji. Nie używamy produkcji przewidywanego dnia do wyboru źródła.

W każdym kwadransie nowa energia = minimum z bazowego wyniku i średniej ważonej: 50% wyniku bazowego + 50% prognozy wybranego dostawcy po limicie falownika. Wyższa prognoza dostawcy nie podnosi wyniku. Brak jego przedziału nie tworzy sztucznego zera i pozostawia bazę. Nie przekraczamy wcześniejszego ograniczenia historycznego ani limitu AC. Dzisiejsza i dalsze doby pozostają przy dotychczasowym mechanizmie; korekta na jutro nie zastępuje bieżącej korekty od rzeczywistej mocy. Z chwilą przejścia do dzisiejszej doby działa model bieżący, co może zmienić wynik względem wcześniejszego wydania.

Karta „Ostrożniejsza prognoza na jutro” pokazuje warunki, źródło odniesienia, liczbę pełnych dni i godzin, energię odjętą oraz liczbę zmienionych kwadransów. Wyłącznik, udział 0–0,75, minimum dni i długość historii są w Ustawieniach. Ich zmiana nie zeruje dotychczasowej kalibracji. W historii publikacji zapisujemy wynik przed korektą i po niej. Przy kolejnej ocenie jakości używamy wariantu bazowego bez tej korekty, aby jej własny wynik nie zafałszował wyboru źródła. Jeśli wariant bazowy jest zapisany tylko dla części dnia, ten dzień nie uczy tego mechanizmu. Dawne dni sprzed tej funkcji korzystają z dawnych bazowych wyników.

Udział 50% wybrano na wcześniejszym odcinku retrospektywnego testu spośród 25%, 50% i 75%, preferując umiarkowaną ingerencję przy podobnym błędzie. Późniejszy odcinek sprawdzono z tym ustalonym parametrem. Jest to krótka próba z jednego sezonu i kilku wersji aplikacji; nie gwarantuje poprawy przy każdej pogodzie. Kopia danych nie odtwarza dokładnie chwili dostępności ewentualnie później poprawionych statystyk HA. Stosujemy wyłącznie poprzednie pełne dni i zachowane wersje prognoz, ale ostateczna ocena skuteczności powstanie na nowych dniach po aktualizacji.

### Rzeczywista produkcja i kolory w tabeli godzinowej (0.8.5)

Tabela „Prognoza godzina po godzinie” zawiera rzeczywiste kWh z raportu godzinowego, źródło pomiaru i prognozy dostawców oraz PV Lab. Dla zakończonych godzin dzisiejszej doby pokazuje wersję bieżącą zapisaną przed początkiem godziny, nie przeliczony później przebieg. Dla minionego dnia respektuje wybór wersji na wykresie: plan z poprzedniego dnia lub bieżącą wersję sprzed godziny. Brak wcześniejszego zapisu pozostaje kreską. Łączna krzywa przed kalibracją nie ma osobnego zapisu godzinowego w raporcie, więc w przeszłości jest kreska. Przyszłe godziny pokazują aktualny przebieg. Bieżąca godzina pokazuje „Wyprodukowano dotychczas” z czasem pomiaru, a nie energię pełnej godziny.

Zielony kolor i znak ✓ oznaczają najniższy błąd ważony wśród dostępnych zapisanych prognoz, bursztynowy najwyższy. Remisy są wspólne. Ocena korzysta z aktualnego wyboru kary niedoszacowania w „Prognoza a produkcja”, domyślnie 50%. Wymaga zakończonej godziny, rzeczywistego pomiaru i co najmniej dwóch prognoz. Niepełna godzina ani przyszłość nie dostają rankingu. Kolor ma znaczenie porównawcze, nie oznacza fizycznego ograniczenia ani niedostępności dostawcy. Podsumowanie uczciwego rankingu na wspólnym komplecie dostawców nadal jest w raporcie.

<!-- tab:reports -->
## 5. Prognoza a produkcja

Ocena prognoz znanych przed produkcją. „Plan na jutro” wybiera wersję sprzed skonfigurowanej godziny poprzedniego dnia, domyślnie 20:00. „Przed godziną” — sprzed początku ocenianej godziny. To różne horyzonty. Data wiersza oznacza produkcję, czas zapisu może być z poprzedniego dnia.

Kolumny: rzeczywista energia, PV Lab przed historią, wynik końcowy, dostawcy po limicie i najlepszy błąd. Szczegóły: źródło pomiaru, czas zapisu i jakość. Dwie pozycje PV Lab służą ocenie etapów; dostawcy występują raz. Brak zapisanego wariantu pozostaje kreską — nie odtwarzamy go dzisiejszym modelem.

Statystyki HA mają pierwszeństwo dla energii. Mogą być kompletne mimo braków próbek mocy; ostrzeżenie o próbkach nie musi oznaczać braku energii.

**Ograniczenie:** różnica „przed historią” i wyniku końcowego może obejmować też ryzyko sieci. Czysty wpływ historii pokazuje karta w Prognozach, a wpływ sieci — odpowiednia para w Źródłach.

| Wiek | Szczegółowość |
| --- | --- |
| Ostatnie 7 dni | Godziny. |
| Do 30 dni | Dni. |
| Do 12 miesięcy | Miesiące. |
| Starsze | Lata. |

Agregacja jest trwała; z roku nie odtworzysz godzin. Archiwum produkcyjne i prognoza Energii mają osobne zasady. Nocne okresy bez znaczenia produkcyjnego nie tworzą nowych raportów. Pojedyncza wygrana nie dowodzi przewagi: porównuj wspólne okresy, horyzont i liczebność.


### Ocena zawyżenia i niedoszacowania (od 0.8.4)

„Czy PV Lab poprawia wynik?” pokazuje równocześnie prognozę na jutro i aktualizowaną w ciągu dnia, na tych samych godzinach dla wszystkich aktywnych źródeł. Podsumowanie korzysta z dostępnych danych dobowych ostatnich 30 dni w wybranym zakresie dat. Różne zestawy źródeł są osobnymi grupami. Tabela szczegółowa i wykres poniżej nadal mają wybór jednego horyzontu.

Domyślna kara: zawyżenie × 1, niedoszacowanie × 0,5. Możesz przełączyć wagę niedoszacowania na 0,25 lub 1. Błąd ważony na godzinę to suma tych kar podzielona przez liczbę wspólnych godzin. Zwykły błąd (MAE) nadal liczy oba kierunki jednakowo. Pokazujemy również osobne sumy zawyżenia i niedoszacowania. Ranking tabeli oraz zwycięzca godzinowego wiersza korzystają z wybranej oceny ważonej, wykres zwykłego błędu pozostaje MAE. Jest to wskaźnik ryzyka, nie koszt rachunku; nie uwzględnia decyzji odbiorników ani taryf. Rzeczywisty koszt ocenia Optymalizator. Ocena nie obcina prognoz, nie zmienia wag dostawców i nie zmienia historycznych zapowiedzi.

Starsze agregaty można ocenić asymetrycznie bez odtwarzania prognoz: zawyżenie = (suma błędów bezwzględnych + suma błędów ze znakiem)/2; niedoszacowanie = (suma błędów bezwzględnych − suma błędów ze znakiem)/2. Brakujące prognozy i pomiary nie są zerami.

Kolumna „Średni błąd sum dobowych” wymaga wszystkich oczekiwanych godzin danego dnia ze wspólnym kompletem źródeł. Również przy widoku godzin pobieramy ją z zapisanych kompletnych podsumowań dni; wcześniej interfejs pokazywał zawsze zero pełnych dób w tym widoku. Jeśli warunek nie jest spełniony, widzisz „Brak pełnej doby” i licznik, zamiast samej kreski z jednostką. W trybie bieżącym suma dobowa składa się z kolejnych wersji znanych przed poszczególnymi godzinami, nie jest jedną prognozą wydaną rano.

<!-- tab:planner -->
## 6. Planowanie zużycia — jeden wspólny moduł (0.8.6)

Dawne Planowanie urządzenia i Optymalizator są połączone pod pozycją **Planowanie zużycia**. Dawny odnośnik #optimizer przekierowuje do tego widoku. Jedna lista cykli, ten sam zakres, profile urządzeń, model domu i bilans służą obu analizom. Nie zmieniamy produkcji PV — wybieramy, kiedy użyć energii.

### Co chcesz uruchomić?

Wybierz przyciskiem 0, 1, 2 lub 3 kolejne cykle każdego urządzenia, np. pralka 2 i zmywarka 1. Dawny zapis powyżej 3 zachowujemy i pokazujemy jako dodatkowy przycisk; nie obcinamy ustawień. Cykl już trwający jest pokazywany osobno i nie odejmuje automatycznie liczby nowych uruchomień. Maksymalnie osiem cykli łącznie. Profil programu i wariant (typowy, średni, największy) narzucają rzeczywisty czas, energię i kształt poboru. Przy „Ręcznie” energia i czas znajdują się w rozwijanych parametrach. Przykład: 4 kWh przez 2 h to stałe 2 kW, dopóki nie wybierzesz profilu.

W parametrach dodasz sprzęt, zmienisz nazwę, encję mocy oraz wartości ręczne. Aby zaplanować różne programy jednego fizycznego urządzenia, dodaj kolejny wiersz z tym samym identyfikatorem encji mocy i wybierz inny profil. Wiersze o tej samej encji mają wspólną blokadę i wspólny najwcześniejszy termin zakończenia. Bez encji blokujemy powtórzenia w obrębie jednego wiersza. Profile z historii budujesz w Profile urządzeń.

Na telefonie każde urządzenie ma osobną kartę z pełnymi podpisami: liczba kolejnych cykli, profil, wariant, godzina i dzień terminu. Zaznaczone daty i cel mają wyraźne obramowanie, a pola mają większą czcionkę i obszar dotykowy. Pod kartą tekstowo widać pełną nazwę wybranego profilu, wariant i liczbę cykli; podsumowanie aktualizuje się przy zmianie pola, także gdy nazwa nie mieści się w natywnym selektorze telefonu. Tabele harmonogramów do szerokości 700 px zmieniają się w karty; każda wartość ma widoczny podpis. Na szerszym ekranie pozostają tabelami.

Ten sam sprzęt pracuje kolejno; pralka i zmywarka mogą pracować równocześnie. Nie zakładamy czasu na wyjęcie prania. Wykonanie poleceń uzbrajasz osobno na karcie HA.

### Urządzenia teraz — bieżące pranie i zmywanie (0.8.14)

PV Lab zna istniejące encje mocy sensor.gniazdkopomiarpralka_energy_power i sensor.gniazdkopomiarzmywarka_energy_power (W/kW). Korzysta z identyfikatorów zapisanych w konfiguracji urządzeń; po aktualizacji integracji HACS udostępnia też dwie encje binary_sensor: Pralka pracuje (ikona mdi:washing-machine) i Zmywarka pracuje (mdi:dishwasher). Stan pracy jest wyliczany raz w aplikacji i ten sam wynik trafia do planowania oraz encji HA. Inne urządzenia cykliczne z poprawną encją mocy mogą być obserwowane tak samo; urządzenia oznaczone jako praca ciągła nie są objęte tym detektorem cyklu.

Karta pokazuje moc teraz, początek cyklu, szacowany koniec, granicę blokady kolejnego startu, źródło szacunku i czas odczytu. Dostępne stany: Nie pracuje, Pracuje, Możliwy początek cyklu, Pauza lub kończenie cyklu, Potwierdzanie bezczynności, Brak potwierdzonego stanu. Brak odczytu nie oznacza bezczynności ani 0 W.

Przy uruchomieniu aplikacji, dłuższej luce, zmianie progów lub ręcznym odczycie pobierana jest krótka historia mocy. Obejmuje maksymalny czas cyklu z konfiguracji plus czas ciszy kończącej cykl (domyślnie 8 h + 20 min). Potem wystarczają bieżące odczyty HA. Brak historii jednego urządzenia nie odrzuca poprawnej historii drugiego. Nieudany odczyt historii jest ponawiany po 15 minutach; przycisk Odczytaj dane i przelicz ponawia go od razu. Brak historii pozwala rozpocząć obserwację od teraz, ale nie potwierdza dawnego początku cyklu.

Progi pochodzą z Ustawienia → Urządzenia — profile i sterowanie. Domyślnie start to co najmniej 10 W; pierwsze dwie minuty są oznaczone jako możliwy początek. Koniec potwierdza dopiero co najmniej 20 minut przy mocy do 5 W. Wartości pomiędzy progami i krótkie pauzy nie kończą cyklu. Progi są zmienialne. Jeżeli rzeczywisty program ma dłuższe ciche pauzy, zwiększ czas ciszy — sama moc nie identyfikuje idealnie wszystkich programów.

Wykryty start wymaga wcześniejszej zaobserwowanej bezczynności. Gdy obserwacja zaczyna się przy już pobieranym prądzie, początek pozostaje nieznany, a widoczny jest czas pierwszej obserwacji. Dokładność nowych przejść jest ograniczona częstością odczytów; historia HA może pozwolić ustalić wcześniejszy start.

Szacowany koniec opiera się kolejno na wybranym profilu i wariancie tego sprzętu, ręcznym czasie cyklu, dostępnym profilu typowym, a bez nich na maksymalnym czasie z konfiguracji. Nie mamy potwierdzenia, jaki program został faktycznie włączony, więc jest to jawny szacunek. Pozostałą energię wyznaczamy z niewykonanej części wybranego 5-minutowego profilu; ręczny profil jest równomierny. Bez profilu energii zakładamy dalszy bieżący pobór do przyjętego końca i oznaczamy niepewność.

Gdy urządzenie nadal pracuje po przewidywanym końcu, blokadę wydłużamy o co najmniej kolejne 15 minut i wyświetlamy ostrzeżenie o przekroczonym czasie. Potwierdzony wcześniej koniec zwalnia sprzęt przy następnym odczycie. Przy braku świeżych pomiarów stan jest nieznany, a niepewne najbliższe okresy są wyłączane z planowania. Nie zakładamy, że zniknięcie encji kończy pranie.

**Wpływ na obliczenia:** stan zajętości blokuje wszystkie nowe cykle wskazujące tę samą encję mocy. Różne nazwy/programy tej samej pralki nie obchodzą blokady. Pozostała energia trwającego cyklu obciąża dom przed dodaniem nowych cykli; nie liczymy jej drugi raz jako nowego prania. Baza musi wykluczać to urządzenie (lista odejmowanych encji lub potwierdzony pomiar oczyszczony); przy historii bez tego warunku niepewne okresy są pomijane zamiast podwójnego dodania zużycia. Stała rezerwa ma znaczenie bazy bez nowych i trwających cykli.

Wykres pokazuje osobną linię Trwające cykle. Podsumowany koszt nadal dotyczy dodatkowego uruchomienia cykli z formularza, względem domu z cyklem już trwającym. Nie jest rachunkiem za cały dom. Przy szacowanym saldzie bieżącej godziny uwzględniamy także minioną część trwającego cyklu; jeśli saldo pochodzi z pomiaru, nie dodajemy jej ponownie. Niepewny początek blokuje użycie wymyślonego kredytu bieżącej godziny. Zasady G12w i godzinowego bilansowania pozostają te same.

W /data/appliance-live.json zapisujemy tylko kompaktowy bieżący stan, daty przejść i parametry detektora, bez pełnej historii mocy. Dzięki temu krótki restart zachowuje rozpoczęty cykl; po dłuższej przerwie ponownie odczytujemy historię. Plik jest częścią kopii danych i nie jest drugą bazą HA. Funkcja nie zmienia prognozy produkcji PV, sama nie steruje urządzeniami i nie potwierdza ich faktycznego zakończenia na podstawie samej prognozy.

### Encje pracy w Home Assistant (0.8.14)

Zaktualizuj aplikację oraz integrację PV Lab w HACS do 0.8.14. Następnie uruchom ponownie HA lub przeładuj integrację. Platforma binary_sensor doda dwie encje, z proponowanymi identyfikatorami binary_sensor.pv_lab_pralka_pracuje i binary_sensor.pv_lab_zmywarka_pracuje. HA może nadać sufiks, gdy taki identyfikator już istnieje. Nazwy znajdziesz przy urządzeniu PV Lab: Pralka pracuje oraz Zmywarka pracuje.

Klasa running oznacza pracę on i potwierdzoną bezczynność off. Potencjalny start oraz krótka pauza pozostają on z atrybutem niepewności. Przy unknown, observing, nieaktualnym pomiarze lub błędzie połączenia encja zachowuje ostatni potwierdzony stan, także po restarcie HA. Atrybuty `data_fresh: false`, `last_confirmed_at` i `state_source` wyjaśniają, że nie jest to świeży pomiar. Encja nie przechodzi w niedostępność z powodu braku prognozy lub chwilowej luki. Przed pierwszym wiarygodnym odczytem i bez stanu do odtworzenia pozostaje „nieznany”; nie wymyślamy bezczynności. Planer nadal korzysta wyłącznie ze świeżego detektora, nie z podtrzymywanego stanu encji. Dostępność nie zależy od prognozy PV — encje działają także nocą. Wykrywanie pozostaje w aplikacji; integracja nie uruchamia drugiego, różniącego się algorytmu.

Atrybuty podają encję i moc źródłową, status, wykryty start (cycle_started_at), szacowany koniec (estimated_end_at), blokadę kolejnego startu (blocked_until), źródło oszacowania i niepewność. Daty mają format ISO ze strefą UTC. Ikony pralki i zmywarki są ustawione w encjach. Nie ma usług sterujących sprzętem. Dokumentacja klasy encji: [Home Assistant — binary sensor entity](https://contributors.home-assistant.io/core/entities/binary-sensor/).

### Karta HA „Zaplanuj uruchomienie” (0.8.14)

Karta jest częścią tej samej integracji HACS PV Lab, nie wymaga osobnego repozytorium ani dodatkowej instalacji JavaScript. Po aktualizacji integracji i restarcie HA odśwież stronę lub aplikację mobilną. W edycji wybranego dashboardu dodaj kartę **Zaplanuj uruchomienie**. Można też użyć ręcznej konfiguracji: `type: custom:pv-lab-plan-card`. Integracja rejestruje zasób /pv_lab_frontend/pv-lab-plan-card.js z numerem wersji. Nie nadpisujemy istniejących dashboardów. Przy jednej integracji instalacja wybiera się sama; przy kilku wybierz ją z listy.

Naciśnięcia Pralka lub Zmywarka zmieniają liczbę cykli kolejno 0 → 1 → 2 → 3 → 0. Nie ma osobnego przycisku Wyzeruj. Przy zerze nie pokazujemy liczby; aktywne urządzenie ma zielone tło i ikonę oraz małą cyfrę bez kolorowego kółka. Karta domyślnie nie wybiera cykli; opcja YAML default_cycles pozwala to zmienić; zakres dziś/jutro wynika z dostępnego udziału PV. Zatwierdzony plan zachowuje pierwszeństwo. Nie obcinamy odczytanego starego planu powyżej 3; po kliknięciu nowy wybór mieści się w limicie 3. Dziś i Jutro zaznaczasz niezależnie: oba oznaczają zakres od teraz do końca jutra. Bez dnia lub bez cykli nie można przeliczyć. Własne daty i ograniczenia edytuje się w pełnym PV Lab, a nie na krótkiej karcie.

Karta używa głównego celu kosztowego: szacowany koszt planu z uwzględnieniem PV i bilansowania, w grupie do 5 gr dopłaty większy zapas PV, potem niższy koszt przy gorszej pogodzie. Nie ma selektora celu. Profile i ograniczenia urządzeń pochodzą z Planowania zużycia; przy kilku programach jednego sprzętu wybierany jest pierwszy pasujący wiersz. Karta nie nadpisuje zapisanej listy cykli ani cen. Bieżąca zajętość jest uwzględniana tak samo jak w pełnym module.

Przycisk Zaplanuj wybiera do trzech pełnych harmonogramów z dodatnim pokryciem energii z PV lub bilansu. Filtr działa na znalezionych kandydatach przed doborem różnorodności i ograniczeniem do trzech, a nie na samej trójce z poprzedniego widoku. Korzysta z kandydatów obu analiz, żeby nie przeoczyć słonecznego terminu, gdy najtańsze rozwiązania przypadają nocą. Domyślnie widoczny jest jeden polecany plan; strzałka rozwija pozostałe z maksymalnie trzech przygotowanych propozycji. Karta nie jest prostym odwzorowaniem pierwszych trzech wierszy aplikacji: pełne porównanie kosztów w aplikacji pozostaje dostępne, także dla planów wymagających zakupu całej energii. Oba widoki korzystają z tych samych danych, profili, taryf i zasad energii. Jeżeli tylko jeden lub dwa znalezione plany korzystają z PV/bilansu, pokazujemy tyle, bez uzupełniania listy planami całkowicie płatnymi. Informacja brzmi: Pominięto warianty wymagające zakupu całej energii. Jeśli nie znaleziono pełnego planu z PV/bilansem, karta pokazuje jeden najtańszy znaleziony pełny plan; przy tej samej cenie wybiera najwcześniejszy start, potem najwcześniejszy koniec. Nie stosujemy tu dopłaty 5 gr za zapas, którego nie ma. Komunikat wyjaśnia brak pokrycia z PV/bilansu. Brak pełnego planu z powodu prognozy lub ograniczeń jest nadal opisany jako niepełny, a nie jako poprawny plan całkowicie płatny. Zmiana dotyczy doboru propozycji, nie wartości produkcji i cen. Po przeliczeniu karty aplikacja przy kolejnym odczycie może użyć tego samego wyniku; wcześniej otwarty widok trzeba odświeżyć. Przy innym wyborze cykli, profilu, terminów lub nowych pomiarach wyniki mogą się prawidłowo zmienić. Karta nie nadpisuje zapisanych ustawień aplikacji. Brakujący cykl jest opisany, a niepełnego planu nie można zatwierdzić. To heurystycznie znalezione propozycje, bez gwarancji minimum wszystkich kombinacji. Starty nadal są co 15 minut. Zatwierdzenie jest blokowane, gdy do startu zostało mniej niż 60 sekund; to nie przesuwa harmonogramu ani nie zmienia wspólnej listy. Propozycja pozostaje aktualna najwyżej pięć minut, krócej przy granicy kwadransa. Jeżeli zdążyła się zdezaktualizować, ponownie ją przelicz.

**Zatwierdź ten plan** od wersji 0.9.0 uzbraja zapisany w HA harmonogram poleceń `switch.turn_on` dla skonfigurowanych urządzeń. Samo „Zaplanuj” przygotowuje wyłącznie propozycje. Ikona kłódki wybiera tryb stały, elastyczny lub elastyczny bez późniejszego końca; Auto po 10 minutach na przygotowanie zatwierdza jedną partię wyłączonych switchy. Szczegóły wykonania, restartów, anulowania i rejestru poleceń znajdują się w sekcji „Włączanie urządzeń i automatyczna aktualizacja planu — 0.9.4”.

Encje przygotowane pod późniejsze automatyzacje:

| Encja / proponowany identyfikator | Znaczenie |
| --- | --- |
| Plan urządzeń zatwierdzony — binary_sensor.pv_lab_plan_urzadzen_zatwierdzony | On tylko dla jawnie zatwierdzonego, niewygasłego planu. Anulowanie wycofuje zgodę. |
| Zatwierdzony plan urządzeń — sensor.pv_lab_dashboard_plan_status | Status planu, plan_id, cel i lista cykli w atrybutach. |
| Zatwierdzony cykl 1 początek — sensor.pv_lab_dashboard_cycle_1_start | Stały termin pierwszego cyklu; atrybuty wskazują sprzęt, koniec, energię i plan_id. |
| Zatwierdzony cykl 2…8 początek | Osobny, stały termin każdego następnego cyklu, także drugiego prania. Pierwsze trzy encje są domyślnie włączone; pozostałe można włączyć w encjach integracji. |

Nie przesuwamy automatycznie encji pierwszego cyklu na drugie pranie po upływie pierwszego startu — każdy cykl ma własną encję. Przy braku zatwierdzenia lub po anulowaniu terminy są niedostępne, nie są datą 1970 ani godziną 00:00. Po zakończeniu planu flaga gaśnie. Brak świeżych danych aplikacji nie jest zgodą na uruchomienie. Nazwy identyfikatorów mogą dostać sufiks HA przy kolizji; odnajdziesz je przy urządzeniu PV Lab.

Zmiana pól karty wymaga ponownego przeliczenia przed zatwierdzeniem; stary wynik nie dostaje nowych liczb cykli. Udane nowe przeliczenie zastępuje propozycje i cofa wcześniejsze zatwierdzenie. Zatwierdzony plan można anulować. Opóźniony wynik starszego przeliczenia nie nadpisuje późniejszego anulowania. Gdy zmieni się zajętość sprzętu i dojdzie do konfliktu przed jego przyszłym startem, aplikacja anuluje plan i podaje przyczynę. To dodatkowy bezpiecznik, nie kompletny mechanizm uruchamiania urządzeń.

Najnowsze propozycje i stan zatwierdzenia są przechowywane w kompaktowym /data/dashboard-plan.json oraz kopii danych. Zatwierdzony wariant trafia także do niezmiennej historii planów i weryfikacji; zatwierdzenie nie oznacza jeszcze potwierdzenia rzeczywistego wykonania. Zmiana propozycji nie kasuje tej historii. Po restarcie aplikacji niezatwierdzone propozycje trzeba przeliczyć przed zatwierdzeniem; wcześniej zatwierdzone przyszłe terminy są zachowane i nadal podlegają kontroli danych oraz zajętości.

Komunikacja karty przechodzi przez uwierzytelnione połączenie WebSocket HA i ograniczony interfejs planowania aplikacji. Klucz parowania i adres aplikacji pozostają po stronie HA, nie są przekazywane do JavaScript karty. Źródła interfejsu HA: [rejestracja zasobów statycznych](https://contributors.home-assistant.io/blog/2024/06/18/async_register_static_paths/), [API frontend HA](https://github.com/home-assistant/core/blob/dev/homeassistant/components/frontend/__init__.py).

### Daty i terminy

| Wybór | Zakres w strefie czasowej instalacji |
| --- | --- |
| Dziś | Od teraz do końca dzisiejszej doby. |
| Jutro | Cała jutrzejsza doba. |
| Dziś i jutro | Od teraz do końca jutrzejszej doby. |
| Własny zakres | Zapisane konkretne daty; miniony początek ograniczamy do teraz. |

Presety przesuwają się wraz z datą, a zakres własny pozostaje stały. Zakres może kończyć się najwyżej siedem dni od teraz. Rzeczywiste starty są co 15 minut; przebieg urządzenia i szacowane przepływy mają krok 5 minut. Nocne zero astronomiczne może być poprawną prognozą; brak dziennych danych nie oznacza zera. Gdy własny zakres minie, wybierz nowy — nie zmieniamy po cichu stałej daty.

**Wszystkie cykle zakończ do:** przykładowo wpisz 15:00 przy pralce. Przy dwóch praniach oba muszą być zakończone do tej godziny. Pusta godzina przy zmywarce oznacza wyłącznie wspólny koniec zakresu. Pusta data oznacza ostatni dzień wybranego zakresu. Dla „Dziś i jutro”, gdy prania mają być gotowe już dziś o 15:00, wpisz również dzisiejszą datę. Termin nie oznacza startu; cały cykl musi się zmieścić. Jawnie podana data nie przesuwa się automatycznie. Dawne dodatkowe ograniczenia dat i dozwolonych godzin przejętych urządzeń pozostają zachowane.

### Proponowane harmonogramy — jedna główna rekomendacja (0.8.14)

Główny cel to mały szacowany dodatkowy koszt wszystkich cykli po uwzględnieniu domu, prognozy PV, bilansowania i taryfy. Wśród pełnych znalezionych planów wyznaczamy najtańszy. Dopuszczamy maksymalnie 0,05 zł dopłaty za cały plan względem tej jednej kwoty. W tej grupie sortujemy najpierw według większego zapasu PV w okresach pracy, potem niższego kosztu przy mniej korzystnej pogodzie, niższego kosztu centralnego, mniej dokupionej energii i wcześniejszego końca. Pozostałe plany sortujemy według kosztu. Próg jest odniesiony zawsze do najtańszego pełnego planu; nie narasta przez porównywanie kolejnych par. Tolerancja liczbowa wynosi 10⁻⁸ zł. Większy zapas to wskaźnik odporności, a nie gwarancja ani prawdopodobieństwo. Nie ma uniwersalnego progu wystarczalności 1–2 kWh: zależy ona od całego cyklu i rozkładu energii. Nie uśredniamy kWh ze złotówkami. W tym wspólnym planerze waga ostrożności nie podwyższa niewidocznie wyniku rankingu ponad pokazaną kwotę. Parametr pozostaje zachowany dla starszego API optymalizatora; porównania kosztów historycznych nie są zmieniane.

W szczegółach Porównanie zaawansowane pozostaje Najlepsze wykorzystanie PV. Minimalizuje kWh do dokupienia po bilansowaniu, więc kolejność kosztów może być tam inna. Ta sama prognoza, dom, profile, taryfa i ograniczenia są używane w obu obliczeniach. Oba widoki mają przycisk Pokaż do 10; przy nie więcej niż pięciu propozycjach jest nieaktywny, a licznik wyjaśnia liczbę znalezionych wariantów.

### Alternatywne harmonogramy i margines nadwyżki

Domyślnie pokazujemy do pięciu różnych propozycji, po rozwinięciu do dziesięciu. Dobór uwzględnia inne godziny, kolejności, wcześniejszy koniec i zapas PV. Następnie całą wybraną listę sortujemy według opisanego kryterium, a nie kolejności powodów doboru. Przez jawny limit 5 gr plan polecany może być odrobinę droższy od kolejnego. Różnicę ceny pokazujemy względem planu 1; tańsza alternatywa ma znak minus. Plan 1 jest polecany; kolejne mają numer, koszt i różnicę kosztu względem pierwszego. To najlepszy znaleziony wariant, a nie dowód globalnego minimum. Po zwinięciu wybrany wariant spoza piątki wraca do planu 1.

Szacowany koszt planu to jedna kwota dodatkowego uruchomienia nowych cykli względem domu bez tych cykli. To nie rachunek całego domu i nie opłaty stałe z faktury. Przy wyłączonym depozycie to koszt dokupionej energii; przy włączonej wartości eksportu obejmuje też utracony przychód zgodnie z ustawieniami. Nie sumujemy kosztów pojedynczych cykli obliczonych niezależnie, bo korzystają ze wspólnego bilansu.

Kolumna Koszt przy innej pogodzie pozostaje w tabeli. Pokazuje minimum i maksimum kosztów tego samego planu przy centralnej, większej i mniejszej produkcji PV oraz zmiennym zużyciu domu. Nagłówek ma objaśnienie, a tekst pod tabelą jest dostępny również na telefonie. To analiza wariantów, a nie przedział prawdopodobieństwa lub gwarantowane granice rachunku. Główna kwota jest wynikiem prognozy centralnej. Parametry tych scenariuszy pozostają bez zmian.

Przy ciasnym terminie może istnieć mniej propozycji. Nie dopisujemy fikcyjnych wyników, nie powielamy planu przez zamianę numerów takich samych cykli i nie uzupełniamy listy samymi kosmetycznymi przesunięciami. Dla tej samej kolejności wymagamy co najmniej 30 minut różnicy któregoś porównywalnego cyklu lub końca całego planu; inna kolejność fizycznych urządzeń także może uzasadnić osobny wariant. To filtr prezentowanych możliwości, nie zmiana kroku startów: nadal wynosi 15 minut.

Gdy znaleziono pełne plany, częściowe nie wchodzą do listy. Jeśli żadnego pełnego planu nie znaleziono, pokazujemy wyraźnie oznaczone propozycje z największą znalezioną liczbą cykli. Maksymalnie pokazujemy dziesięć wyraźnie różnych rozwiązań — nie wszystkie kombinacje startów. Rozwijanie i zwijanie nie pobiera danych ani nie uruchamia ponownego przeliczania. Nie zapisuje też dodatkowej historii; dopiero przycisk zapisu utrwala wybrany wariant.

Przy zerowym dodatkowym imporcie i remisie podstawowej oceny preferujemy **większy margines nadwyżki**. To suma dodatnich sald po odjęciu domu i wszystkich zaplanowanych cykli wyłącznie w okresach rozliczeniowych, w których pracuje przynajmniej jeden cykl. Każdą godzinę/kwadrans liczymy raz; nie dodajemy nadwyżki z pozostałej części dnia. Przykład: w godzinach pracy PV daje 5 kWh, baza 1 kWh, cykle 2 kWh — margines 2 kWh. Przy bilansowaniu uwzględnia odpowiedni bieżący pomiar salda. W trybie bez bilansowania używamy kroków 5 minut.

Margines ułatwia ocenę zapasu względem prognozy, ale nie jest prawdopodobieństwem, fizycznym magazynem ani gwarancją. Suma może ukrywać słabszy pojedynczy okres; zweryfikuj też godziny i scenariusze. Zerowy import **po bilansowaniu** nie oznacza braku fizycznego importu w każdej minucie. Ceny i scenariusze pozostają widoczne również przy zerowym wyniku.

Planer sprawdza kilka kolejności (m.in. terminy, czas, priorytety, odwrotność i rotacje), trzy punkty startowe i dwa przejścia poprawek po cyklach. Ponawia próbę wstawienia brakujących cykli. Najpierw preferuje pełniejsze plany, następnie ocenę celu; nie promuje taniego planu pomijającego urządzenia. Zachowuje też poprawne plany sprzed lokalnych ulepszeń oraz sprawdza cztery dodatkowe, ograniczone przebiegi z preferencją wczesnych i późnych startów. Wszystkie używają tych samych ograniczeń sprzętu, terminów i kompletności danych. Usuwa powtórzenia identycznego fizycznego harmonogramu; z puli dobiera do dziesięciu zróżnicowanych propozycji, bez przeszukiwania wszystkich kombinacji. Licznik opisuje ocenione dopuszczalne terminy w przebiegach, a nie wszystkie matematycznie możliwe kombinacje. To **najlepszy znaleziony plan**, bez gwarancji globalnego minimum; nie używamy zewnętrznego solvera.

### Rekomendacja — wspólny plan

Tabela pokazuje cykl, start, koniec, energię, dodatkowy import fizyczny, pokrycie bilansowaniem i energię do dokupienia. Wiersze przypisują przyrosty według kolejności startów; podsumowanie oblicza wspólną pulę raz. Nie sumujemy niezależnych rekomendacji zużywających tę samą nadwyżkę. Wykres przedstawia kwadransową energię PV, oczyszczonej bazy domu, nowych cykli i osobno pozostałej części trwających cykli, przed bilansowaniem godzinowym.

Bilans godzinowy kompensuje import i eksport tylko w tej samej pełnej godzinie, 15-minutowy w kwadransie, a brak czasowego to przybliżenie przepływów co 5 minut. Bieżący pomiar salda jest uwzględniany raz; plus oznacza eksport. Saldo nie przechodzi na kolejny okres. Liczniki narastające nie stają się automatycznie godzinowo zbilansowane.

„Pokryte bilansem” to dodatnia różnica dodatkowego poboru fizycznego i dodatkowego importu po rozliczeniu; w trybie bez bilansowania wynosi 0. Gdy wcześniejsze saldo domu jest ujemne, dodatkowy import do rozliczenia może przekraczać chwilowy import fizyczny. Brak pełnego okna jest opisany przy cyklu i w liczniku kompletności. Nie podajemy fikcyjnego terminu, gdy prognoza lub czas nie wystarczają.

### Zapis i zachowanie ustawień

„Zapisz i przelicz obie analizy” zapisuje wspólną listę i ograniczenia. „Odczytaj dane i przelicz” ponawia odczyt HA i wymusza nowe obliczenie wspólnych planów; najpierw zapisz edytowany formularz. W zwykłym podglądzie wynik jest buforowany do 5 minut, krócej przy granicy kwadransa lub zmianie ustawień i danych modelu domu. Duży plan może potrzebować kilku sekund. Kolejne odświeżenia samego widoku nie uruchamiają całego wyszukiwania od nowa. „Zapisz ten wariant do porównania” utrwala dokładnie wybrany pełny harmonogram z jego cenami, profilami i celem, bez uruchamiania sprzętu. Później jest dostępny w Zapisane plany i weryfikacja.

Nowa konfiguracja to /data/unified-plan.json, zawarta także w kopii danych. Migracja zachowuje liczbę cykli z Planowania, a dodatkowy sprzęt dawnego Optymalizatora włącza, gdy nie powiela już aktywnego sprzętu. Nie dodajemy automatycznie trzeciego prania tylko dlatego, że oba dawne widoki miały pralkę. Łącznie aktywnych jest do ośmiu cykli; nadmiarowe definicje pozostają z liczbą 0. Wspólną bazę domu i rezerwę przejmujemy z Optymalizatora; odmienna dawna rezerwa prostego planera pozostaje w batch-plan.json. Oryginalne batch-plan.json i optimizer-settings.json nie są zastępowane nową listą; zachowane są taryfa, RCEm, profil domu, pomiary, ograniczenia, biblioteka i zapisane plany. Ustawienia kosztów i domu edytowane poniżej nadal zapisują dotychczasowy plik i działają wspólnie dla obu analiz. API dotychczasowych integracji pozostaje zgodne.

<!-- tab:optimizer -->
## 7. Koszty i baza domu — sekcje wspólnego planu

To dalsze sekcje Planowania zużycia, a nie drugi niezależny moduł. Bilans i ceny pokazuje aktualne pomiary. Konfiguracja kosztów i bilansu, model domu i zapisane plany są rozwijane, aby najpierw pokazać rekomendację. Wspólny zakres i bilans wybiera się u góry; dawne wartości horyzontu pozostają zachowane w pliku dla zgodności API.

### Bilans i ceny

Kafelki: moc PV, domu, import, eksport, baza bez urządzeń i cena zakupu oraz eksportu. „—” oznacza brak odczytu; PV 0 W w nocy jest poprawne. Noc nie uzasadnia braku mocy domu. Przeliczenie ponawia odczyt HA. Dla encji sieci z plusem importu: moc domu = moc PV + moc sieci. Domyślna sensor.grid_power_total_historia ma plus import i minus eksport. Usunięta sensor.zamel_pobor_caly_dom może nadal służyć do archiwum InfluxDB. Wzór nie obejmuje akumulatora ani dodatkowego generatora. Sam ponowny odczyt nie odtworzy historii usuniętej encji.

### Wspólne założenia

Przy historii bazy trzeba odjąć osobno planowane urządzenia, aby nie dodać ich drugi raz. Obie analizy używają modelu i rezerwy z tej samej sekcji domu poniżej. Zachowany eksport archiwum dawnego Optymalizatora jest oznaczony jako dawny; aktualny wspólny plan i jego konfiguracja trafiają do pełnej kopii danych. Limit poboru jest oceniany co 5 minut, nie zastępuje zabezpieczeń fazowych.

### Ceny, taryfa i koszt

Dla okresu: `koszt = import × cena zakupu − eksport × wartość eksportu`. Koszt cyklu to różnica domu z cyklem i bez cyklu, wraz z odpowiednim dotychczasowym saldem bieżącego okresu.

Cena zakupu obejmuje energię i skonfigurowane opłaty zmienne brutto. Opłat stałych nie dodajemy do rankingu. Domyślny preset użytkownika: droga 1,30 zł/kWh, tania 0,68 zł/kWh, pozostałe składniki 0. Nie jest to automatycznie aktualna oferta sprzedawcy.

Można wersjonować cennik datami. Sprawdź sezony, godziny taniej strefy, weekendy i święta z umową. Sama nazwa taryfy nie potwierdza jej poprawności. Ustawienia kalendarza i wyjątków są zmienialne.

### Depozyt i RCEm

Domyślnie depozyt jest wyłączony, pola ukryte, wartość utraconego eksportu w kalkulacji 0. Porównuje się dodatkowy zakup. Nie oznacza to zerowej wartości eksportu na fakturze.

Po włączeniu wybierz zł/MWh lub zł/kWh. `439,78 zł/MWh = 0,43978 zł/kWh`. Współczynnik domyślny 1,23 mnoży cenę eksportu. To nominalna wycena okazji do eksportu, nie księgowość depozytu: brak salda, wygasania i rozliczenia faktury.

Ceny mogą pochodzić z ręcznych wartości albo encji. Niedostępna wskazana encja nie zostaje po cichu zastąpiona stawką ręczną. Przecinek dziesiętny jest obsługiwany. Dla nieznanego przyszłego miesiąca ostatnia RCEm jest jawnym założeniem, a nie oficjalną prognozą. RCE godzinowe nie jest tu osobnym modelem.

### Prognoza zużycia pozostałej części domu

Baza to dom **bez cykli planowanych osobno**. Inaczej zużycie pralki byłoby policzone w bazie i drugi raz jako zadanie.

Zapis ustawień nie pobiera historii. Odczyt historii nie zmienia sam trybu „Stała rezerwa” na „Historia oczyszczonego zużycia”. Wybierz właściwy tryb i zapisz. Panel pokazuje, które źródło faktycznie działa w symulacji.

Wskaż moc całego domu i moce odejmowanych urządzeń. Potwierdzenie „pomiar już wyklucza urządzenia” dotyczy rzeczywiście oczyszczonej bazy — nie zwykłego licznika domu.

| Źródło | Co dostarcza |
| --- | --- |
| Historia stanów HA | Do 30 dni mocy, po odjęciu urządzeń kwadranse z ≥95% pokrycia. |
| InfluxDB | Do 3650 dni przebiegów, także archiwalnych encji, jeśli są też pomiary odejmowanych urządzeń. |
| Statystyki energii HA | Do 3650 dni, partie po 30 dni; godzinowa energia domu = produkcja AC + import − eksport, następnie odjęcie energii urządzeń. |

Rekonstrukcja wymaga importu/eksportu **niezbilansowanego już godzinowo**, prawidłowej produkcji AC i statystyk przyrostów kWh. Liczniki energii urządzeń przypisuje się w Ustawieniach. Brak historii urządzenia nie oznacza zera — godzina nie uczy oczyszczonej bazy. Historia samego domu jest cenna, lecz nie jest historią domu bez urządzeń.

Godziny zapisywane są jako godziny; rozkład wewnątrz godziny w symulacji jest szacowany równomiernie. To nie odtworzony pomiar kwadransowy. Prawdziwe kwadranse mają pierwszeństwo w swoich przedziałach.

Model używa mediany dla sezonu, dnia tygodnia i kwadransa. Przy małej liczbie dni próbuje szerszego profilu dnia tygodnia, potem pory dnia, a na końcu rezerwy. Świeża oczyszczona moc może dostosować najbliższe 2 godziny, ze słabnącym wpływem.

**Profil zużycia domu używany w symulacji** to osobny wykres nad rozwijaną tabelą kwadransów. Niebieska linia pokazuje średnią moc bazy W dla całego horyzontu, także w nocy; przerywana szara jest ustawioną rezerwą, wyłącznie jako odniesienie. Nie jest dodawana drugi raz. To ten sam przebieg, który jest używany do oceny terminów urządzeń. Nie obejmuje cykli dodawanych do planu.

Po wskazaniu/dotknięciu odcinka odczytasz czas, moc, energię kWh, źródło i liczbę dni profilu. Dla rozpoczętego kwadransa energia obejmuje tylko pozostałą część, a moc jest wyliczana z jej rzeczywistego czasu. Zmienny profil nie musi oznaczać pomiarów co 15 minut — przy imporcie godzinowym rozkład wewnątrz godziny jest oszacowany. Wykres jest prezentacją danych tabeli i nie dodaje nowej korekty ani nie zmienia prognozy PV.

Widać liczby kwadransów/godzin, dni, postęp, brakujące encje i niezgodności. „Jakiej bazy używa każdy kwadrans?” pokazuje energię, źródło i liczbę dni. Import bez poprawnych danych musi być opisany jako pusty, nie jako udane nauczenie modelu.

### Ostrożność i weryfikacja

Trzy scenariusze zmieniają PV i zużycie domu. Margines PV korzysta z wcześniejszych błędów przy odpowiedniej liczbie ocen; wcześniej jest robocze 25%. Rozrzut bazy wynika z historii lub ustawienia.

Starsze API optymalizatora zachowuje ranking: koszt centralny + waga ostrożności × różnica między najgorszym a centralnym scenariuszem (domyślnie 0,25). Główny wspólny planer od 0.8.14 sortuje według centralnego szacowanego kosztu z opisaną wyżej kolejnością rozstrzygania remisów. Zakres scenariuszy nie jest przedziałem ufności ani gwarantowanym kosztem.

Zapis planu utrwala prognozę, ceny i założenia. Po rzeczywistym wykonaniu zaznacz potwierdzenie, a po zakończeniu okresów uruchom weryfikację. Odczytywane są pomiary domu, PV i urządzeń. Braki nie są zastępowane planem jako rzekomą rzeczywistością. Ocena korzysta z utrwalonych cen, nie faktury. Nie zmienia automatycznie cen ani profilu pralki. Wynik można wyeksportować.


### Zakres danych modelu domu

Wykres bazy i tabela kwadransów pokazują ten sam wybrany zakres co widoczny wspólny harmonogram. Obie analizy korzystają z tej samej bazy; zmienia się cel optymalizacji. Daty i bilans ustawiasz wyłącznie na początku modułu. Stare API Optymalizatora zachowuje własny format horyzontu dla zgodności z wcześniejszą integracją.

<!-- tab:appliances -->
## 8. Profile urządzeń

Urządzenia konfiguruje się w Ustawieniach: nazwa, moc W/kW, opcjonalnie energia Wh/kWh. Można dodać klimatyzację lub pompę ciepła.

Historia cykli pokazuje start, czas, energię, szczyt mocy i uwagi. Domyślnie start >10 W, zakończenie przy niskiej mocy 5 W z bezczynnością 20 minut; progi są zmienialne. Niepełne cykle/luki są odrzucane lub oznaczane. Licznik energii kontroluje zgodność całki z mocy. Nie rozpoznajemy automatycznie programu producenta.

Wybieraj podobne cykle do osobnych profili, np. eco i intensywny. Za tydzień można ponowić odczyt i dodać cykle; są scalane, nie celowo duplikowane. Obowiązuje limit zachowanych cykli. Zapisany profil nie przebudowuje się przy samym otwarciu strony.

| Wariant | Metoda |
| --- | --- |
| Typowy | Rzeczywisty cykl z najczęstszego zakresu czasu i energią bliską medianie grupy. |
| Średni | Średnia po wyrównaniu początków, może wygładzić szczyty. |
| Największy | Jeden rzeczywisty cykl o największej energii, nie suma maksymalnych punktów. |

Profile mają kroki 5 minut. W ręcznym wpisujesz **W**, energia kroku = W/12 Wh; czas profilu jest dopasowany do 5 minut, a możliwe starty planera pozostają co 15 minut. Dla pracy ciągłej wybiera się okno, np. 2 godziny — to nie naturalny pełny cykl ani model cieplny budynku. Inna temperatura/nastawa klimatyzacji zmieni zużycie.

Profile wpływają na planowanie i optymalizator, nie prognozę PV.

<!-- tab:panels -->
## 9. Panele i zacienienie

Każda połać ma osobną mapę paneli. Układ początkowy odwzorowuje numerowany schemat: PV1 01–11, PV2 01–07, z przerwami. Na panelu widać numer i aktualną moc W. Bursztynowy kolor oznacza najniższą historyczną relację poniżej 80%; szary oznacza brak bieżącego pomiaru. Relacja i moc nie muszą dotyczyć tej samej chwili. Najniższa relacja jest także w podpowiedzi, szczegóły w tabeli.

„Edytuj układ paneli” pozwala przeciągać panele myszą lub dotykiem, przesuwać strzałkami (Shift: większy krok), wpisać położenie i obrócić panel o 90°. Wybór innego numeru w „Panel w tym miejscu” zamienia pozycje dwóch paneli tej samej połaci, bez zmiany ich encji i numerów seryjnych. „Zapisz układ” zapisuje obie połacie dla wszystkich przeglądarek; „Anuluj” odrzuca niezapisane zmiany. „Przywróć schemat” ustawia początkową mapę w edytorze i również wymaga zapisu. Podczas edycji odświeżanie nie zastępuje formularza. Po zapisie moc odświeża się normalnie.

Układ jest wyłącznie wizualny: nie zmienia azymutu, nachylenia, parametrów instalacji, historii ani kalibracji. Zapis znajduje się w /data/panel-layout.json i jest dołączony do eksportu kopii. Brak pliku oznacza układ początkowy. Nowe optymalizatory otrzymują pozycję początkową; istniejące są rozpoznawane po identyfikatorze.

**Powtarzalne różnice według położenia Słońca:** moc panelu jest odniesiona do mediany paneli tej samej połaci. 100% to mediana, 70% — 30% poniżej niej. Agregat to średnia zapisanych relacji, nie sprawność modułu.

Przedział odnosi się do Słońca, nie kierunku dachu. Słońce ma to samo położenie dla wszystkich paneli, dlatego oznaczenie może być wspólne. Grupy porównawcze nadal są osobne dla połaci. Dawne „7:1” to azymut 140–160° i wysokość 10–20°. Koszyki domyślnie 20° azymutu/10° wysokości, z sezonem.

„Za mało danych profilu” oznacza zbyt małą liczbę poprawnych porównań; domyślnie potrzeba ≥20 obserwacji koszyka. To przedziały, nie niezależne dni/lata. Noc i przestoje nie uczą normalnej relacji.

Niski wynik sugeruje cień, zabrudzenie, problem panelu lub danych, ale nie rozstrzyga przyczyny. Równomiernego zacienienia całej połaci nie wykryje samo porównanie jej paneli między sobą.

Brak części optymalizatorów w InfluxDB nie oznacza ich zerowej produkcji. Diagnostyka ma niepełne odniesienie; całkowita energia AC nadal może prawidłowo zasilać prognozę. Nowy numer seryjny nie skleja automatycznie liczników poprzednika. Rozszerzenie eksportu nie dopisze brakujących lat.

To diagnostyka. Sezonowe ograniczenie prognozy pochodzi z Historycznego potencjału całości AC, nie z sumowania relacji paneli.

<!-- tab:voltage -->
## 10. Napięcia i przestoje

Kafelki i wykres pokazują trzy fazy. Oś dopasowuje się do danych dla czytelności; rzeczywiście niski odczyt nadal może poszerzyć zakres. 253 V jest progiem ostrzegawczym analizy, nie potwierdzonym ustawieniem zabezpieczenia. Przekroczenie samo nie dowodzi wyłączenia. Próbki uwagi dotyczą okresów produkcyjnych.

**Analiza dnia z InfluxDB** zestawia napięcia, moc, status i alarmy, początek zdarzenia i wcześniejszą pracę. Prawdopodobny przestój wymaga niskiej mocy, nieprawidłowego statusu, wysokiego napięcia przed zdarzeniem i wcześniejszej normalnej pracy. Luka nie jest przestojem. Długi czas przekroczeń może oznaczać znacznie krótszy czas wyłączeń.

**Wpływ na prognozę:** tabela pokazuje energię przed ryzykiem, końcową pozostałą, redukcję i kwadranse z korektą. To składniki jednej prognozy.

Dobierane są podobna moc, godzina ±1, sezon około ±60 dni i roboczy/weekend. Wymagane ≥5 dni i ≥2 dni z przestojem w dopasowanym zakresie. Bez tego mnożnik 1, nawet przy setkach zdarzeń globalnie. Letnie wyłączenia nie uzasadniają automatycznie redukcji listopadowej prognozy.

Strata jest szacowana względem mocy przed zdarzeniem; niewyprodukowanej energii nie da się bezpośrednio zmierzyć. Starsze obserwacje mają połowę wagi po 30 dniach. Nieaktualność i dalszy horyzont dodatkowo osłabiają wpływ. Maksymalna domyślna redukcja 30%, zwykle znacznie mniej. To oczekiwana strata, nie gwarancja awarii.

**Przekwalifikowanie historii** aktualizuje oznaczenia i odczytuje wybrany zakres sieci. „0 przekwalifikowanych kwadransów” może oznaczać, że oznaczenia były już aktualne, nie brak odczytu. Po pierwszym uzupełnieniu domyślnie ostatnie 3 dni raz na dobę; ręcznie dłuższy zakres.

Wysokie napięcie przy normalnej produkcji samo nie wyklucza potencjału. Faktyczne przestoje nie uczą trwałego zacienienia; ryzyko działa osobno. Nie zapisujemy na stałe całego surowego przebiegu napięć.

<!-- tab:sources -->
## 11. Źródła danych

**Odczyt źródeł:** dostępność przebiegów, czas odbioru i diagnostyka. Odczyt encji z HA nie wymusza nowej prognozy z chmury. Źródła mogą mieć różne horyzonty. Konfiguracja może łączyć połacie lub używać całości — nie dodawaj tego samego jednocześnie jako całości i połaci.

**Który dostawca wypada lepiej?** Ranking obejmuje te same poprawne okresy wszystkich aktywnych źródeł i ten sam horyzont. Stale niedostępne aktywne źródło może go blokować; napraw albo wyłącz. Wcześniej wagi pozostają równe.

**Czy pełny mechanizm pomaga?** Porównanie utrwalonych etapów, np. odniesienia, prostszej korekty, przed historią i końcowego wyniku. Para przed/po ryzyku ocenia sieć, także na poprawnie zmierzonych okresach z przestojem. Nie usuwa się ich tylko dlatego, że wtedy prognoza bez przestoju miała duży błąd. Niektóre starsze warianty nie istnieją; brak pozostaje brakiem.

**Dodatkowa diagnostyka:** pojedynczy dostawca może mieć inne okresy niż drugi. Ta tabela sama nie jest uczciwym rankingiem.

| Miara | Interpretacja |
| --- | --- |
| MAE | Średni błąd bezwzględny, mniej znaczy lepiej. |
| RMSE | Silniej uwydatnia duże błędy. |
| WAPE | Suma błędów bezwzględnych / rzeczywista energia ×100%; niestabilne przy małej produkcji. |
| Bias | Prognoza minus pomiar; plus oznacza zawyżanie. |
| Liczba porównań | Przedziały, nie liczba sezonów; nie porównuj bez sprawdzenia wspólnego zakresu. |

<!-- tab:potential -->
## 12. Historyczny potencjał

Szacuje wysoki poziom osiągalnej produkcji dla podobnej pory roku i Słońca. Krzywa nie musi być symetrycznym Gaussem: połacie, cień, pogoda i limit zmieniają kształt.

| Seria / kolumna | Co oznacza |
| --- | --- |
| Produkcja wybranego dnia | Pomiar; gwiazdka oznacza wyłączenie z uczenia. |
| Rekord historyczny | Maksimum danej godziny. Każda godzina może pochodzić z innego dnia. |
| Wysoki percentyl | Domyślnie p95, mniej wrażliwy na pojedynczy skok niż rekord. |
| Mediana | Środkowy poziom historii, również ze słabszą pogodą. |
| Model bezchmurnego nieba | Fizyczne odniesienie dla geometrii i lokalizacji, nie prognoza pogody. |
| Wysoki poziom po normalizacji | Wysoki poziom historyczny przeskalowany do warunków odniesienia wybranego dnia. |
| Odchylenie od modelu | Procentowa różnica tego poziomu od modelu odniesienia. |
| Dni / lata | Pokrycie danych w zakresie sezonowym. |
| Jasne obserwacje / lata | Dane zakwalifikowane do profilu lub jego dopuszczonych fragmentów. |
| Pewność / zastosowanie | Czy i jak mocno profil może działać, albo dlaczego nie działa. |

Nie sumuj rekordów godzin jako rekordu dobowego ani rekordów połaci jako rekordu całości.

### Kwalifikacja i normalizacja

Domyślnie porównujemy sąsiedztwo sezonowe około 31 dni z różnych lat. Czas odnoszony jest do Słońca. Normalizacja używa modelu promieniowania na połać, sprawności i limitu — to uproszczony model fizyczny, nie pomiar pogody na dachu.

Jasność jest wstępnie rozpoznawana z energii i pokrycia: co najmniej 3 godziny odniesienia, odpowiednie pokrycie i ≥60% modelu w porównywalnych godzinach. Stabilne poprawne fragmenty mogą działać z mniejszą wagą. Sama energia nie dowodzi bezchmurnej pogody.

Ostrożniejszy wariant statystyczny korzysta z poprawnych znormalizowanych obserwacji, jeśli brak jasnego profilu. Wymaga powtarzalnego wysokiego poziomu i pokrycia. Krzywą można narysować wcześniej, niż wolno użyć jej jako korekty.

Profil wstępny może działać od 10 kwalifikowanych dni i 2 sezonów rocznych. 30 dni oznacza dojrzałość, nie konieczność odrzucenia całej mniejszej historii. Starsze dane poziomu znormalizowanego mają połowę wagi po 3 latach; rekord i zwykłe percentyle pokazują zgodną historię.

„56% · Profil dojrzały — 42 jasnych dni” nie oznacza straty 44%. Liczebność jest dojrzała, lecz końcowa pewność uwzględnia inne warunki i może pozostać umiarkowana.

### Wpływ na wynik

Korekta korzysta z potwierdzonego **całego AC**. PV1/PV2 są diagnostyką; AC połaci często jest oszacowanym podziałem.

Domyślnie pełne cztery kwadranse godziny są ograniczane do kwalifikowanego wysokiego poziomu po normalizacji. Margines tego limitu wynosi początkowo 0 i jest edytowalny. To oszacowanie sezonowego potencjału, nie fizyczny rekord ani gwarantowane maksimum. Bezpiecznik pozwala obniżyć godzinę najwyżej o 75%; przy skrajnym zawyżeniu wynik może więc pozostać ponad poziomem odniesienia. Zachowujemy proporcje czterech kwadransów. Niska prognoza nie jest podnoszona. Brak kwalifikacji, niezgodna geometria albo niepełna godzina blokują korektę. W ustawieniach można wybrać dawny tryb łagodny: margines i maksymalna redukcja z dotychczasowych ustawień, a wpływ zależny od pewności. W nowym trybie pewność pozostaje informacją o profilu; nie jest mnożnikiem siły obcięcia. Sam rekord nie wyznacza limitu, ponieważ może być skokiem i może zostać pobity.

Skok nie powinien sam wyznaczać korekty: fizycznie niemożliwe przyrosty są wykluczane, a stosowany poziom wymaga powtarzalności. Sam rekord nadal bywa wrażliwy na błąd źródła; pomarańczowa linia nie jest mnożnikiem korekty. Kreska w pomiarze oznacza brak danych. Noc — korekta nie dotyczy — nie wymaga uczenia nocnej produkcji.

<!-- tab:imports -->
## 13. Import historii

**Połączenie InfluxDB:** adres, baza, użytkownik, hasło i polityka retencji. Odczyt nie zmienia źródła. Hasło przechowujemy oddzielnie, poza eksportem danych; kopia całego dodatku HA może je obejmować.

**Sprawdź encje** wyszukuje pomiary i jednostki. **Importuj historię** przetwarza dni. Warto zacząć małym zakresem. Pasek podaje dni, godziny, dostępne optymalizatory i kwadranse z problemami — wykluczone kwadranse nie oznaczają odrzucenia tylu całych dni.

**Pomiń dni już zapisane** pozwala wznowić. Odznaczenie przelicza zakres ponownie, ale nie tworzy braków w źródle. Zatrzymanie kończy po zapisaniu bieżącego dnia.

AC pochodzi z falownika. Podział połaci to szacunek proporcji V1×I1 i V2×I2, nie niezależny pomiar AC. Długich luk nie zastępujemy zerem.

**Wykryte encje:** rola, ID, jednostka albo brak w bazie. Istnienie teraz w HA nie oznacza archiwizacji w InfluxDB, a usunięcie z HA nie kasuje archiwum InfluxDB.

Przy nakładaniu się pomiarów statystyki HA mają pierwszeństwo. Istotna rozbieżność oznacza wykluczenie z uczenia, nie uśrednianie sprzecznych danych. Ponowny odczyt nie tworzy wielu niezależnych obserwacji tego samego okresu.

**Zużycie domu z historii:** dolny percentyl poprawnych godzin jest propozycją rezerwy. To nie pomiar czystego czuwania. Dopiero przycisk ustawia rezerwę planowania; sam import jej nie nadpisuje.

**Archiwa prognoz dostawców:** odczyt rozpoznanych plików Solcast/Open-Meteo z HA. Bez potwierdzenia czasu wydania poszczególnych wartości są opisowe; szacunki po fakcie nie zwiększają rankingu ani licznika kalibracji.

**Kontrola dnia:** kwadransowa energia, kwalifikacja i przyczyna. Nocne zero modelowe jest oznaczone. Wyłączenie z uczenia nie usuwa pomiaru z widoku i nie zawsze oznacza awarię — możliwa luka danych.

<!-- tab:history -->
## 14. Historia i trendy

Wykres historii, produkcja miesięczna i profile godzinowe pokazują kompletność, sezonowość i zmiany instalacji. Nie są dodatkowym mnożnikiem prognozy.

Import HA pobiera przyrosty energii Wh/kWh, partiami po 30 dni. Wymagane prawidłowe statystyki licznika: zwykle device_class energy oraz state_class total/total_increasing. Dzienny reset może być poprawny, jeśli HA prawidłowo rejestruje przyrost. Moc W nie jest energią.

„0 dni — brak statystyk przyrostów” wymaga sprawdzenia właściwej statystyki w HA. Sama zmiana nazwy czy klasy dziś nie tworzy dawnych przyrostów.

Historia jest trwała po ponownym wejściu. Przy włączonym automatycznym uzupełnianiu odczytywany jest ostatni zakres. Dzisiejsze dane stają się użyteczne po zakończeniu okresów i udostępnieniu statystyk. Otwarcie zakładki nie oznacza nowego importu całych lat. Poprawne dane mogą zasilać Historyczny potencjał.

<!-- tab:storage -->
## 15. Pliki i retencja

Na wejściu automatycznie odczytujemy listę plików i rozmiary. „PV Lab — kod i dane” to suma plików kodu aplikacji oraz jej katalogu danych, w MiB (1 MiB = 1 048 576 bajtów). Osobno pokazujemy kod i dane, w tym rozmiar prywatnej konfiguracji. Nie jest to rozmiar całego kontenera, bazy HA, InfluxDB ani kopii HA. Rozmiary są buforowane przez 30 sekund. Przy pliku „Podejrzyj” pokazuje pierwsze 32 kB, a „Pobierz” zapisuje cały plik. Duże pliki są przesyłane strumieniowo. Klucz API Gemini, klucz parowania, hasło InfluxDB, katalogi i dowiązania nie są udostępniane do pobrania. Archiwum Energii nadal nie ma automatycznej retencji.

Brak nowej bazy. Dane to JSON i JSONL w `/data` dodatku; ta ścieżka nie musi być dostępna w File Editorze.

| Dane | Przeznaczenie / zachowanie |
| --- | --- |
| settings.json, model.json | Konfiguracja oraz wyuczone korekty, wagi i agregaty. |
| Próbki | Domyślnie 7 dni. |
| Prognozy i publikacje | Domyślnie 14 dni wersji. |
| Historia zmian | Domyślnie 90 dni. |
| influx-day-RRRR-MM-DD.json | Trwałe kompaktowe energie i jakość dni, bez surowej historii napięć. |
| influx-history.json, archiwa statystyk | Trwała historia zbiorcza. |
| grid-risk.json | Zagregowane ryzyko, nie pełen zapis woltów. |
| energy-forecast-archive.json | Prognozy do Energii, bez automatycznej retencji. |
| reports.json | Porównania agregowane godzinowo/dobowo/miesięcznie/rocznie. |
| batch-plan.json | Zachowana konfiguracja dawnego planera, nie nowa wspólna lista. |
| dashboard-plan.json | Najnowsze propozycje karty HA oraz stan jawnego zatwierdzenia; bez sterowania sprzętem. |
| appliance-live.json | Kompaktowy bieżący stan pracy urządzeń cyklicznych; bez surowej historii mocy. |
| unified-plan.json | Wspólna lista cykli, daty, bilans i terminy zakończenia urządzeń; trwałe ustawienia od 0.8.6. |
| panel-layout.json | Pozycje i orientacja paneli; wyłącznie prezentacja, trwały zapis. |
| appliance-profiles.json | Cykle i profile. |
| optimizer-settings/load/history.json | Ustawienia, oczyszczona baza i zapisane plany/oceny. Nazwy trzech osobnych plików zaczynają się od optimizer-. |

Surowe napięcia domyślnie nie są trwale przechowywane (0 godzin). Krótki bufor może być w pamięci. Wieloletnim źródłem pozostaje InfluxDB. Retencja próbek nie usuwa automatycznie wyuczonych agregatów.

Podgląd pliku ma limit pierwszych 32 000 bajtów. Nie jest pełnym pobraniem dużego pliku. Pełny stan pobierz przez **Eksportuj kopię danych** w Ustawieniach. Eksport nie zawiera klucza parowania i hasła InfluxDB, ale ujawnia dane o domu i urządzeniach — nie publikuj go w repozytorium.

Brak automatycznego kasowania prognozy Energii nie chroni przed usunięciem danych dodatku lub awarią nośnika. Rób kopie HA. Nie ma odtworzenia archiwum, którego nigdy nie zapisano.


### Bezstratna kompresja i kopie (0.8.5)

Przy pierwszym starcie dzienniki forecast-RRRR-MM-DD.jsonl i published-RRRR-MM-DD.jsonl są kompresowane algorytmem GZIP na miejscu. Przed atomową podmianą sprawdzamy, że rozpakowane bajty są identyczne z oryginałem. Wszystkie rekordy, czasy wydań, źródła, warianty i precyzja pozostają. Nowe rekordy są dopisywane jako kolejne człony GZIP; format obsługuje także wcześniejszy zwykły tekst. Nie tworzymy drugiej trwałej kopii każdego pliku. Podczas podmiany potrzebne jest chwilowe miejsce na jeden plik tymczasowy. Uszkodzenie nie jest maskowane: przy urwanym końcu zachowujemy uszkodzone dane jako .partial i odzyskujemy poprawne rekordy, a przy błędzie sumy kontrolnej odczyt zgłasza błąd.

Nazwy logiczne w /data pozostają takie same, ale zawartość tych dwóch rodzajów dzienników może być binarna GZIP. Przeglądarka plików pokazuje rzeczywisty rozmiar skompresowany i oznaczenie. „Podejrzyj” automatycznie rozpakowuje do czytelnego tekstu. „Pobierz GZIP” dodaje rozszerzenie .gz, a „Pobierz JSONL” pobiera rozpakowany tekst. Małe ustawienia, próbki, importowane dni i archiwum Energii zachowują wcześniejszy format. Starsza wersja aplikacji nie obsługuje nowego skompresowanego dziennika: przed powrotem trzeba rozpakować te dzienniki albo odtworzyć kopię dodatku HA.

Kompresja nie usuwa historii, ale nie wyłącza też ustawionej retencji. Wersje prognoz nadal mają skonfigurowany okres przechowywania, a archiwum prognozy Energii pozostaje trwałe. Nie zmieniamy liczby dni na potrzeby oszczędności miejsca. Informacja o oszczędności przy pierwszym starcie dotyczy skompresowanych dzienników; całość aplikacji obejmuje również inne dane.

„Pobierz mniejszą kopię JSON.gz” daje standardowy plik GZIP zawierający ten sam komplet danych co zwykły eksport JSON. Zwykły JSON jest nadal dostępny. Strumieniowy eksport kompresuje kolejne rekordy bez budowania jednego ogromnego tekstu całej kopii w pamięci. Schemat kopii pozostaje w wersji 2, dodano numer aplikacji appVersion. Tak jak wcześniej eksport zawiera zbiorczą historię, a pełna kopia dodatku HA obejmuje również indywidualne pliki dni i plik poświadczeń. Kopia JSON nie jest kopią całego Home Assistant ani InfluxDB.

<!-- tab:integration -->
## 16. Integracja HA i Energia

Aplikacja oblicza, integracja HACS udostępnia encje i platformę prognozy. Zakładka pokazuje adres, klucz i test. Klucz zachowaj w poufności. Test rozróżnia wykrycie platformy, załadowanie integracji, wybranie w Energii i liczbę godzin. Wykryta platforma z 0 godzin nie jest tym samym co brak platformy.

| Encje | Zastosowanie |
| --- | --- |
| Dziś, jutro, kolejne dni | Energia prognozy dostępnego horyzontu. |
| Pozostało dziś / w godzinie | Energia przyszłej części okresu. |
| Okna 1/2/3 godziny dziś/jutro | Energia, termin, status; część dodatkowych encji wymaga włączenia w HA. |
| Obliczenie i zmiana | Czas, kierunek i różnica. |
| Parametry planowania | Zapotrzebowanie, czas, rezerwa, profil — bez sterowania sprzętem. |
| Optymalizator | Status/koszt planu i terminy, koszty, statusy slotów zadań. |

Sloty odpowiadają kolejności aktywnych zadań. Sprawdź atrybut ID/nazwy przed automatyzacją, zwłaszcza po zmianie kolejności. Nie są automatycznym sterownikiem pralki.

W Energii pozostaw rzeczywisty licznik produkcji. W prognozie paneli słonecznych wybierz PV Lab — to prognoza **produkcji**, nie pogody. Po aktualizacji integracji może być potrzebny restart HA.

Przyszłe godziny są aktualizowane, zakończone zachowują wcześniej utrwaloną prognozę. Nie nadpisujemy ich nowym modelem i nie przycinamy automatycznie archiwum. Brak dawnych zapisów nie jest uzupełniany późniejszą produkcją.

Wersja w HACS pochodzi z wydania GitHub. Upload bez udanej publikacji wydania może pozostawić numer commitu zamiast numeru wersji. Odświeżenie HACS nie naprawi nieopublikowanego wydania.

<!-- tab:settings -->
## 17. Ustawienia

Sprawdź lokalizację, strefę, połacie, limit i jednostki. Nazwa falownika jest opisem; limit W działa w obliczeniach. Wp, pochylenie i azymut wpływają na model odniesienia. Encje V/A wspierają diagnostykę i podział AC.

Wyłączenie dostawcy w konfiguracji usuwa jego udział w obliczeniach i wspólnym rankingu. Ukrycie linii nie robi tego. Parametry jakości określają świeżość, pokrycie i dopuszczone statusy.

**Statystyki:** produkcja AC falownika to rzeczywista energia, nie moc W czy prognoza. PV1/PV2 podzielone proporcją DC oznacz jako oszacowanie AC, nie niezależne liczniki DC. Potwierdzenie semantyki nie naprawia szablonu i nie tworzy historii.

**Bilans domu:** „potwierdzone encje” oznacza prawidłowy zakres całego domu, jednostki i znak. „Liczniki narastające są już zbilansowane godzinowo” dotyczy samych wskazanych liczników importu/eksportu. Jeśli godzinowe saldo liczy osobna encja, a liczniki narastają na bieżąco, pozostaw tę opcję wyłączoną.

Urządzenia mają nazwę, encję mocy, opcjonalną energię i progi wykrywania. Ustawienia cen i bazy optymalizatora są odrębne od kalibracji PV. Ich zmiana nie wymaga jej kasowania. Przed większym importem/zmianą eksportuj kopię; zaawansowany JSON przechodzi walidację.

## 18. Obliczenia i częstotliwość

1. Przebiegi dostawców są sprowadzane do Wh kwadransa i łączone bez duplikowania połaci.
2. Punkt odniesienia dostaje limit falownika: 5500 W to 1375 Wh/kwadrans i 5,5 kWh/godzinę.
3. Kalibracja dostawcy zależy od horyzontu, a przy odpowiednich danych od sezonu i położenia Słońca; po niej ponownie limit.
4. Źródła są łączone średnią ważoną na podstawie wspólnych wcześniejszych ocen.
5. Świeża produkcja dostosowuje najbliższą prognozę, ze słabnącym wpływem.
6. Kwalifikowany potencjał ogranicza godzinowe zawyżenie zgodnie z wybranym trybem.
7. Ryzyko sieci odejmuje oczekiwaną stratę.
8. Końcowe kwadranse zasilają sumy, okna, planowanie i integrację.

Kalibracja korzysta ze stosunku skumulowanej energii rzeczywistej i prognozowanej z wygładzeniem 200 Wh. Mnożnik ograniczony do 0,25–1,75, wpływ narasta z liczbą obserwacji. Lokalny koszyk jest preferowany domyślnie od 20; wcześniej działa szerszy dostawca/horyzont z wolniejszym narastaniem. To nie znaczy, że wszystkie korekty są wyłączone do 20. próbki.

Waga zależy od błędu względnego po korekcie: odwrotność kwadratu błędu powiększonego o 0,15, ograniczona do 0,1–10 i normalizowana. Wspólne okresy zabezpieczają uczciwość porównania.

Korekta bieżąca wymaga ≥3 świeżych poprawnych próbek oraz wystarczającej prognozy. Stosunek pomiaru do prognozy jest ograniczony do 0,3–1,5, wpływ zanika w skali około godziny. Jedna chmura nie przepisuje całego jutra.

Domyślny odczyt HA co 60 sekund, dostawców co 15 minut. Sam dostawca może aktualizować rzadziej. Plan optymalizatora przeliczany podczas odczytów najwyżej co 5 minut lub po granicy okresu oraz ręcznie. Czas odczytu mocy i czas planu to różne informacje.

## 19. Diagnostyka i ocena efektu

| Objaw | Co sprawdzić |
| --- | --- |
| Moc domu — nocą | Czy encja istnieje, jednostkę, znak sieci, moc PV oraz świeżość/błąd HA. |
| Import bazy nic nie zmienia | Tryb stały/historyczny, postęp, godziny/kwadranse, brakujące urządzenia, minimalne dni i tabelę źródła kwadransów. |
| Lata domu, brak bazy | Historia energii wszystkich odejmowanych urządzeń. Cały dom to nie oczyszczona baza. |
| Ryzyko 0 | Dni i przestoje dopasowane do danej mocy/sezonu, nie licznik globalny. |
| Potencjał 0% | Kwalifikację, dni/lata, powtarzalność i pokrycie; narysowana linia nie dowodzi dopuszczenia korekty. |
| Brak rankingu | Wcześniejsze prognozy wszystkich aktywnych źródeł dla wspólnego horyzontu. |
| Brak wariantu przed historią | Rzeczywisty czas zapisu etapu, nie tylko datę produkcji. |
| Stary wygląd po uploadzie | Wersję dodatku, udane wydanie, ponowne otwarcie panelu i pamięć starej karty. |
| HTTP 502 /states | Połączenie/obciążenie HA i Supervisor. To błąd, nie nocne zero. |

Do diagnozy przekaż wersje, datę, zrzut właściwej karty, stan/jednostkę problematycznych encji i zakończenie importu. Pełna kopia zawiera znacznie więcej prywatnych danych niż raport; nie publikuj jej publicznie.

Dowodem poprawy jest mniejszy błąd na późniejszym porównywalnym pomiarze. Samo obniżenie prognozy nie dowodzi lepszej trafności. Oceniaj wspólny horyzont, liczbę okresów i więcej rodzajów pogody/sezonów.

## 20. Aktualność instrukcji

Źródło to pv_lab/DOCS.md. Z niego generowana jest instrukcja HTML w bocznym menu oraz plik do przekazania innej osobie. Home Assistant pokazuje ten sam dokument źródłowy w dokumentacji aplikacji.

Każde wydanie wymaga przeglądu zmienionych ekranów, obliczeń, ustawień, retencji i ograniczeń oraz aktualizacji wersji instrukcji. Kontrola publikacji sprawdza wersję, opis wszystkich zakładek i odciski plików programu. Zmiana kodu bez ponownego przygotowania dokumentacji blokuje wydanie.

Kontrola techniczna nie dowodzi merytorycznej kompletności. Zasady repozytorium wymagają przeczytania i poprawienia opisu przy każdej zmianie — samo podmienienie numeru nie wystarcza.

HTML działa bez internetu; można go wydrukować lub zapisać do PDF z przeglądarki. W razie różnic najpierw porównaj numer instrukcji i aplikacji.


Włączenie „Zużycie domu — baza” lub „Nadwyżka PV po odjęciu domu” działa również z widoku W: aplikacja automatycznie przełącza wykres na energię godzinową kWh i zapamiętuje tę jednostkę. Pola nie są blokowane w widoku mocy. Obie dodatkowe linie pozostają domyślnie wyłączone.


## Kontrola stabilności od wersji 0.8.2

Zapisy JSON są wykonywane kolejno, z kopią wartości z momentu zlecenia zapisu. Zmniejsza to ryzyko kolizji równoczesnych operacji. Migracja istniejącego cennika zachowuje własne stawki, daty i wybór depozytu; wartości domyślne dotyczą nowych konfiguracji. Puste tekstowe pomiary, w tym same spacje, nie oznaczają zera. Niepoprawne wartości mocy nie mogą tworzyć pozornej zmierzonej energii.

Ryzyko sieci sprawdza próg energii i zakończenie okresu przed odczytem wyniku z pamięci podręcznej. Słaby kwadrans poniżej 25 Wh nie przejmuje potrącenia z mocniejszego kwadransa tej samej godziny. Zasady identyfikowania przestoju, wymagane dni i maksymalna redukcja pozostają bez zmian. Wyniki cenowe nadal są symulacją przy podanych stawkach; aplikacja nie pobiera rachunku ani nie przewiduje automatycznie przyszłej RCEm.


## Odświeżanie, raporty i ocena limitu od wersji 0.8.2

„Odczytaj dane” wymusza świeży odczyt pomiarów i dostępnych prognoz z Home Assistant oraz ponowienie statystyk kWh. Omija interwał PV Lab; nie jest poleceniem zmiany harmonogramu dostawców chmurowych. Dodatkowy przycisk „Odśwież pomiary kWh” w raportach ponawia tylko statystyki energii. Równoległe żądania statystyk są łączone w jedno. Przycisk nie tworzy brakujących pomiarów.

Automatycznie sprawdzamy statystyki co 2 minuty, po pierwszym odczycie godziny pobierając tylko ostatnie 2 godziny; szersze uzupełnienie następuje raz na godzinę. Błąd nie blokuje ponowienia do kolejnej pełnej godziny. Linia pełnych pomiarów pokazuje zakończone godziny kWh; punkt 08:30 oznacza całe 08:00–09:00. Poprawne całkowanie mocy jest źródłem zastępczym, a brak danych pozostaje brakiem. Panel raportu pokazuje czas odczytu statystyk i ewentualny błąd.

„Prognoza a produkcja” ma wykres z wyborem dnia i źródeł. Przy poziomie dni/miesięcy/lat wykres pokazuje kompletne sumy, a niepełne pozostają w tabeli jako częściowe. Obok jest porównanie średniego błędu źródeł na tych samych godzinach. Liczba wygranych wierszy nie jest jedyną miarą trafności. „Historia i trendy” pokazuje także miesięczny przebieg energii z importu; są to sumy pełnych dni, kompletność nadal widać w tabelach.

Limit po normalizacji został wybrany po retrospektywnym porównaniu kilku wariantów na dostępnych wcześniej zapisanych prognozach. Przy wyznaczaniu profilu wykluczono późniejsze pomiary; nie odtwarzamy jednak dawnej dostępności i kwalifikacji wszystkich plików. Próba jest krótka i nie stanowi niezależnego testu przyszłych dni. Zmiana działa na nowe prognozy. Stare publikacje, raporty i godziny w Energii pozostają zapisami starej wersji i nie są poprawiane po fakcie.


## Zakresy godzin i bieżąca produkcja od wersji 0.8.2

Na godzinowych wykresach kWh oś pokazuje zakresy, np. **09–10**, **10–11**, zamiast czasu środka przedziału. Punkt nadal leży w środku godziny, lecz opis wskazuje cały zakres. Dotyczy to głównego wykresu, archiwum godzinowego, raportu godzinowego oraz porównania z panelem Energia. Osie W, kwartalne oraz podsumowania dobowe/miesięczne nie zmieniają jednostki. Przy jesiennej powtórce godziny dodajemy oznaczenie przesunięcia, aby odróżnić przedziały.

Na głównym wykresie bieżącego dnia trwająca godzina ma podświetlone tło i osobny pusty, przerywany niebieski znacznik. Nie jest połączony z linią pełnych pomiarów. Pod wykresem widnieje np. „10–11 · Wyprodukowano dotychczas: 0,720 kWh”, czas ostatniego odczytu oraz źródło. Włącza i wyłącza go istniejąca opcja **Pomiar**; widok W zachowuje bieżącą moc.

Wartość oznacza wyłącznie zmierzoną energię od początku godziny do ostatniego poprawnego odczytu. Pierwszeństwo ma różnica narastającego licznika AC, następnie licznika dziennego. Początek może być interpolowany między bliskimi odczytami — wtedy jest to opisane w źródle. Reset albo nieprawdopodobny przyrost wyklucza ten licznik z obliczenia. Nie dopisujemy prognozowanej energii do części już zmierzonej i nie przeliczamy wyniku na całą godzinę.

Jeżeli brak odpowiednich liczników, używamy całki z mocy AC, tylko przy co najmniej 95% pokrycia minionego okresu; źródło pokazuje pokrycie. Nie uzupełniamy luk ani czasu po ostatnim odczycie prognozą. Brak świeżych danych daje komunikat i brak znacznika, a nie 0 kWh. Zmierzone 0 pozostaje poprawnym zerem. O pełnej godzinie poprzednia wartość częściowa znika, a zakończony przedział pojawia się na linii po otrzymaniu jego pełnego pomiaru. Archiwum i raporty zachowują pełne godziny; częściowego wyniku nie zapisujemy jako prognozy lub pełnej produkcji. Zmiana dotyczy prezentacji i pomiaru bieżącego, nie algorytmu prognozy, rozliczeń ani kalibracji.

## Aktualizacja 0.8.5 — rozdzielenie wpływu korekt

Raport zapisuje dodatkowy wariant without_tomorrow. Karta „Czy korekta na jutro poprawia wynik?” porównuje go z końcowym PV Lab dopiero po zakończeniu godzin. Brak wcześniejszego wariantu nie jest rekonstruowany dzisiejszym modelem. Aby nie przypisywać tej zmiany historii lub napięciu, ocena historii korzysta z wariantu sprzed korekty na jutro, jeśli jest dostępny, a wspólna ocena ryzyka sieci kończy się przed nią. Historyczne oceny i prognozy pozostają zapisami swoich wydań.


## Naprawa niekompletnej aktualizacji

ERR_MODULE_NOT_FOUND z nazwą schedule-alternatives.mjs oznacza brak wymaganego pliku kodu, a nie uszkodzenie historii. Porównaj katalog repozytorium z pełnym wydaniem tej samej wersji i uzupełnij brakujący plik z zachowaniem podkatalogów. Pakiet przyrostowy 0.8.14 zawiera tylko zmiany względem 0.8.13; nie zastępuje pełnej instalacji starszego, niekompletnego wydania. Odśwież repozytorium aplikacji i wykonaj aktualizację, która przebuduje obraz. Sam restart starego obrazu nie doda brakujących plików. Nie odinstalowuj aplikacji i nie kasuj /data. Historia, modele, ceny i profile pozostają bez zmian; ponowny import nie jest potrzebny. Przed wydaniem kontrolujemy lokalne importy w src i public oraz uruchamiamy testy. To kontrola kodu, nie zmiana obliczeń ani retencji.

Rejestracja pliku karty HA następuje przed pierwszym odczytem aplikacji. Niedostępna aplikacja nie blokuje już udostępnienia /pv_lab_frontend/pv-lab-plan-card.js. Planowanie wymaga jednak działającej i sparowanej aplikacji. Po aktualizacji HACS uruchom ponownie HA. Gdy adres pliku nadal zwraca 404, sprawdź obecność pliku /config/custom_components/pv_lab/www/pv-lab-plan-card.js i log uruchomienia integracji PV Lab. Sama instalacja HACS bez skonfigurowanej integracji PV Lab nie rejestruje pliku.

Na karcie pod ceną znajduje się cienki pasek udziałów energii: zielony PV i bilans, pomarańczowy Do dokupienia. Procent zakupu = dodatkowa energia do dokupienia po bilansowaniu / suma energii cykli, ograniczony do 0–100%; zielony jest dopełnieniem. To udział po rozliczeniu okresów, a nie fizyczny pobór w każdej minucie. Baza domu i trwające cykle są już uwzględnione przed nowymi cyklami. Przy brakującej energii lub niepoprawnym wyniku pasek jest pomijany, nie pokazuje fikcyjnego 100% PV. Gdy miniona część bieżącego okresu miała saldo importu, dodatkowy zakup może być większy niż energia cykli; udział jest wtedy ograniczony do 100%, a wyliczony koszt nie jest obcinany. Procenty zaokrąglamy do pełnych liczb.

### Minimalistyczny układ karty (0.8.14)

Usunięto opisową ramkę Stan: propozycje. Numer planu, kwota, przycisk ? i Zatwierdź są w jednym nagłówku. Po zatwierdzeniu przy wybranym planie widać Zatwierdzony i zielone obramowanie; nad listą pojawia się Anuluj zatwierdzony plan. Ewentualne błędy i przyczyny wycofania pozostają czytelne, nie są ukrywane. Nazwa cyklu i jego przedział czasowy są w jednym wierszu, z datą oraz godziną początku i końca; długie nazwy są skracane wizualnie z pełną nazwą w opisie. Cienki zielono-pomarańczowy pasek udziałów energii pozostaje bez zmian. Przycisk ? otwiera szczegóły danego planu: zakup kWh, zapas PV, wariant kosztu przy innej pogodzie, czas obliczenia i źródła profili. Przycisk działa na telefonie bez najeżdżania kursorem. Rozwinięcie jest lokalnym stanem widoku, nie zapisuje nowej historii. Zmiana liczby cykli lub dni blokuje zatwierdzenie starych wyników do ponownego przeliczenia. Samo rozwinięcie szczegółów nie steruje gniazdkami; od 0.9.4 nowe zatwierdzenie na aktualnej karcie uzbraja wykonanie. Zmiana doboru alternatyw nie zmienia zasad energii, taryfy, reguły dopłaty 5 gr, danych historycznych ani retencji.

### Dobór słonecznych propozycji i wariant bez PV (0.8.14)

Pokrycie = suma energii nowych cykli minus dodatkowy zakup po bilansowaniu, z tolerancją liczbową 0,000001 kWh. Dlatego nie chodzi o fizyczny brak poboru z sieci w każdej minucie. Baza i pracujące już urządzenia są uwzględnione przed nowymi cyklami. Bardzo mały dodatni udział poniżej 1% pokazujemy na pasku do dwóch miejsc po przecinku, zamiast zaokrąglać go do 0%; pozostałe udziały pozostają całkowite.

Dla pojedynczego urządzenia analizujemy wszystkie dopuszczalne starty co 15 minut. Dla kilku cykli nadal używamy ograniczonego przeszukiwania różnych kolejności i poprawek; najtańszy znaleziony nie oznacza udowodnionego minimum wszystkich kombinacji. Karta szuka propozycji ze słońcem w pełnej puli znalezionych planów obu celów, a pełny widok aplikacji zachowuje do dziesięciu zróżnicowanych propozycji i oba porównania. Nie usuwamy zapisanych raportów ani wariantów historycznych. Zatwierdzanie wskazuje stabilny identyfikator konkretnej propozycji z puli karty, żeby po filtrowaniu nie zapisać przypadkiem planu o tym samym numerze w pełnej tabeli. Zapis porównania i blokady sprzętu pozostają bez zmian; wykonanie zatwierdzeń na karcie opisuje sekcja 0.9.4. Nie zapisujemy pełnej surowej puli kandydatów na dysku; stan karty zawiera maksymalnie trzy propozycje, a przy całkowitym zakupie jedną.

Wśród pełnych kandydatów z PV/bilansem karta przechodzi po rankingu kosztu i zapasu, wybierając kolejne wyraźnie różne plany (jak dotąd co najmniej 30 minut zmiany lub inna kolejność sprzętu). Nie wymusza skrajnie wczesnego lub późnego wariantu wyłącznie dla różnorodności. Pełny widok aplikacji nadal pokazuje szersze porównanie alternatyw.

### Jedna rekomendacja i rozwijane alternatywy (0.8.14)

Karta domyślnie pokazuje jeden polecany plan. Strzałka Pozostałe plany rozwija pozostałe przygotowane propozycje, a Ukryj je zwija. Zielona strzałka oznacza, że wszystkie ukryte plany mają zerowy zakup po bilansowaniu (tolerancja 0,000001 kWh). Pomarańczowa oznacza, że co najmniej jeden ukryty plan wymaga dokupienia energii. Kolor dotyczy całej ukrytej grupy, nie planu widocznego. Podpowiedź i opis dostępności wyjaśniają znaczenie koloru; przy brakującym pomiarze nie deklarujemy pełnego PV i używamy szarego oznaczenia. Przy jednej propozycji nie ma strzałki. Nowe przeliczenie ponownie zwija listę. Jeśli zatwierdzono inny plan, po zwinięciu widoczny pozostaje zatwierdzony, a pozostałe są pod strzałką. Jest to wyłącznie lokalny stan widoku — nie zapisuje kolejnej historii i nie zmienia obliczeń. Bardzo małe udziały zakupu oraz PV poniżej 1% pokazujemy do dwóch miejsc po przecinku, zamiast mylącego 100%/0%.

### Start taniej strefy i godzina szczytu PV (0.8.14)

Pod główną listą Proponowane harmonogramy jest tabela dodatkowych porównań. Dla każdej doby wybranego zakresu wyliczamy dwa warianty całej kombinacji urządzeń: start w dziennej taniej strefie i start na początku godziny o największej prognozowanej energii PV Lab. Domyślna taryfa daje 13:00 zimą i 15:00 latem, ale używamy zapisanych okien i miesięcy letnich, a nie stałych godzin w kodzie. Jako dzienne wybieramy najwcześniejsze skonfigurowane okno zaczynające się między 06:00 a 18:00. Brak takiego okna jest opisany; nie wymyślamy stawki. W dzień całkowicie objęty tanią strefą, np. weekend G12w, przy porównaniu widnieje informacja, że o tej godzinie nie występuje dodatkowa obniżka ceny. Godziny są w strefie instalacji, z uwzględnieniem czasu letniego.

Szczyt to pełna godzina z największą sumą czterech kwadransów aktualnej prognozy końcowej PV Lab, a nie chwilowa maksymalna moc ani nadwyżka po domu. Przy remisie wybieramy wcześniejszą godzinę. Brak pełnej godzinowej prognozy z dodatnią energią jest oznaczony brakiem danych. Jeśli szczyt wybranego dnia już minął lub jest przed własnym początkiem zakresu, nie przesuwamy go na drugą najlepszą godzinę. Status wyjaśnia, dlaczego start nie jest dostępny.

Dla kilku urządzeń co najmniej jeden cykl musi rozpocząć się dokładnie w wskazanej godzinie. Pozostałe rozpoczynają się najwcześniej wtedy, gdy pozwalają ograniczenia; ten sam sprzęt działa kolejno. Próby różnych pierwszych urządzeń uwzględniają zajętość, terminy zakończenia, dozwolone godziny, prognozę, bazę domu, ceny i limit poboru. Nie uruchamiamy dwóch prań równocześnie. Jeśli nie mieści się pełna kombinacja, tabela podaje powód i nie umożliwia zapisania niepełnego wariantu.

Koszt porównania dotyczy całego planu i jest liczony tym samym mechanizmem bilansowania oraz taryf co rekomendacja. Dopuszczalne pełne porównania trafiają też do puli poszukiwania rekomendacji; nie wypierają automatycznie najlepszego planu. Jeżeli identyczny harmonogram już jest na głównej liście, tabela wskazuje numer planu zamiast udawać nową alternatywę. Pokaż ten plan otwiera jego cykle, koszt i wykres; można zapisać go do późniejszej weryfikacji. Zapis jest świadomą czynnością, a nie sterowaniem sprzętem. Obliczanie porównań nie zapisuje surowych kandydatów na dysku i nie zmienia prognozy PV, taryfy ani dotychczasowej historii.


## Wygląd karty — opcje YAML

Widok kompaktowy jest domyślny. Istniejąca karta po aktualizacji nie wymaga zmiany YAML. Wariant pełny przywraca większe odstępy i opisy.

```yaml
type: custom:pv-lab-plan-card
layout: compact
title: Moje urządzenia
show_header: true
max_plans: 3
show_energy_bar: true
show_details: true
show_program_variants: true
show_program_in_device: true
default_cycles: {zmywarka: 0, pralka: 0}
program_variants_style: select
show_program_duration: true
show_program_energy: true
program_variants_position: details
```

| Opcja | Domyślnie | Działanie |
| --- | --- | --- |
| `layout` | `compact` | `compact`: mniejsze odstępy, Dziś/Jutro/Zaplanuj w jednym wierszu, bez opisu i powtórzenia wyboru. `full`: dotychczasowy obszerniejszy układ. |
| `title` | `Zaplanuj uruchomienie` | Dowolna nazwa. `title: ""` ukrywa nagłówek. |
| `show_header` | `true` | `false` ukrywa nagłówek, zachowując wpisaną nazwę w konfiguracji. |
| `max_plans` | `3` | Liczba głównych propozycji na karcie: 1, 2 lub 3, przed usunięciem duplikatów. Nazwane porównania są dodatkowe. Domyślnie widoczny jest jeden, pozostałe rozwija strzałka. |
| `show_energy_bar` | `true` | `false` ukrywa pasek i procenty PV/bilans–sieć. |
| `show_details` | `true` | `false` ukrywa przycisk `?` oraz szczegóły. Zatwierdzenie pozostaje dostępne. |
| `entry_id` | automatycznie | Identyfikator integracji przy kilku instalacjach; dotychczasowe działanie pozostaje. |

Najmniejsza karta: `show_header: false`, `max_plans: 1`, `show_details: false`. Wersja pełna: `layout: full`. Zachęcamy do pozostawienia paska energii — szybko pokazuje zakup z sieci. Wszystkie te parametry zmieniają tylko wygląd, nigdy model, taryfę, liczbę cykli ani ranking. Zatwierdzony plan pozostaje widoczny także wtedy, gdy po zmniejszeniu `max_plans` znalazłby się poza zakresem. Pełne alternatywy nadal są w aplikacji.

W kompaktowej karcie przyciski `?` i zatwierdzenia są mniejsze, a przycisk pozostałych planów jest blisko rekomendacji, po prawej. Urządzenia nadal wybierasz dotykiem 0 → 1 → 2 → 3 → 0, z zielonym zaznaczeniem i małą liczbą przy wybranym sprzęcie.

<!-- tab:ai -->
## Analiza AI — opcjonalne testy Gemini

Moduł znajduje się w menu „Analiza AI”. Domyślnie jest wyłączony. W demonstracji nie odczytuje prawdziwych ustawień ani raportów AI; najpierw wróć do danych rzeczywistych. Nie wymaga nowej integracji HA. Prognozy, korekty, bilansowanie i planowanie nadal działają lokalnie według dotychczasowych reguł. AI jest doradcą opisującym przygotowane liczby; nie steruje urządzeniami, nie zmienia ustawień i nie staje się dodatkowym dostawcą prognozy.

1. Otwórz „Analiza AI”. Klucz z Google AI Studio wpisz w pole hasła, wybierz model, włącz ręczne analizy i zapisz. Puste pole klucza przy kolejnym zapisie zachowuje poprzedni. „Usuń zapisany klucz” wyłącza moduł i czyści klucz, pozostawiając raporty.
2. Wybierz temat: trafność prognozy, planowanie urządzeń lub jakość danych. „Przygotuj podgląd danych” wykonuje wyłącznie lokalne obliczenia, także przy wyłączonym AI. Sam zapis konfiguracji również niczego nie wysyła.
3. Przejrzyj dokładny JSON. Podgląd jest ważny 10 minut; zmiana ustawień AI lub restart wymaga przygotowania go ponownie.
4. Dopiero „Wyślij do Gemini i przeanalizuj” wysyła widoczny zestaw do Google. Zablokowano równoległe analizy i automatyczne ponawianie. Nie ma zadań cyklicznych AI.
5. Raport odczytasz poniżej, wraz z czasem, modelem i danymi, na których powstał. Zachowujemy 10 ostatnich raportów; starsze raporty AI są zastępowane. Historia produkcji i prognoz pozostaje bez zmian.

**Dane i obliczenia:** podgląd zawiera do 8 sum dobowych aktualnego oczekiwanego wyniku (dziś: pomiar + pozostała prognoza), osobno energię pozostałą i do 48 najnowszych zakończonych wierszy ocen z ostatnich 7 dni. To prognozy wcześniej zapisane w raporcie, nie dzisiejsze przeliczenie przeszłości. Oceny bieżącej i jutrzejszej prognozy liczymy oddzielnie, na wspólnych kompletnych godzinach dostępnych źródeł. MAE to średni błąd bezwzględny w kWh; błąd ostrożności waży zawyżenie 100%, niedoszacowanie 50%; bias to średnia (prognoza − pomiar). Nie ma danych = brak oceny, nie 0. W temacie planowania dołączamy do 3 planów kosztowych: wspólny koszt, zakup, zapas i anonimowe cykle wraz z czasami. Brak planu pozostaje brakiem. Podgląd nie zawiera kluczy, identyfikatorów encji, numerów paneli, lokalizacji, adresów HA ani pełnych historii. Liczby mają kWh/PLN, czasy Unix ms oraz strefę czasową. Moduł nie pobiera historii ponownie z HA ani InfluxDB.

**Parametry:** domyślny model `gemini-3.5-flash-lite` można zmienić na identyfikator Gemini dostępny w swoim projekcie. Domyślny lokalny limit to 5 prób dziennie (zakres 1–20, dzień Europe/Warsaw). Próba wysłana do usługi zużywa limit także przy błędzie. Limit jest trwały po restarcie, ale nie zastępuje limitu wydatków Google. Oczekiwanie trwa maksymalnie 45 sekund; odpowiedź tekstowa ma lokalny limit 12 000 znaków. Niepełna odpowiedź jest zgłaszana jako błąd. Model nie dostaje narzędzi ani możliwości uruchamiania poleceń. Tekst raportu jest wyświetlany jako tekst, bez wykonywania HTML.

**Koszty i prywatność:** potrzebny jest własny klucz projektu Google. Dostępność, bezpłatne limity, rozliczenia i warunki zależą od projektu, kraju i modelu — PV Lab nie gwarantuje bezpłatności. Linki do aktualnych [cen](https://ai.google.dev/gemini-api/docs/pricing), [limitów](https://ai.google.dev/gemini-api/docs/rate-limits) i [warunków](https://ai.google.dev/gemini-api/terms) są dostępne w module. Interactions API wysyła `store: false`; dotyczy to przechowywania interakcji w tym API, nie oznacza gwarancji braku wszelkich logów lub innego przetwarzania przez Google.

**Pliki:** `ai-private.json` zawiera ustawienia i klucz wyłącznie po stronie serwera; jest wyłączony z przeglądarki plików, podglądu, pobierania oraz eksportu JSON/GZIP. Klucz nie wraca do formularza. `ai-usage.json` przechowuje licznik prób, `ai-reports.json` ostatnie 10 raportów i ich wejścia. Eksport PV Lab zawiera publiczny stan AI i raporty, bez klucza. Pełna kopia dodatku w Home Assistant obejmuje katalog `/data`, więc może zawierać także prywatny plik klucza — taką kopię należy chronić. Uszkodzona opcjonalna konfiguracja AI wyłącza moduł z komunikatem, nie zatrzymuje prognoz PV i nie kasuje plików.

Odpowiedzi AI są opisem i hipotezami, nie dowodem przyczyny ani gwarancją oszczędności. Rzeczywistą poprawę prognozy należy nadal potwierdzać zapisanymi prognozami i późniejszymi pomiarami.

Od wersji 0.8.15 przyciski Dziś/Jutro mają neutralne tło; zaznaczony dzień wyróżnia delikatne niebieskie podświetlenie i niebieskie obramowanie. Zaplanuj zachowuje pełne wypełnienie kolorem akcji motywu Home Assistant. Dzięki temu wybór zakresu jest wizualnie oddzielony od uruchomienia obliczeń. Dotyczy obu układów oraz jasnych i ciemnych motywów. Nie zmienia to wybranych dni, rankingu, obliczeń ani przechowywanych danych.


## Domyślny wybór i kolejność urządzeń — 0.8.16

Zmywarka jest pierwsza, pralka druga, a pozostałe urządzenia dalej, z zachowaniem ich wzajemnej kolejności. Dotyczy kart urządzeń, profili, konfiguracji oraz karty dashboardu. Harmonogram wykonania nadal pokazuje czas pracy; przy jednoczesnym starcie pierwsza jest zmywarka. Kolejność wyświetlania nie jest priorytetem obliczeń i nie zmienia blokady kolejnych cykli tego samego sprzętu.

W aplikacji domyślny wybór to zmywarka ×1 i pralka ×0; karta ma oba liczniki 0, chyba że ustawisz default_cycles w YAML. System sprawdza dopuszczalne starty dzisiaj, korzystając z tego samego profilu programu, ograniczeń, bazy domu, stanu pracy i bilansowania co planer. Nawet częściowy udział PV lub dostępnego bilansu pozostawia dziś. Gdy wszystkie poprawne dzisiejsze okna wymagają zakupu całej energii, automatycznie wybiera jutro. Tak samo, jeśli cykl nie zmieści się już przed końcem doby. Nie wybieramy jutra tylko dlatego, że jutro jest taniej. Przy brakujących dziennych prognozach zostawiamy dziś i podajemy powód — brak nie oznacza zerowej produkcji. Jutro to tylko proponowany zakres, nie obietnica dostępności PV ani kompletnej prognozy.

Profile, warianty, encje, terminy zakończenia oraz zapisane ustawienia nie są kasowane. Domyślny wybór jest propozycją formularza, nie automatycznym zapisem ustawień ani zatwierdzeniem harmonogramu. Zmienione liczby cykli i dni pozostają w bieżącej sesji, a po zapisaniu formularza obowiązują zapisane wybory. Na karcie zatwierdzony plan ma pierwszeństwo i nie jest zastępowany domyślną zmywarką. Wybór możesz dowolnie zmienić przed przeliczeniem. Nowa sesja aplikacji proponuje jeden cykl zmywarki; karta stosuje default_cycles. Zasada dziś/jutro jest obliczana na serwerze raz i udostępniana obu widokom.

## Szybkość planowania — 0.8.16

Przygotowane statystyki wieloletniego zużycia domu są buforowane w pamięci zamiast ponownie przeglądać wszystkie godziny przy każdym przeliczeniu. Bufor dotyczy wyłącznie zagregowanych statystyk; świeży pomiar domu, wiek danych i bieżący czas nadal są uwzględniane na nowo. Import, zmiana danych lub źródeł, strefy oraz nadejście przyszłej próbki unieważniają bufor. Restart przygotowuje go ponownie. Historia na dysku i jej retencja nie zmieniają się.

W obrębie jednego obliczenia ponownie wykorzystujemy oceny tych samych startów przy identycznych rezerwacjach, najwyżej 32 zestawy. Identyczne kolejności urządzeń są sprawdzane raz. Dla jednego cyklu nadal sprawdzamy wszystkie dopuszczalne starty co 15 minut, bez powtarzania wielourządzeniowych przejść. Pozostają dwie analizy, scenariusze pogodowe, porównania taniej taryfy/szczytu PV i dotychczasowa liczba alternatyw. Nie zmniejszono dokładności ani zakresu poszukiwania.

Karta może wykorzystać wspólny odczyt HA młodszy niż 10 sekund. Starszy odczyt jest pobierany ponownie; krótka historia urządzeń jest odświeżana według dotychczasowych warunków świeżości, zamiast wymuszania jej przy każdym kliknięciu. Ręczne „Odczytaj dane i przelicz” zachowuje wymuszenie odczytu. Zmiana bieżącego pomiaru lub stanu urządzenia unieważnia wynik planu. Pierwsze obliczenie po starcie/importowaniu dużej historii może trwać dłużej; problem z HA lub siecią nadal może wydłużyć oczekiwanie.


## Włączanie urządzeń i automatyczna aktualizacja planu — 0.9.4

**Co zmieniło się względem 0.8:** od tej wersji nowe zatwierdzenie na aktualnej karcie HA oznacza zgodę na wysłanie poleceń włączenia switchy. Samo „Zaplanuj”, zapis wariantu w aplikacji do porównania i potwierdzenie wykonania w archiwum nadal nie sterują urządzeniami. Wcześniejsze zatwierdzenia bez sekcji wykonania nie są automatycznie uzbrajane. Stara karta z pamięci podręcznej dostaje komunikat o konieczności odświeżenia, zanim będzie mogła uzbroić sterowanie.

### Konfiguracja switchy

Wejdź w **Ustawienia → Urządzenia — profile i sterowanie → Zmywarka / Pralka**. Pole „Switch do włączenia o zaplanowanej godzinie” przyjmuje wyłącznie encję `switch.*`; puste pole wyłącza możliwość uzbrojenia danego urządzenia. Domyślnie:

| Urządzenie | Switch |
| --- | --- |
| Zmywarka | `switch.gniazdkopomiarzmywarka` |
| Pralka | `switch.gniazdkopomiarpralka` |

Można podać inne encje. Nie wolno przypisać tego samego switcha dwóm urządzeniom. Przed zmianą mapowania anuluj aktywny plan; zatwierdzenie zapamiętuje konkretny switch, więc zmiana ustawień nie może po cichu przekierować istniejącego polecenia. Wykrywanie pracy korzysta z encji mocy. Świeży stan switcha `off` potwierdza bezczynność także przy brakującej lub starej mocy urządzenia; switch `on` nie jest dowodem pracy programu.

### Trzy tryby przy zatwierdzaniu

Kolorowa ikona kłódki obok `?` i „Zatwierdź” przełącza kolejno:

| Kolor / tryb | Reguła |
| --- | --- |
| Czerwony, zamknięta kłódka — **Stałe godziny** | Domyślny. Nie zmieniamy godzin zatwierdzonych cykli. |
| Niebieski — **Elastyczny, bez późniejszego końca** | Jak elastyczny, ale koniec ostatniego cyklu każdego urządzenia nie może przekroczyć jego końca z pierwotnie zatwierdzonego planu. |
| Zielony, otwarta kłódka — **Elastyczny** | Co 30 minut sprawdzamy lepsze terminy przyszłych cykli w pierwotnie wybranym, bezwzględnym zakresie dat i z zachowaniem ograniczeń. |

Po lewej od ikony widać „Koniec o HH:MM” (czerwona), „Koniec przed HH:MM” (niebieska) albo „Koniec elastyczny” (zielona). Niebieski dopuszcza zakończenie wcześniej, także po wybraniu planu alternatywnego; granica oznacza najpóźniejszy dopuszczalny koniec, włącznie z podaną godziną. Każde urządzenie zachowuje własną pierwotną granicę. Opis jest też dostępny po wskazaniu/fokusie i jako etykieta dostępności. Tryb można zmienić także po uzbrojeniu planu. Kliknięcie ikony w Auto przełącza partię na wskazany tryb ręcznie zatwierdzonego planu; nie dodaje cykli. Zmiana trybu sama nie przesuwa żadnego terminu — pierwsza kontrola przypada po 30 minutach.

### Sprawdzanie lepszego terminu

Kontrola działa w integracji HA także po zamknięciu karty. Do PV Lab trafia żądanie oceny co 30 minut, sprawdzane przez niezależny minutowy zegar. Porównujemy pozostawienie pierwotnych przyszłych terminów z nowymi wariantami, **oba na tej samej aktualnej prognozie, bazie domu i cenach**. Od 0.10.2 zmiana wymaga 15 gr i 15% oszczędności, poprawy oceny kosztu z ryzykiem oraz potwierdzenia w dwóch kontrolach co 30 minut. Nie przesuwamy już terminu tylko dla 5 gr albo samego zapasu PV. Szczegóły i historię opisuje sekcja „Ostrożniejsze Auto i historia decyzji — 0.10.2”.

Nie zmieniamy liczby cykli, programu ani horyzontu. Profil i ograniczenia zatwierdzenia są zapamiętane. Przyszłe starty są nadal sprawdzane co 15 minut z 5-minutowym przebiegiem cyklu i wybranym bilansowaniem. Cykle jednego sprzętu nie mogą się nakładać. Wysłane/rozpoczęte cykle nie są ponownie planowane; ich zapamiętany czas zakończenia oraz bieżąca obserwacja pracy blokują wcześniejszy kolejny start. Start w ostatnich 15 minutach jest zamrożony. Niepełne dane lub nieudane połączenie oznaczają zachowanie dotychczasowych godzin, a nie fikcyjną oszczędność. Po częściowym wykonaniu korzyść liczymy dla pozostałych cykli; wyświetlana wycena całego planu zachowuje zapamiętane szacunki wcześniejszych cykli, więc nie jest rachunkiem za faktycznie zużytą energię.

W aplikacji „Planowanie zużycia” → „Wykonanie w Home Assistant” widać ostatni zatwierdzony harmonogram (start i koniec każdego cyklu), jego status i tryb, również dla Auto. Ostatnia kontrola pokazuje czas, koszt zachowania dotychczasowych godzin i koszt najlepszego znalezionego wariantu na tych samych aktualnych danych. Kontrola bez zmiany jest również widoczna; przy braku danych wartości pozostają puste. Karta pokazuje ostatnią kontrolę i zmianę, np. „12:15 → 11:15 · taniej o 0,18 zł”. Podgląd wykonania jest też w aplikacji, w Planowaniu zużycia. Przeliczenie nie gwarantuje globalnie najlepszego spośród wszystkich kombinacji — korzysta z dotychczasowego silnika planowania, bez AI.

### Auto

Kliknięcie **Auto** rozpoczyna trwałe odliczanie **10 minut**. Możesz przygotować urządzenia i wyłączyć ich switche; nie muszą być wyłączone przy kliknięciu. Karta wyróżnia Auto znakiem ✓ i kolorem, pokazuje komunikat oraz godzinę sprawdzenia. Dopiero po 10 minutach integracja HA prosi aplikację o świeży odczyt. Dla każdego switcha ze stanem dokładnie `off` wybieramy jeden cykl i zatwierdzamy wspólny pełny plan w trybie elastycznym. Obowiązuje zakres dat wybrany przy włączeniu Auto, bez przesuwania doby po północy. Urządzenia `on`, brakujące i `unavailable` nie są dodawane. Jeżeli żaden switch nie jest wyłączony albo nie ma pełnego planu, Auto nie uzbraja poleceń. Zachowujemy wybrane w aplikacji programy i terminy zakończenia. Jeśli istnieje aktywny plan, najpierw go anuluj.

**Auto jednorazowe obejmuje jedną partię**, najwyżej po jednym cyklu zmywarki i pralki. Co pół godziny sprawdza lepszą godzinę jej pozostałych uruchomień. Nie dopisuje bez końca kolejnych prań ani nie rozpoczyna nowej partii po ponownym wyłączeniu gniazdka. Po wysłaniu wszystkich poleceń Auto jednorazowe czeka na potwierdzone zakończenie cykli; dopiero wtedy wraca do stanu początkowego. Kolejne kliknięcie aktywnego Auto anuluje odliczanie lub przyszłe uruchomienia tej partii; nigdy nie wyłącza już pracujących urządzeń. Dla kolejnej partii włącz Auto ponownie.

Odliczanie przechowujemy również w HA. Po restarcie czekamy do zapisanego czasu, a przy braku połączenia po upływie 10 minut ponawiamy próbę najwyżej raz na minutę. Brak wyłączonych switchy lub pełnego planu kończy tę próbę Auto z opisem przyczyny. Anulowanie blokuje również spóźnioną odpowiedź z planem.

### Wykonanie poleceń i przerwy w działaniu

Integracja HA zapisuje uzbrojony plan lokalnie i ustawia zegar na konkretny czas UTC. Dla **każdego cyklu**, również kolejnego prania, wywołuje wyłącznie `switch.turn_on` z zapamiętanym `entity_id`. Polecenie jest wysyłane także wtedy, gdy switch już ma stan `on`. Nie wykonujemy `turn_off`, impulsu wyłącz/włącz ani innych usług. Urządzenie musi być przygotowane do startu po podaniu zasilania — samo włączenie już włączonego gniazdka nie daje ponownego impulsu i nie gwarantuje rozpoczęcia programu.

Normalny restart HA odtwarza przyszłe polecenia. Niedostępna aplikacja PV Lab nie zatrzymuje lokalnego wykonania już zapisanego planu, ale uniemożliwia znalezienie lepszych terminów. Jeśli HA nie działał o godzinie startu, dopuszczamy najwyżej 2 minuty opóźnienia; później oznaczamy polecenie jako pominięte. Brak lub niedostępność switcha oznacza błąd, nie wysłanie do innej encji. Anulowanie na karcie rozbraja lokalny plan także przy chwilowym braku połączenia z aplikacją; potwierdzenie anulowania zostanie przekazane po powrocie połączenia. Wyłączenie lub usunięcie integracji zatrzymuje jej zegary.

Przed wysłaniem zapisujemy zamiar wykonania. Normalny restart i powtarzane odczyty nie wysyłają drugi raz tej samej komendy. Nie można zagwarantować jednocześnie dostarczenia i dokładnie jednego wykonania przy awarii między zapisem a wywołaniem usługi: taki przerwany lub niepewny przypadek oznaczamy „niepewny” i **nie ponawiamy automatycznie**. „Wysłano polecenie” potwierdza wywołanie usługi HA, nie pracę programu ani sprzętowe potwierdzenie gniazdka. Faktyczną pracę oceniają istniejące czujniki mocy.

### Dane i retencja wykonania

`/data/dashboard-plan.json` przechowuje bieżący plan, tryb, zamrożone profile, pierwotny zakres, statusy cykli, ostatnią kontrolę kosztów, odliczanie Auto, kompaktowy wykres ostatniego zatwierdzenia lub kontroli i do 20 ostatnich zmian. Zapis wykresu jest zastępowany przy kontroli; nie tworzymy osobnego pliku na każdy odczyt. Dzienniki `/data/execution-RRRR-MM-DD.jsonl` zachowują zdarzenia zatwierdzeń, kontroli, zmian i potwierdzeń; nie podlegają automatycznemu usuwaniu i można je pobrać w Plikach i retencji. Eksport JSON/GZIP obejmuje też te zdarzenia. To małe podsumowania, bez surowych odczytów encji i kluczy.

W HA `.storage/pv_lab_execution_<entry_id>` jest osobnym trwałym rejestrem zegara i do 200 ostatnich tożsamości poleceń, z kolejką potwierdzeń, odliczaniem Auto i pamięcią ostatnich 200 anulowanych identyfikatorów Auto. Ta część należy do kopii Home Assistant, a nie eksportu samej aplikacji. Publiczny odczyt integracji nie przesyła pełnych profili wykonania. Nowe funkcje nie zmieniają prognozy PV, cen, historii produkcji ani ustawień AI.


## Karta i obciążenie domu — zmiany 0.9.4

W rozwijanej liście karty, po maksymalnie trzech głównych propozycjach, domyślnie zawsze pokazujemy osobno wariant **Start tania strefa** i **Start szczyt PV** dla wybranych dni. Mają te same profile, cenę, bilansowanie i ograniczenia co aplikacja i uczestniczą w jej dotychczasowym wyborze harmonogramu. Nie są sztucznie wstawiane na początek rankingu. Można je zatwierdzić bezpośrednio z karty. Miniony termin, niepełny plan lub brak prognozy ma opis przyczyny i nieaktywny przycisk zatwierdzenia. Pozostają widoczne również przy samym zasilaniu z sieci, ponieważ są dodatkowymi porównaniami na życzenie. Przy dwóch dniach wariantów jest po dwa na każdy dzień. `max_plans` dotyczy tylko głównych propozycji; Porównania są zawsze widoczne po rozwinięciu listy, także gdy `max_plans` ogranicza liczbę zwykłych propozycji. Dawny parametr `show_reference_plans` pozostaje akceptowany dla zgodności; również `false` nie ukrywa już tych porównań. Zatwierdzony wariant pozostaje widoczny po zwinięciu listy.

Po rozwinięciu „?” opcja `show_plan_chart: true` pokazuje prosty wykres PV, domu (w tym wcześniej trwających cykli) i nowych cykli, w kWh na 15 minut, przed bilansowaniem. Domyślnie wykres jest włączony; jawne `show_plan_chart: false` w YAML nadal go ukrywa. Wykres pochodzi z obliczenia zatwierdzenia lub ostatniej kontroli, z widoczną datą prognozy; nie jest pomiarem wykonania. Dla dawnego planu bez zapisanych punktów pokazujemy brak wykresu. Pełne dane pozostają w aplikacji.

Dodatkowe parametry YAML:

| Parametr | Domyślnie | Znaczenie |
| --- | --- | --- |
| `show_reference_plans` | `true` | Zgodność ze starszym YAML. Porównania są teraz zawsze obecne; `false` również ich nie ukrywa. |
| `show_plan_chart` | `true` | Mały wykres w szczegółach propozycji i zatwierdzonego planu. |
| `device_button_height` | `36` | Wysokość przycisków urządzeń w px, liczba całkowita 28–60. |
| `device_color` | `"#85b866"` | Kolor obrysu i delikatnego tła wybranego urządzenia. |
| `auto_color` | `"#b992df"` | Osobny kolor nieaktywnego przycisku Auto. |
| `auto_active_color` | `"#83c9af"` | Kolor włączonego Auto; dodatkowo znak ✓ i mocniejszy obrys. |

Kolory przyjmują zapis `#RRGGBB` w cudzysłowach. Rozmiary i kolory nie zmieniają żadnych obliczeń. Przykład do edytora karty:

```yaml
type: custom:pv-lab-plan-card
show_reference_plans: true
show_plan_chart: true
device_button_height: 34
device_color: "#85b866"
auto_color: "#b992df"
auto_active_color: "#83c9af"
```

Karta nie wywołuje przeładowania całego dashboardu HA. Pomijamy przebudowę jej zawartości, jeśli okresowy odczyt nie zmienił danych lub stanu planu. Kliknięcia nie wymuszają pełnego pobrania prognoz wszystkich encji; aktualizujemy tylko dane planu, bez odsuwania okresowego odczytu integracji. Ręcznie wybrane dni i otwarte szczegóły zachowują dotychczasowe zasady.

Wykrycie ręcznie uruchomionej pralki lub zmywarki jest niezależne od zatwierdzonego planu. Uczony profil domu pozostaje bazą po odjęciu urządzeń z konfiguracji. Do planowanego obciążenia dodajemy tylko pozostały przebieg pracującego cyklu, ze startem rozpoznanym z historii; nie dodajemy ponownie jego zużycia do oczyszczonej historii. Ten sam sprzęt jest zablokowany do szacowanego zakończenia, a potwierdzona bezczynność zwalnia go przy następnym odczycie. Jeżeli stan lub początek jest niepewny albo baza nie wyklucza urządzenia, obowiązują opisane ograniczenia jakości — nie obiecujemy wolnej energii z brakujących danych.

Opcjonalna linia zużycia domu w „Porównaniu prognoz i produkcji” uwzględnia teraz bazę **i już trwające cykle**, zgodnie z bilansem planera. Nadwyżka to `max(PV − dom z trwającymi cyklami, 0)`. Nie obejmuje jeszcze nowych cykli, które dopiero chcesz zaplanować. Baza i dodany trwający cykl są zapisane osobno; przy niepewnym stanie nie pokazujemy fikcyjnej nadwyżki. Prognoza produkcji PV i ceny nie są przez tę zmianę modyfikowane.

Nie pokazujemy ostrzeżenia o nieuwzględnionej niezaplanowanej pracy dla urządzenia, które już obserwuje detektor, nawet gdy wybrana liczba nowych cykli wynosi zero. Dla brakującego stanu obowiązuje osobny komunikat jakości i blokada niepewnych okresów. Ostrzeżenie o nieuwzględnionym urządzeniu pozostaje dla rzeczywiście nieobserwowanej encji odjętej od bazy.

Ostatni uzbrojony harmonogram pozostaje w podglądzie aplikacji również po przygotowaniu nowych propozycji lub kolejnego odliczania Auto. Przechowujemy tylko ostatni taki plan obok bieżącego; starsze zdarzenia są w dotychczasowym dzienniku, bez powielania pełnych profili przy każdym odczycie.


## Nazwane warianty i zatwierdzanie — 0.9.4

Nazwy na karcie i w dodatkowych porównaniach to **Start tania strefa** i **Start szczyt PV**. Po obliczeniu planu porównania zawsze pozostają dostępne w rozwijanej liście, również przy zerowym udziale PV. „Zawsze” dotyczy obecności porównania, nie dopuszczalności uruchomienia: miniony termin, brak prognozy lub niepełny plan nadal ma opis przyczyny i wyłączony przycisk zatwierdzenia. Przed pierwszym obliczeniem karta nie pokazuje starych porównań z innego wyboru.

Jeżeli zwykły plan jest identyczny z nazwanym wariantem, pokazujemy tylko nazwany wariant, na miejscu zastępowanej propozycji. Porównujemy komplet cykli: urządzenia, starty, końce, energię i źródło profilu; sama wspólna godzina pierwszego startu nie wystarcza. Jeśli oba porównania dają identyczny harmonogram, jeden wpis ma nazwę „Start tania strefa · Start szczyt PV”. Zatwierdzony plan zachowuje pierwotny identyfikator, status i przełączniki wykonania. Nie zmieniamy jego godzin ani oceny kosztów przy usuwaniu duplikatu z widoku.

Przed zatwierdzeniem odczytujemy aktualne stany HA, automatycznie uzupełniając detektor według istniejących zasad odczytu historii. Nie wymagamy osobnego kliknięcia „Odczytaj dane”. Dostępność jest sprawdzana na tych samych profilach co wybrany plan. Jeżeli już podczas obliczenia stan był niepewny, ale start zaplanowano po konserwatywnym czasie blokady, sama etykieta „unknown” lub „observing” nie odrzuca ponownie takiego terminu. Nadal wymagana jest zgodność z aktualnym końcem blokady. To nie jest zamiana braku danych na bezczynność ani gwarancja zakończenia pracy.

Jeśli od obliczenia utracono potwierdzony stan, brakuje danych urządzenia albo rzeczywista lub konserwatywnie oszacowana zajętość koliduje ze startem, zatwierdzenie pozostaje zablokowane. Komunikat podaje urządzenie, przyczynę i, gdy to możliwe, godzinę zwolnienia blokady. Błąd odczytu HA nie uzbraja planu. Wybrany harmonogram nie jest automatycznie zastępowany innymi godzinami przy zatwierdzeniu — w razie prawdziwej kolizji przelicz propozycje. Dotychczasowy limit aktualności propozycji i co najmniej minuta do startu nadal obowiązują.

Powyższe zmiany nie modyfikują prognozy produkcji, cennika ani bilansowania energii. Krótki zapis stanu dostępności z chwili obliczenia jest częścią bieżącego pliku `dashboard-plan.json`; zastępuje go następna propozycja. Nie dodajemy nowych plików historii przy każdym odczycie.

### Kompletny YAML karty

Ten przykład obejmuje wszystkie własne parametry karty. `entry_id` można zostawić puste przy jednej instalacji. Pozostałe opcje układu standardowego dashboardu HA nie są parametrami PV Lab. Liczby cykli, dni i zapisane profile wybierasz na karcie. Bibliotekę profili, switche i taryfę konfigurujesz w aplikacji.

```yaml
type: custom:pv-lab-plan-card
# Puste = automatyczny wybór, jeśli jest jedna integracja PV Lab.
# Przy kilku instancjach wpisz ich entry_id albo wybierz instalację na karcie.
entry_id: ""

# Nagłówek: false go ukrywa; title zmienia jego nazwę.
title: "Zaplanuj uruchomienie"
show_header: true

# compact lub full
layout: compact

# Liczba głównych propozycji: 1–3.
# Nazwane porównania są dodatkowe i zawsze dostępne po rozwinięciu.
max_plans: 3
# Zgodność ze starszym YAML; false też nie ukrywa porównań.
show_reference_plans: true

show_energy_bar: true
show_details: true
show_program_variants: true
show_program_in_device: true
default_cycles: {zmywarka: 0, pralka: 0}
program_variants_style: select
show_program_duration: true
show_program_energy: true
program_variants_position: details
# Wykres pojawia się po rozwinięciu ?, przed zatwierdzeniem.
show_plan_chart: true

# Wysokość przycisków Zmywarka/Pralka: 28–60 px.
device_button_height: 34
# Kolory zapisuj jako #RRGGBB w cudzysłowach.
device_color: "#85b866"
auto_color: "#b992df"
auto_active_color: "#83c9af"
```

Dla niepełnego porównania karta pokazuje „brak pełnego planu”, przyczynę i planowaną godzinę odniesienia, zamiast mylącego kosztu 0,00 zł. Takiego wpisu nie można zatwierdzić.


### Wariant programu na karcie

Osobne przyciski pod zmywarką i pralką wybierają profil lub wariant **Typowy / Średni / Największy** w profilu przypisanym danemu urządzeniu w PV Lab. Domyślnie przyciski programu są pod przyciskami urządzeń. Każde naciśnięcie wybiera kolejną pozycję; po ostatniej wracamy do pierwszej. `program_variants_style: select` zamiast przycisków pokazuje listy rozwijalne. `program_variants_position: details` chowa je w rozwijanej sekcji „Programy urządzeń”; `show_program_variants: false` ukrywa wybór. Domyślnie `show_program_variants: true` i `program_variants_position: below_devices`. Dostępne warianty wynikają z zapisanego profilu, nie dodajemy brakujących krzywych.

Wybrany wariant określa przebieg poboru, energię i długość nowych cykli; dotyczy wszystkich żądanych cykli danego sprzętu. Wybór w karcie jest przekazywany w żądaniu przeliczenia i nie nadpisuje ustawień w aplikacji. Przy pierwszym wczytaniu przyjmujemy zapisany wariant z aplikacji. Wybór jest zachowany również dla urządzenia z zerem żądanych cykli, żeby można je było następnie dodać. Zmiana wariantu wymaga kliknięcia „Zaplanuj”, zanim zatwierdzisz propozycję. Plan już uzbrojony lub odliczanie Auto blokuje zmianę wariantu w karcie; najpierw anuluj plan, jeśli chcesz inny program.

**Auto również używa wybranych wariantów.** Zapamiętuje je przy rozpoczęciu 10-minutowego oczekiwania. Po odliczaniu dopiero wybiera urządzenia z wyłączonym switchem. Późniejsze przeplanowania zachowują zamrożony wariant i profil zatwierdzenia. Wybranie wariantu nie uruchamia urządzenia ani nie ustawia fizycznego programu pralki czy zmywarki — to nadal przygotowujesz na urządzeniu.

Jeśli używasz ręcznego profilu bez różnych krzywych z historii, warianty korzystają z tej samej ręcznie podanej energii i czasu. Widoczne podsumowania mają wtedy takie same wartości; nie wymyślamy różnic pomiędzy programami. Warianty statystyczne z historii nie oznaczają automatycznie konkretnych programów typu Eco czy Bawełna.


### Programy własne, przyciski, czas i energia

Przyciski programu domyślnie pokazują wybrany profil lub wariant, jego czas trwania i energię kWh. Układ zawija dodatkowe wartości do drugiej linii na wąskim ekranie. Pełna nazwa jest w podpowiedzi przycisku. `show_program_duration: false` ukrywa czas, a `show_program_energy: false` ukrywa kWh, niezależnie od siebie. Obie opcje są domyślnie `true`. `program_variants_style` przyjmuje `buttons` (domyślnie) lub `select` (lista rozwijalna). Położenie nadal wybierasz przez `program_variants_position: below_devices` lub `details`.

**Własne zapisane profile są na początku wyboru**, przed standardowymi wariantami profilu z ustawień aplikacji. Profile z przypisanym urządzeniem lub źródłową encją mocy pojawiają się tylko przy właściwym sprzęcie. Profil ręczny bez przypisania jest dostępny dla obu urządzeń; nazwa sama nie decyduje o przypisaniu. Dla własnego profilu wybieramy jego zapisany wariant domyślny, a gdy go nie ma — Typowy lub pierwszy dostępny wariant. Na karcie nie dodajemy osobno wariantów statystycznych nazwanych profili. Wariant domyślny wybierasz w aplikacji.

Domyślnie zaznaczony pozostaje profil i wariant zapisany w aplikacji; kolejność listy nie zmienia go bez kliknięcia. Dane czasu i kWh wynikają z faktycznej krzywej 5-minutowej wybranego profilu: czas to liczba kroków × 5 minut, energia to suma energii kroków. Bez zapisanego profilu korzystamy z ręcznego czasu i energii w ustawieniach. Nie znamy parametrów niezapisanego fizycznego programu urządzenia.

Wybór profilu z karty jest wysyłany wraz z wariantem do planera i Auto. Nie podmieniamy urządzenia ani jego switcha: profil pralki nie może zostać użyty dla zmywarki, jeśli ma przypisane inne urządzenie. Auto zapamiętuje wybór przy włączeniu, a zatwierdzenie i późniejsze przeplanowania zachowują wybrany profil. Nazwy i podsumowania krzywych są odczytywane razem ze stanem karty; nie przesyłamy pełnych krzywych do przeglądarki. Przed zatwierdzeniem brakujący profil zastępujemy podstawowym albo pierwszym pasującym, pokazujemy aktualny wybór i wymagamy ponownego przeliczenia. Zatwierdzony plan zachowuje zamrożony profil.


## Profile, czas cyklu i trwała biblioteka — 0.9.4

**Nazwa programu jest odrębna od urządzenia.** Wpisujesz np. „60 min”; zapisana nazwa pozostaje dokładnie taka. W przeglądarce profili PV Lab widzisz „Zmywarka · 60 min” lub „Pralka · 60 min”, z osobnymi identyfikatorami. Powtarzająca się nazwa jest blokowana tylko w obrębie tego samego urządzenia. Karta dashboardu pokazuje samą nazwę programu. Nowy profil ręczny ma pole przypisania do urządzenia; dotychczasowe nieprzypisane profile pozostają zachowane i dostępne dla obu sprzętów.

W „Zapisanych profilach” wybierz wariant i kliknij **Ustaw ten wariant jako domyślny**. Zapis dotyczy tego profilu i nie zmienia jego przebiegów. Przycisk **Ustaw jako podstawowy dla urządzenia** zapisuje preferowany profil dla karty. Domyślny wariant jest używany przy wyborze nazwanego profilu; wcześniejsze ręczne wybory w planach pozostają zachowane. Usunięty lub brakujący profil przed zatwierdzeniem jest zastępowany podstawowym albo pierwszym pasującym. Jeśli nie ma żadnego zapisanego profilu, pozostaje jawny profil ręczny. Po zmianie wyboru ponownie przelicz plan. Zatwierdzony harmonogram nie podmienia profilu z powodu zmian biblioteki — używa zamrożonego zapisu.

**Czas i energia wariantów:** profil ma kroki 5-minutowe. Nie dodajemy zer do 15 minut. Cykl 70-minutowy ma 14 kroków i trwa 70 minut; częściowy ostatni krok może zaokrąglić czas najwyżej do następnych 5 minut. Typowy wariant jest rzeczywistym cyklem z najczęstszej grupy długości po 5 minut i energią bliską medianie tej grupy. Najbardziej energochłonny jest rzeczywistym cyklem o najwyższej energii, niekoniecznie najdłuższym. Średni ma arytmetyczny średni czas zaokrąglony w górę do 5 minut. Przebiegi źródeł są dopasowane do tego czasu na osi względnego postępu cyklu, z zachowaniem energii każdego źródła, a następnie uśrednione. W efekcie suma energii wariantu jest średnią energią wybranych cykli; nie wydłużamy go do najdłuższego cyklu. Jeżeli dopasowanie czasu dałoby nadmierny szczyt, ograniczamy go zaobserwowaną mocą i rozdzielamy energię nadwyżki na pozostałe kroki z zachowaniem sumy.

Średnia moc wariantu to kWh × 60000 / minuty. Szczyt profilu to maksymalna energia kroku Wh × 12, czyli najwyższa średnia w 5 minutach. Odczytana maksymalna moc źródeł jest osobną wartością i nie jest mylona ze szczytem syntetycznego profilu. Wariant średni jest modelem porównawczym, nie konkretnym fizycznym uruchomieniem. Starty planera pozostają co 15 minut; długość profilu i zakończenia nie muszą być wielokrotnością kwadransa. Zasady taryf i godzinowego bilansowania nie zmieniają się.

Starsze profile uczone są jednorazowo przebudowywane tylko wtedy, gdy biblioteka zawiera wszystkie wskazane cykle źródłowe. Zachowujemy identyfikator, nazwę, preferowany wariant i źródło oraz kopię `appliance-profiles-before-0.9.3.json`. Gdy źródeł brakuje, nie zgadujemy i nie kasujemy profilu; interfejs oznacza starszą metodę. Wybierz wówczas dostępne cykle i zapisz aktualizację profilu. Starych ręcznych przebiegów nie przycinamy na podstawie domysłu, że końcowe zera były sztuczne. Wcześniej zatwierdzone plany zachowują swoją krzywą, nawet po poprawce biblioteki.

**Cykle są trwałe niezależnie od Recordera.** Nowy odczyt łączy zakończone cykle z dotychczasową biblioteką, zachowuje starsze miesiące i nie odcina pierwszych obserwacji po przekroczeniu 2000 pozycji. Zmiana encji lub progów zachowuje dawne cykle z oznaczeniem wcześniejszego kontekstu; różne konteksty nie zastępują się po cichu. Ponowny odczyt tego samego cyklu aktualizuje obserwację bez powielania i zachowuje jej identyfikator. Sam upływ 14 dni retencji HA nie usuwa danych już zapisanych w PV Lab.

Dla płynności ekran pokazuje 200 najnowszych pozycji i przycisk **Pokaż kolejne 200**; to limit widoku, nie retencji. „Zaznacz wszystkie” obejmuje całą zapisaną listę, również niewidoczne jeszcze pozycje; licznik wyjaśnia liczbę zaznaczonych cykli. **Usuń zaznaczone cykle** wymaga potwierdzenia liczby. Usunięcie nie zmienia zapisanych profili ani planów. Kompaktowy zapis usuniętych identyfikatorów i przedziałów zapobiega ich ponownemu dodaniu przy powtórnym imporcie. Bieżąca biblioteka i znaczniki usunięć są w `appliance-profiles.json` i pełnej kopii danych. Zapisujemy krzywe cykli, nie surową historię HA.

**Wykres zatwierdzenia** jest od tej wersji domyślnie włączony. Dla istniejącej karty sprawdź `show_plan_chart: true` — jawne `false` ma pierwszeństwo. Po aktualizacji aplikacji i HACS uruchom ponownie HA i odśwież dashboard, żeby załadować nowy JavaScript. Wykres pokazuje zapisany harmonogram na tle prognozy PV, nie pomiar jego wykonania. Stary plan bez zapisanej osi czasu wymaga nowego przeliczenia, aby otrzymać wykres.

Opcja **`show_program_in_device: true`** pokazuje wybrany program w nawiasie przy urządzeniu, np. „Zmywarka (60 min)”. Domyślnie ta opcja jest `false`. Można połączyć ją z `program_variants_position: details` i `program_variants_style: select`: wybór programu jest wtedy schowany w rozwijanej sekcji, a nazwa nadal widoczna przy ikonie urządzenia. Naciśnięcie urządzenia wciąż zmienia liczbę cykli; nie miesza się z wyborem programu. Widoczność czasu i kWh nadal kontrolują `show_program_duration` i `show_program_energy`.


## Karta — ranking i podgląd przed zatwierdzeniem (0.9.4)

Nazwane porównania i główne propozycje tworzą jeden ranking widocznych planów: pełne najpierw, koszt i dotychczasowy margines 5 gr za zapas PV oraz koszt przy mniej korzystnej pogodzie. Zatwierdzony plan pozostaje na początku. Ta kolejność nie zmienia kwot ani zasad taryfy. Identyczne pełne harmonogramy „Start tania strefa” i „Start szczyt PV” są jednym wpisem z dwiema nazwami. Szczyt odnosi się do energii brutto całej instalacji w pełnej godzinie. Nie oznacza nadwyżki po domu; dlatego możliwe jest 0% pokrycia nowego cyklu. Szczegóły pokazują PV i dom w godzinach rozliczenia oraz kWh do dokupienia. Nie sumuje się nadwyżek różnych godzin. Przy wyłączonej wartości eksportu koszt to suma dodatkowego zakupu razy stawka danego okresu; przy włączonej wartości eksportu dolicza utraconą wartość eksportu.

Domyślnie na świeżo otwartej karcie oba urządzenia mają 0 cykli. Opcja YAML `default_cycles: {zmywarka: 1, pralka: 0}` ustawia własne wartości 0–3; pominięte urządzenie otrzymuje 0. Ręczny wybór i aktywny plan nie są nadpisywane. Reguła proponowania dziś/jutro pozostaje po stronie aplikacji.

Lista programu pokazuje każdy nazwany profil raz, z jego wariantem domyślnym wybranym w PV Lab. Nie dodaje osobnych Typowy/Średni/Największy, jeśli są zapisane profile. Przy braku jakiegokolwiek profilu zachowany jest jawny wariant ręczny. Już uzbrojony plan zachowuje zamrożony przebieg; nowe preferencje dotyczą nowych obliczeń.

`show_plan_chart: true` pokazuje wykres po rozwinięciu „?” każdego wariantu, również przed zatwierdzeniem; nie zajmuje miejsca w zwiniętym planie. Zakres jest od chwili obliczenia (przy późniejszym podglądzie od teraz) do końca wybranego dnia lub jutra. Starty cykli nadal respektują wybrane dni — pokazanie dzisiejszej prognozy przy planie na jutro nie pozwala uruchomić go dziś. Oś pionowa to kWh na 15 minut, pozioma ma daty i godziny. Linie PV, domu z trwającymi cyklami i nowych urządzeń są schodkowe, pokazują energię przed bilansowaniem. Brak danych jest przerwą, nie zerem. Wykres ma datę prognozy i nie jest pomiarem wykonania. Zatwierdzenie nie jest potrzebne do obejrzenia wykresu. Stary zapis bez osi czasu wymaga ponownego obliczenia. Podgląd nie steruje switchami i nie tworzy dodatkowych cyklicznych plików; kompaktowe osie czasu są częścią bieżących propozycji, zastępowanych nowym przeliczeniem.


## Trwające i minione okna na karcie — 0.9.5

Dla dziennej taniej strefy liczymy jej skonfigurowany początek i koniec; dla szczytu PV — pełną godzinę największej produkcji. Jeśli teraz jest w tym oknie, przy przeliczeniu wybieramy najbliższy dopuszczalny start co 15 minut od teraz, z zachowaniem wybranego zakresu i ograniczeń urządzeń. Przykład: 13:20 w taniej strefie 13–15 daje start 13:30. Godzina szczytu 11–12 o 11:20 daje 11:30. Koszt, profil i bilans są przeliczane dla nowego startu; nie podmieniamy samych etykiet czasu. Ostatni dopuszczalny kwadrans musi zaczynać się przed końcem okna. Pełny cykl może skończyć się później, jeśli pozwala na to zakres planu; cena każdego okresu jest liczona osobno.

Po zakończeniu okna jego wariant znika z listy karty przy następnym odświeżeniu (standardowo do minuty), również gdy dane z serwera nie zmieniły się. Pozostałe propozycje i licznik rozwijanej listy są wyliczane bez niego. Zatwierdzony plan nie jest ukrywany ani samowolnie przesuwany. Pozostaje widoczny do kontroli wykonania. Zmiana nie usuwa archiwum ani danych porównań w aplikacji. Nowe godziny trwającego okna powstają po „Zaplanuj”; samo otwarcie szczegółów nie wykonuje ponownej optymalizacji.


## Dlaczego konkretny start jest zablokowany — 0.9.6

0 W nie zawsze oznacza już potwierdzoną bezczynność. Po starcie obserwacji lub przerwie w danych domyślnie potrzeba 20 minut niskiej mocy, aby odróżnić bezczynność od pauzy programu. Przykład: obserwacja od 12:59:20 oznacza potwierdzenie najwcześniej o 13:19:20. Start 13:15 jest wtedy blokowany. Przy bilansowaniu godzinowym niepewny fragment może wykluczyć całą godzinę 13–14; po odczycie potwierdzonej bezczynności i ponownym przeliczeniu ten powód ustępuje. Odczyt switcha off może wcześniej potwierdzić bezczynność. Samo on nie potwierdza pracy. Nie usuwamy zabezpieczenia i nie wymyślamy zerowego zużycia w nieznanym okresie.

Porównanie startu w taniej strefie lub szczycie pokazuje konkretny powód: nazwy urządzeń, godzinę granicy potwierdzenia, wpływ bilansowania, termin zakończenia albo brak danych danego okresu. Niedostępny wariant nie ma policzonego kosztu ani energii: API zwraca null, karta pokazuje brak dopuszczalnego harmonogramu zamiast 0 zł i 0 kWh. Nie rysuje też wykresu udającego plan z zerowym poborem. Szczegóły właściwego pełnego planu działają bez zmian. Jest to poprawa diagnostyki i prezentacji; taryfy, progi detektora, bilansowanie i zatwierdzone terminy pozostają zachowane.


## Potwierdzenie wcześniejszej bezczynności — 0.9.7

Przy rozpoczęciu obserwacji, zmianie progów lub przerwie w odczytach pobieramy wcześniejszą historię mocy HA dla urządzeń. Jeśli zapisany przebieg potwierdza co najmniej wymagany czas niskiej mocy (domyślnie 20 minut), sprzęt od razu otrzymuje stan bezczynny po dołączeniu aktualnego odczytu. Nie trzeba czekać nowych 20 minut od otwarcia aplikacji ani restartu. Odczyt historii obejmuje maksymalny czas cyklu plus czas ciszy; zachowuje informację o rzeczywiście trwającym cyklu.

Pierwszy wpis historii może przedstawiać stan podtrzymany od wcześniejszej chwili. Dla dokładnie 0 W wykorzystujemy wcześniejsze poprawne last_changed, jeżeli last_updated pochodzi tylko z późniejszego odświeżenia tego samego stanu. Ograniczamy czas do zamówionego zakresu. Pozostałe zmiany i wpisy unknown/unavailable są odtwarzane po kolei — nie przenosimy zer przez lukę lub późniejszy pobór. Nie cofamy niezerowego poboru według samej daty last_changed, ponieważ mogła zmienić się jednostka.

Po pustej/błędnej historii lub przy nadal niepotwierdzonej bezczynności i bieżącym niskim poborze ponawiamy odczyt najwyżej raz na minutę, zamiast odkładać próbę na 15 minut. Żądania są wykonywane kolejno; potwierdzona bezczynność nie powoduje odczytu historii co minutę. Bieżące odczyty nadal wystarczają po rozpoznaniu stanu. Utrzymująca się niedostępność bez niskiego pomiaru zachowuje rzadsze ponawianie. Przycisk Odczytaj dane i przelicz wymusza ponowienie.

Gdy poprawna historia nie potwierdza wymaganej ciszy, zachowujemy pozostały czas oczekiwania. Krótka pauza programu, brak danych lub świeże 0 W nie udają wcześniejszej bezczynności. Switch off nadal może ją potwierdzić niezależnie; samo on nie dowodzi pracy. Nie obniżamy progów bezpieczeństwa ani nie zmieniamy godzin zatwierdzonych planów. W migawce diagnostycznej urządzenia widać idleSince, idleSource i historyCheckedAt. Zapisujemy tylko kompaktowy stan detektora; historia surowych pomiarów nie jest kopiowana do nowej bazy. Poprawki komunikatów i braku kosztu niepełnego planu z 0.9.6 są częścią tej wersji.

Ponowny odczyt krótkiej lub skąpej historii nie zeruje już udokumentowanego, ciągłego czasu ciszy z bieżącej obserwacji. Zachowujemy go tylko przy świeżym poprzednim pomiarze, tych samych progach i braku sprzecznych wpisów poboru lub niedostępności.


## Auto, zakończenie i ocena wykonania — 0.10.0

Przycisk na karcie przełącza kolejno: wyłączony → Auto jednorazowe (fioletowe) → Auto ciągłe (czerwone) → wyłączony. Zaznaczenie jest widoczne kolorem, obramowaniem i tekstem. Auto jednorazowe zachowuje zakres Dziś/Jutro wybrany przed włączeniem. Podczas działania obu trybów przyciski dni są szare i nieaktywne; nie można przypadkowo zmienić zakresu już udzielonej zgody. Po potwierdzonym zakończeniu partii jednorazowej karta wraca do pierwotnego wyboru, domyślnie 0 cykli. Na dole pozostaje mała rozwijana informacja „Ostatni proces” z wysłaniem polecenia, wykrytym początkiem i końcem oraz odnośnikiem opisowym do oceny w aplikacji.

### Auto ciągłe — świadoma zgoda bezterminowa

Drugie kliknięcie włącza bezterminowe oczekiwanie na kolejne przygotowanie zmywarki/pralki, do ręcznego wyłączenia Auto. W tym trybie Dziś/Jutro nie ogranicza dat. Nowe przejście poprawnego stanu switcha on → off oznacza przygotowanie jednego cyklu danego urządzenia. Nie traktujemy unknown/unavailable jako wyłączenia. Dajemy 10 minut na przygotowanie; w tym czasie powrót switcha na on usuwa oczekujący sygnał. Początkowa partia nadal korzysta z 10 minut przygotowania po kliknięciu pierwszego Auto; zastane wyłączone switche są wtedy sprawdzane jednorazowo.

Planowanie dotyczy dnia wyłączenia switcha w strefie instalacji. Nie przenosimy spóźnionego zdarzenia na jutro. Jeśli 10 minut upłynie już po północy albo pełny cykl nie mieści się do końca dnia, nie uzbrajamy uruchomienia na następny dzień. Auto ciągłe nadal czeka na kolejne nowe wyłączenie. Samo pozostawanie switcha w stanie off nie dodaje ponownie cyklu. Ponowne on → off tworzy nowe zdarzenie. Podczas aktywnej partii kolejne zdarzenia czekają; nie zastępują działającego planu i nie uruchamiają ponownie tego samego sprzętu. Kolejna partia jest oceniana po zakończeniu bieżącej, o ile nadal mieści się w dniu zdarzenia. Zachowane są profile, koszty, zajętość sprzętu i 30-minutowa kontrola lepszego terminu. Nie wykonujemy turn_off ani impulsów wyłączenia/włączenia.

Oczekiwanie, ostatnie stany switchy i kolejka zdarzeń są trwałe w dashboard-plan.json. Minutowa obsługa integracji HA działa po zamknięciu karty i odtwarza oczekiwanie po restarcie. Anulowanie rozbraja przyszłe komendy lokalnie w HA także przy niedostępnej aplikacji; opóźniona odpowiedź starego Auto nie może go ponownie uzbroić. Brak połączenia nie tworzy nowych godzin ani fikcyjnych pomiarów. Wyłączenie integracji zatrzymuje jej zegary. Bezterminowa zgoda nie jest kopiowana na nowe urządzenia: dotyczy skonfigurowanych switchy zmywarki i pralki. Do zmiany programów wyłącz Auto i włącz je po wyborze nowych profili.

### Polecenie, praca i zakończenie to osobne informacje

„Wysłano polecenie” oznacza wywołanie switch.turn_on, nie start programu. PV Lab dopisuje wykryty start na podstawie detektora mocy. Zakończenie jest potwierdzane dopiero po wykryciu ciszy przez wymagany czas (domyślnie 20 min); zapisany koniec poboru to początek tej ciszy, a nie późniejsza chwila potwierdzenia. Nie kończymy obserwacji tylko dlatego, że upłynął przewidywany czas. Niepewny/nieaktualny odczyt oznacza „zakończenie niepotwierdzone”. Jeśli przez 15 minut po poleceniu nie rozpoznano startu, a stan jest potwierdzony jako bezczynny, zapisujemy „nie wykryto uruchomienia”. Długotrwały brak potwierdzenia zamyka obserwację po 24 h od końca horyzontu planu z jawną informacją o braku potwierdzenia. Wyłączenie zasilania i niska moc potwierdzają koniec poboru, nie gwarantują poprawnego wykonania programu ani umycia naczyń. Wyłączenie Auto nie wyłącza pracujących urządzeń.

Zatwierdzone wcześniej harmonogramy są zachowane. Nowa obserwacja nie wymyśla wstecznie startów i zakończeń, których nie ma w danych. Bieżące i ostatnie wykonanie zawiera rzeczywiste czasy oraz status obserwacji. Szczegóły są widoczne w Planowanie zużycia → Wykonanie w Home Assistant oraz w dolnej informacji karty. Dzienniki execution-RRRR-MM-DD.jsonl zachowują małe zdarzenia; nie podlegają automatycznemu usuwaniu. Pełne krzywe nie są dopisywane co minutę.

### Czy plan faktycznie się opłacił?

W Planowanie zużycia → Zapisane plany i weryfikacja pojawiają się również automatyczne plany. Potwierdzone mocą wykonanie łączy zapis planu z rzeczywistymi czasami, zachowując osobno pierwotne godziny. Po zamknięciu ostatniego okresu bilansowania aplikacja próbuje odczytać historię HA i porównać koszt prognozowany z kosztem odtworzonym z mocy domu, PV i urządzeń. Próbę z brakami ponawia najwyżej co 15 minut przez okres dostępności krótkiej historii (automatycznie do 14 dni od wykonania). Ręczny przycisk „Porównaj z pomiarami HA” pozostaje dostępny także dla starszych planów. Starszych niepotwierdzonych wykonań nie oznaczamy jako poprawne automatycznie.

Pokazujemy przewidywany i zmierzony dodatkowy zakup, koszt, energię urządzeń oraz PV podczas ich pracy. Dla kilku równoległych urządzeń produkcja PV jest liczona raz, jako wspólny okres pracy. Koszt jest różnicą domu z cyklami i bez ich zmierzonego poboru przy tych samych zamrożonych stawkach i zasadach bilansowania. To szacunkowy koszt z historii mocy, nie rachunek z liczników OSD ani rozliczenie faktury. Nie dodajemy dwa razy domu, salda lub utraconego eksportu. Weryfikacja wymaga kompletnych pomiarów; braki nie są zerami.

Porównanie po fakcie przesuwa ten sam zestaw zmierzonych cykli co 15 minut w już zakończonych, dostępnych okresach zakresu analizy. Zachowuje ich wzajemne przesunięcia, programy i ograniczenia; nie jest globalnym przeszukaniem wszystkich możliwych kombinacji. Odtwarza bazę domu po usunięciu zmierzonego poboru tych cykli, używa rzeczywistej PV i zamrożonych cen. Pokazuje najlepszy sprawdzony start, jego szacowany koszt i różnicę względem wykonania. To analiza z wiedzą o pogodzie po fakcie, nie dowód błędnej decyzji na podstawie wcześniejszej prognozy. Zakłada niezmienione pozostałe zużycie i PV; nie modeluje wpływu przesunięcia urządzeń na napięcie sieci ani temperaturę/program. Dostępny odcinek wcześniejszych danych jest ograniczony do 48 h przed wykonaniem, a przyszłych nie dopisujemy prognozą.

## Śnieg i dostępność paneli — 0.10.0

W Prognozach jest sekcja „Dostępność paneli — śnieg lub przeszkoda”. Po sprawdzeniu instalacji możesz włączyć 0% dostępności do końca jutra albo wcześniej przywrócić prognozę. Ograniczenie zmniejsza końcową PV Lab po dotychczasowych korektach, zanim energia trafi do podsumowań, planowania i eksportu do panelu Energia. Dotyczy przyszłej energii, nie zmierzonych kWh ani zakończonych godzin. Przebiegi źródłowe dostawców pozostają ich własnymi prognozami. Status i termin wygaśnięcia są widoczne; po odsłonięciu paneli przywróć wynik wcześniej. API dopuszcza 0–100% z obowiązkowym końcem najwyżej za 7 dni. Sam restart nie kasuje ograniczenia. Ustawienie jest w production-availability.json oraz kopii eksportu; nie zawiera sekretów.

Przy co najmniej 40 min pokrycia z ostatnich 45 min, przewidywanej energii co najmniej 0,4 kWh i zmierzonej produkcji poniżej 5% tej energii pokazujemy sygnał bardzo niskiej produkcji. Nie uznajemy jednej próbki zera, nocy ani luk w danych za śnieg. Sygnał nie włącza sam ograniczenia na jutro: podobny wynik może oznaczać awarię, pogodę lub problem pomiaru. Ręcznie potwierdzone ograniczenie jest jawną decyzją użytkownika; w tym czasie nowe bieżące próbki są wyłączane z uczenia korekt, aby znany brak dostępności nie stał się trwałym błędem dostawcy. Zmierzone dane nadal trafiają do raportów. Nie odtwarzamy automatycznie przyczyny dawnych zimowych strat i nie poprawiamy po fakcie zapisanych prognoz.


## Uzupełnienie obserwacji i wygląd Auto — 0.10.1

Przycisk na karcie ma zawsze krótki napis „Auto”. Kolor i zaznaczenie nadal wskazują stan, a bezpośrednio pod rzędem przycisków, po prawej stronie, pojawia się dyskretny opis „Tryb jednorazowy” albo „Tryb ciągły · bezterminowo”. Informacja o 10 minutach przygotowania pozostaje osobno. Dziś/Jutro są szare i zablokowane w obu aktywnych trybach; po wyłączeniu wracają do wyboru. Parametry kolorów w YAML pozostają obsługiwane.

Po aktualizacji lub przerwie w obserwacji bieżąca cisza nie dowodzi, że wcześniejszy cykl nie wystartował. Komunikat o niewykrytym starcie wymaga ciągłej, potwierdzonej bezczynności sięgającej chwili polecenia. Zapisany, zakończony cykl z „Profile urządzeń” może uzupełnić ostatni proces: musi mieć tę samą encję mocy, początek między 2 min przed poleceniem a 15 min po nim oraz poprawny koniec przed teraz. Przy wielu pasujących cyklach niczego nie przypisujemy. Aktualny i ostatni proces mogą otrzymać prawdziwy start i koniec także wtedy, gdy wcześniej nie rozpoznano startu. To korekta opisu i powiązania pomiarów; nie wysyła polecenia, nie przywraca anulowanego Auto i nie zmienia dat aktywnego harmonogramu.

Dla starszych zapisów bez recordId powiązanie z historią planów wymaga jednego pasującego zapisu: zgodna liczba cykli, identyfikatory, encje mocy i czas utworzenia różniący się o mniej niż 5 s. Brak lub niejednoznaczność pozostawia zapis bez automatycznego przypisania. Po potwierdzeniu wszystkich cykli rzeczywiste czasy trafiają do weryfikacji; pierwotne pozostają osobno. Koszt/import ostatniego zatwierdzonego przeplanowania są zapisywane niezależnie od pierwotnej rekomendacji, aby koszt wykonania nie był porównywany z porzuconą godziną. Dla starszego pojedynczego cyklu korzystamy z zapisanej przy nim końcowej estymaty; nie sumujemy niezależnych kosztów marginalnych kilku urządzeń. W 0.10.1 zachowano taryfy, bilansowanie, ówczesny próg 5 gr i zapisane prognozy. Nowa reguła 0.10.2 jest opisana poniżej.

Opcja śniegu jest w zakładce Prognozy, zaraz pod wykresem porównania, w sekcji „Dostępność paneli — śnieg lub przeszkoda”. Przyciski pozwalają ustawić 0% do końca jutra lub przywrócić prognozę. Nie jest to automatyczne rozpoznawanie śniegu.


## Ostrożniejsze Auto i historia decyzji — 0.10.2

### Pierwszy wybór Auto

Po przygotowaniu urządzeń Auto porównuje pełne znalezione harmonogramy według oceny **R = K + 0,5 × (K_gorszy − K)**. K jest szacowanym dodatkowym kosztem planu, a K_gorszy najwyższym kosztem spośród istniejących scenariuszy pogody i zużycia domu. Wartość 0,5 jest wagą ostrożności, nie prawdopodobieństwem pogody. Scenariusze wykorzystują wcześniejsze błędy PV dla danego horyzontu, gdy są dostępne; w przeciwnym razie roboczy margines 25%. Wahania bazy domu pochodzą z jej profilu. Nie pokazujemy pozornego procentu pewności i nie zakładamy, że sama zgodność dostawców gwarantuje produkcję. Nie jest to nowy model prognozy PV.

Tania strefa z zapisanej taryfy jest pełnoprawnym kandydatem, również gdy cały cykl wymaga sieci. Dokładne godziny pochodzą z konfiguracji, a nie ze sztywnego założenia 13:00/15:00. Liczymy cały profil, dom i bilans; nie mnożymy całej energii przez cenę z samej godziny startu. Nie wymuszamy taniej strefy: tańszy odporny wariant słoneczny może wygrać. Remisy rozstrzyga koszt podstawowy, koszt gorszego scenariusza, zapas PV, potem wcześniejszy start. Dla kilku urządzeń pozostaje heurystyka, bez gwarancji globalnego minimum.

Dotyczy to automatycznego wyboru po 10 minutach. Zwykłe „Zaplanuj” i ręczna lista propozycji zachowują dotychczasowy koszt oraz margines 5 gr za zapas. Ręcznie zatwierdzona godzina nie jest zastępowana pierwszym wyborem Auto. Automatyczny plan może zatem różnić się od pierwszej ręcznej propozycji, ponieważ bierze pod uwagę odporność kosztu. Nie zmieniamy cen, profili, bilansowania, przewidywanej produkcji ani terminów użytkownika.

### Przeplanowanie zatwierdzonych godzin

Obecny i nowy harmonogram liczymy na tych samych aktualnych danych, przy zachowaniu ustawień programu. Do przesunięcia potrzebne są wszystkie warunki:

- Oszczędność podstawowa co najmniej max(0,15 zł; 15% bezwzględnego kosztu obecnego terminu). Przy koszcie bliskim zeru sam duży procent nie wystarcza.
- Poprawa R co najmniej max(0,15 zł; 15% bezwzględnej wartości R obecnego terminu).
- K_gorszy nowego planu nie przekracza K_gorszy obecnego o więcej niż 0,01 zł; 1 gr jest tolerancją kosztu, nie zgodą na duży wzrost ryzyka.
- Ten sam pełny harmonogram spełnia reguły w dwóch kolejnych kontrolach oddzielonych co najmniej 30 min. Potwierdzenie wygasa po przerwie ponad 45 min; inny kandydat, brak danych lub błąd zerują oczekiwanie. Jeżeli termin kandydata minie przed potwierdzeniem, zachowujemy obecny plan.
- Wszystkie ograniczenia nadal obowiązują: brak nakładania tego samego sprzętu, horyzont, termin końca i zamrożenie zmian na ostatnie 15 min przed startem. Wysłany lub rozpoczęty cykl nie jest przesuwany. Tryb stałych godzin nie podlega przeplanowaniu.

Reguła dotyczy obu Auto oraz elastycznych planów ręcznych. Podobny koszt i sam większy zapas nie wystarczają już do zmiany zaakceptowanej godziny. Brak danych o którymkolwiek koszcie nie jest zerem. Dotychczasowe harmonogramy są zachowane; przy następnej dopuszczalnej kontroli korzystają z nowych warunków. Oczekujące potwierdzenie jest trwałym małym stanem w dashboard-plan.json; zmiana trybu je zeruje.

### Historia — co, gdzie i jak długo

W Planowanie zużycia znajduje się rozwijana „Historia decyzji Auto”. Pokazuje ostatnie 15 zdarzeń: czas, powód, obecny i rozważany start, koszty i wariant taniej strefy. Widać także odrzucenie zmiany, oczekiwanie na potwierdzenie i brak pełnej kontroli. Informacje o przygotowaniu, anulowaniu, wysłaniu polecenia i potwierdzonym cyklu są dopisywane do tych samych dzienników.

Pełne pliki /data/auto-decisions-RRRR-MM-DD.jsonl są bezstratnie kompresowane GZIP; daty nazw są w UTC, a wiersze zapisują także strefę instalacji. Przeglądarka plików pozwala je podejrzeć lub pobrać skompresowane albo rozpakowane. Nie podlegają automatycznej retencji prognoz. W pamięci utrzymujemy do 200 ostatnich zdarzeń (po restarcie z ostatnich 30 dni); archiwum plików pozostaje pełne. Eksport kopii zawiera wszystkie dzienniki Auto, również starsze niż ten podgląd. Odczyt eksportu jest zsynchronizowany z dopisywaniem, aby nie potraktować trwającego zapisu jako uszkodzenia.

Każda kontrola zapisuje próg i wersję reguły, koszt podstawowy, gorszy i R, oszczędność kwotową/procentową, kilka najlepszych alternatyw i tanią strefę, czas przeliczenia i odczytów źródeł, cennik, godziny i statusy cykli. Nie kopiujemy pełnych krzywych dostawców ani surowych historii urządzeń co 30 min. Dziennik łączy się z istniejącymi wersjami prognoz przez czas przeliczenia. Brak miejsca/błąd zapisu historii jest jawnie zgłaszany w zdarzeniach aplikacji; nie udajemy zapisanego audytu.

### Weryfikacja progów

Sprawdzono dostępne zapisane plany Auto, używając wyłącznie wersji prognoz znanych przed każdym porównaniem. Zamrożono zapisane programy i ceny oraz wykluczono późniejsze pomiary z modelu domu. Porównano 5 gr, 10 gr/10%, 15 gr/15% i 20 gr/20%. Próba jest mała i zawiera powtórzenia planów. Wyższe progi dały w niej taki sam wynik; nie dowodzi to optymalności 15 gr/15%. Zastosowano ustaloną ostrożną wartość. Zapisana zmiana za około 5 gr nie spełnia nowego progu. Testy osobno sprawdzają, że istotna i potwierdzona poprawa nadal pozwala zmienić plan oraz że tania strefa może wygrać przy mniejszym ryzyku.

Odtworzenie nie jest dokładną kopią dawnych decyzji: brak pełnej historycznej migawki modelu ryzyka i wszystkich bieżących stanów urządzeń. W próbie użyto roboczego marginesu PV 25%, więc nie przypisujemy jej potwierdzonego wzrostu oszczędności na rachunku. Nowe dzienniki pozwolą dokładniej ocenić przyszłe decyzje. Nie poprawiamy starych prognoz ani zapisów po fakcie.


## Naprawa niepełnego obrazu aplikacji — 0.10.3

Komunikat „execution-monitor.mjs does not provide an export named executionRecord” oznacza niezgodność plików uruchamianej aplikacji: nowszy serwer oczekuje funkcji, której starszy moduł jeszcze nie ma. Nie jest to błąd historii urządzeń ani konfiguracji użytkownika. Poprawne pliki na GitHub nie zmieniają automatycznie już zbudowanego obrazu. Nawet numer 0.10.2 w HA nie dowodzi kompletności kodu, jeżeli aplikację zbudowano przed uzupełnieniem plików. Restart uruchamia ten sam obraz, a aktualizacja samej integracji HACS nie wymienia /app/src aplikacji.

Wersja 0.10.3 ma nowy numer aplikacji i integracji. Paczka jest zbiorczą różnicą od 0.10.0: zawiera także poprawki 0.10.1 i 0.10.2, które mogły zostać pominięte. Wgraj zawartość ZIP do katalogu głównego repozytorium z zachowaniem podkatalogów. Po udanej publikacji odśwież repozytorium w sklepie aplikacji/dodatków HA i zaktualizuj samą aplikację PV Lab do 0.10.3. Zaktualizuj integrację HACS do 0.10.3, uruchom ponownie HA i odśwież kartę. Nie trzeba odinstalowywać aplikacji, usuwać katalogu /data, ponawiać importu ani zmieniać YAML. Zachowane terminy i Auto pozostają zapisane.

Podczas budowania obrazu kontrolujemy połączenie całego grafu modułów ES w src i public. Kontrola sprawdza istnienie plików oraz rzeczywiste nazwy eksportów, w tym executionRecord, i obsługuje statyczny JSON. Nie wykonuje kodu serwera lub interfejsu, nie wywołuje HA i nie otwiera trwałego /data. Taka sama kontrola działa przed testami publikacji. Zastosowano wbudowany mechanizm modułów Node.js 22, bez dodatkowych pakietów. Negatywny test celowo usuwa eksport i potwierdza odrzucenie mieszanki plików; osobny efekt uboczny dodany w teście potwierdza, że aplikacja nie jest wykonywana podczas tej kontroli.

To naprawa dystrybucji i kontroli budowania. Obliczenia PV, taryfy, progi 15 gr/15%, scenariusze ryzyka, historia Auto oraz detekcja cykli pozostają takie jak w kompletnym 0.10.2. Stan karty zależy od załadowanej integracji i działającej aplikacji; przy problemie połączenia po aktualizacji najpierw potwierdź uruchomienie aplikacji, następnie integracji HA.
