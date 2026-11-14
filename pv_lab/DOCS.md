# PV Lab — pełna instrukcja użytkownika

<!-- pv-lab-manual-version: 0.7.6 -->

**Wersja aplikacji i instrukcji: 0.7.6.** Instrukcja opisuje obecny kod, również warunki braku wyniku. Wartości domyślne można zmienić.

## 1. Cel i zasada działania

PV Lab tworzy jedną prognozę produkcji AC z prognoz dostawców, pomiarów i historii. Używa reguł i statystyk, bez AI. Wynik trafia do wykresów, planowania, optymalizatora i integracji HA. Aplikacja nie steruje urządzeniami ani zabezpieczeniami. Nie prognozuje napięcia w woltach.

| Element | Wpływ na końcową prognozę PV |
| --- | --- |
| Dane dostawców i limit falownika | Tak — podstawa oraz fizyczne ograniczenie. |
| Kalibracja i wagi źródeł | Tak — poprawiają powtarzalny błąd i ustalają udział dostawców. |
| Świeża produkcja | Tak — dostosowuje najbliższy okres, ze słabnącym wpływem. |
| Historyczny potencjał całości AC | Tak, po kwalifikacji — łagodnie ogranicza zawyżenie. |
| Ryzyko przestojów | Tak, po kwalifikacji — odejmuje oczekiwaną stratę. |
| Panele i zacienienie | Diagnostyka; nie jest dodatkowym mnożnikiem prognozy. |
| Historia i trendy | Widok opisowy; te same dane mogą zasilać kwalifikowany potencjał. |
| Raport porównań | Ocenia wcześniejsze wyniki, nie zmienia przeszłości. |
| Profile urządzeń, zużycie domu, ceny | Zmieniają rekomendacje uruchomienia, nie produkcję PV. |
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

**Porównanie prognoz i produkcji:** linie źródeł, PV Lab i pomiaru. Oś W przedstawia średnią moc, czyli Wh kwadransa × 4. Ukrywanie linii i przełączenie wersji źródłowej/po limicie zmienia tylko wygląd. Mysz/dotyk pokazuje czas, pionową linię i wartości. Noc jest ograniczana; prawdziwe zera w dzień pozostają.

**Stan kalibracji:** liczba porównań, nie dni importu. Pokazuje blokadę ostatniego kwadransa: brak mocy/statusu, pokrycia lub dostatecznej prognozy. Standardowo wymagane jest co najmniej 95% pokrycia i prognoza ≥20 Wh zapisana przed przedziałem. Nocą obserwacje produkcyjne zwykle nie przyrastają.

**Twoje połacie:** moc DC z napięcia × prąd, nie niezależny pomiar AC połaci. **Jakość danych:** kwalifikacja do uczenia. Samo wysokie napięcie przy normalnej pracy jest ostrzeżeniem, nie automatycznym wykluczeniem.

<!-- tab:forecast -->
## 4. Prognozy i korekty

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

Kontrola odbioru prognozy przez Home Assistant działa automatycznie podczas korzystania z panelu, najwyżej raz na minutę. Nie wymaga przycisku. Podstawowy wykres i porównanie korzystają bezpośrednio z wyniku eksportera integracji i są dostępne niezależnie od tej kontroli. Osobne kolumny pokazują wartości odebrane przez HA i zgodność z bieżącym eksportem. Odczyt jest migawką z podaną datą; nie potwierdza odświeżenia karty Energia w innej karcie przeglądarki. W razie różnicy sprawdź czas odczytu; kontrola ponowi się automatycznie, a przyczyną może być starsza odpowiedź integracji. Awaria kontroli nie blokuje wyświetlenia lokalnej prognozy; ostatni udany odczyt pozostaje oznaczony swoją datą. Ostrzeżenia informują także o innych wybranych źródłach i wielokrotnym przypisaniu PV Lab, które może sumować prognozy. Przy kilku instancjach bez jednoznacznego wyboru nie zgadujemy, którą porównywać.

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

<!-- tab:planner -->
## 6. Planowanie urządzenia

Wybiera termin jednego cyklu, ograniczając dokupioną energię. Nie wybiera według taryfy. Podaj kWh, czas, rezerwę lub profil. Bez profilu 4 kWh/2 godziny oznacza stałe 2 kW. Starty co 15 minut, profil w krokach 5 minut; dostępne ograniczenia początku i końca. Wynik pokazuje okno, pokrycie, dodatkowy import i alternatywy. Najpierw uwzględnia się resztę domu.

| Tryb | Zasada |
| --- | --- |
| Godzinowy | Kompensacja importu i eksportu w tej samej pełnej godzinie. |
| 15-minutowy | Kompensacja w kwadransie. |
| Bez czasowego | Przybliżenie przepływu w krokach 5 minut. |

Świeża potwierdzona encja salda godzinowego ma pierwszeństwo dla bieżącej godziny: plus eksport, minus import, reset o pełnej godzinie. Liczniki narastające nie są automatycznie godzinowe. Bez pomiaru saldo może być szacowane — źródło jest opisane. Saldo nie przechodzi do następnej godziny; to nie fizyczny magazyn.

<!-- tab:optimizer -->
## 7. Optymalizator zużycia energii

Wybiera terminy cykli według PV, zużycia domu, taryfy, bilansowania i niepewności. Zapis i potwierdzenie wykonania nie uruchamiają urządzeń.

### Bilans i ceny

Kafelki: moc PV, domu, import, eksport, baza bez urządzeń i ceny. „—” to brak poprawnego odczytu. **Noc nie uzasadnia braku mocy domu.** PV 0 W jest poprawne; niedostępna encja nie jest automatycznie zerem.

„Przelicz symulację” ponawia odczyt HA. Panel podaje błędy połączenia, brakujące encje i nieprawidłowe jednostki. Samo przeliczenie nie stworzy historii usuniętej encji.

Bez bezpośredniego pomiaru domu można użyć bilansu mocy. Dla plusa oznaczającego import: `moc domu = moc PV + moc sieci`. Przy plusie eksportu odwróć znak w konfiguracji. Ujemna moc sieci nie jest ujemnym zużyciem domu. Domyślna sensor.grid_power_total_historia ma plus import i minus eksport; jednostka W/kW. Usunięty sensor.zamel_pobor_caly_dom może nadal służyć do odczytu archiwum InfluxDB.

Wzór dotyczy instalacji bez akumulatora. Magazyn, drugi generator lub niewspółmierne miejsca pomiaru wymagają dodatkowego bilansu, którego ten wzór nie opisuje. Kafelek wskazuje, czy dom pochodzi z encji, czy z oszacowania.

### Wspólny harmonogram i szczegóły

Do 8 aktywnych urządzeń, każde jako jeden przyszły cykl. Tabela: wspólny start, koszt marginalny, samodzielnie najtaniej, samodzielnie najwięcej PV, status. Dwa urządzenia nie mogą zużyć tej samej nadwyżki dwa razy. Główną rekomendacją jest plan wspólny; dwa wyniki samodzielne to porównania.

Plan powstaje według priorytetu, z maksymalnie trzema przejściami ulepszeń. To heurystyka bez gwarancji globalnego optimum. Programy tej samej encji urządzenia nie są planowane równocześnie. Koszty marginalne przy innych cyklach już zaplanowanych nie muszą sumować się do kosztu wspólnego.

Wykres: kwadransowa energia PV, bazy, urządzeń i saldo przed bilansowaniem całej godziny. Plus salda oznacza eksport. Szczegóły urządzenia pokazują profil mocy, kWh/czas, koszty, import/eksport i alternatywy oraz wykres kosztu startów.

„Udział PV” opisuje szacowane fizyczne pokrycie nadwyżką. „Dokupiona energia” dotyczy dodatkowego importu po bilansowaniu. Mogą się różnić. Różnica względem najdroższego terminu nie jest oszczędnością względem Twojego zwyczaju.

Zakresy dat i godzin dotyczą całego cyklu. Limit mocy sieci jest oceniany w krokach 5 minut — nie zastępuje zabezpieczeń ani limitu chwilowego na każdej fazie. Niekompletna dzienna prognoza może wykluczyć termin; nocne zero modelowe jest dopuszczalne.

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

Ranking = koszt centralny + waga ostrożności × różnica między najgorszym a centralnym scenariuszem. Domyślnie waga 0,25. Zakres scenariuszy nie jest przedziałem ufności ani gwarantowanym kosztem.

Zapis planu utrwala prognozę, ceny i założenia. Po rzeczywistym wykonaniu zaznacz potwierdzenie, a po zakończeniu okresów uruchom weryfikację. Odczytywane są pomiary domu, PV i urządzeń. Braki nie są zastępowane planem jako rzekomą rzeczywistością. Ocena korzysta z utrwalonych cen, nie faktury. Nie zmienia automatycznie cen ani profilu pralki. Wynik można wyeksportować.

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

Profile mają kroki 5 minut. W ręcznym wpisujesz **W**, energia kroku = W/12 Wh; czas planu jest dopasowany do 15 minut. Dla pracy ciągłej wybiera się okno, np. 2 godziny — to nie naturalny pełny cykl ani model cieplny budynku. Inna temperatura/nastawa klimatyzacji zmieni zużycie.

Profile wpływają na planowanie i optymalizator, nie prognozę PV.

<!-- tab:panels -->
## 9. Panele i zacienienie

Kafelek łączy aktualne W i najniższą historyczną relację kwalifikowanego przedziału. Te informacje nie muszą dotyczyć tej samej chwili.

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

Pełne cztery kwadranse godziny porównywane są z poziomem znormalizowanym +15% marginesu. Poniżej niczego nie zmieniamy. Powyżej zmniejszamy łagodnie, proporcjonalnie do pewności, maksymalnie o 25%. Nigdy nie podnosimy niskiej prognozy do historycznego maksimum.

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
| appliance-profiles.json | Cykle i profile. |
| optimizer-settings/load/history.json | Ustawienia, oczyszczona baza i zapisane plany/oceny. Nazwy trzech osobnych plików zaczynają się od optimizer-. |

Surowe napięcia domyślnie nie są trwale przechowywane (0 godzin). Krótki bufor może być w pamięci. Wieloletnim źródłem pozostaje InfluxDB. Retencja próbek nie usuwa automatycznie wyuczonych agregatów.

Podgląd pliku ma limit pierwszych 32 000 bajtów. Nie jest pełnym pobraniem dużego pliku. Pełny stan pobierz przez **Eksportuj kopię danych** w Ustawieniach. Eksport nie zawiera klucza parowania i hasła InfluxDB, ale ujawnia dane o domu i urządzeniach — nie publikuj go w repozytorium.

Brak automatycznego kasowania prognozy Energii nie chroni przed usunięciem danych dodatku lub awarią nośnika. Rób kopie HA. Nie ma odtworzenia archiwum, którego nigdy nie zapisano.

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
6. Kwalifikowany potencjał łagodnie ogranicza zawyżenie.
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
