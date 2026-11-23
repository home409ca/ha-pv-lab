# Zaplanuj uruchomienie — PV Lab 0.9.4

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnięcia Pralka lub Zmywarka wybierają kolejno 0 → 1 → 2 → 3 → 0. Aktywne urządzenie jest zielone; obok jest mała liczba bez plakietki. Zaznacz Dziś, Jutro lub oba. Zaplanuj pokazuje do trzech znalezionych pełnych planów z udziałem PV lub bilansu. Nie dokłada propozycji w całości płatnych, jeśli są słoneczne. Jeśli nie znaleziono takiego planu, pokazuje jeden najtańszy znaleziony; przy tej samej cenie najwcześniejszy. Pełne porównanie kosztów i pozostałe alternatywy pozostają w aplikacji. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. W nagłówku planu są kwota, ?, Zatwierdź. Nazwa cyklu i godziny są w jednym wierszu. Przycisk ? otwiera energię, zapas PV i warianty pogodowe. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź uzbraja terminy i włączenie switchy w HA, Anuluj rozbraja przyszłe polecenia. Wysyłamy tylko turn_on; nigdy nie wyłączamy gniazdek. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.9.4-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

Na karcie pod ceną znajduje się cienki pasek udziałów energii: zielony PV i bilans, pomarańczowy Do dokupienia. Procent zakupu = dodatkowa energia do dokupienia po bilansowaniu / suma energii cykli, ograniczony do 0–100%; zielony jest dopełnieniem. To udział po rozliczeniu okresów, a nie fizyczny pobór w każdej minucie. Baza domu i trwające cykle są już uwzględnione przed nowymi cyklami. Przy brakującej energii lub niepoprawnym wyniku pasek jest pomijany, nie pokazuje fikcyjnego 100% PV. Gdy miniona część bieżącego okresu miała saldo importu, dodatkowy zakup może być większy niż energia cykli; udział jest wtedy ograniczony do 100%, a wyliczony koszt nie jest obcinany. Procenty zaokrąglamy do pełnych liczb.

Od 0.8.13 karta domyślnie pokazuje jeden plan. Strzałka rozwija pozostałe: zielona oznacza zerowy zakup energii we wszystkich ukrytych propozycjach, pomarańczowa zakup w co najmniej jednej. Przy jednej propozycji nie ma strzałki. Po zatwierdzeniu innego wariantu po zwinięciu pozostaje widoczny właśnie zatwierdzony. W aplikacji dodatkowa tabela porównuje start dziennej taniej strefy (domyślnie 13:00 zimą/15:00 latem) oraz początek godziny szczytu PV, dla każdej doby zakresu. Nie pomija ograniczeń urządzeń.


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

Kontrola działa w integracji HA także po zamknięciu karty. Do PV Lab trafia żądanie oceny co 30 minut, sprawdzane przez niezależny minutowy zegar. Porównujemy pozostawienie pierwotnych przyszłych terminów z nowymi wariantami, **oba na tej samej aktualnej prognozie, bazie domu i cenach**. Dopuszczamy zmianę przy co najmniej 0,05 zł oszczędności albo przy większym o co najmniej 0,2 kWh zapasie PV bez wzrostu kosztu, przy tej samej cenie po zaokrągleniu do groszy. To progi ograniczające ciągłe drobne przesunięcia.

Nie zmieniamy liczby cykli, programu ani horyzontu. Profil i ograniczenia zatwierdzenia są zapamiętane. Przyszłe starty są nadal sprawdzane co 15 minut z 5-minutowym przebiegiem cyklu i wybranym bilansowaniem. Cykle jednego sprzętu nie mogą się nakładać. Wysłane/rozpoczęte cykle nie są ponownie planowane; ich zapamiętany czas zakończenia oraz bieżąca obserwacja pracy blokują wcześniejszy kolejny start. Start w ostatnich 15 minutach jest zamrożony. Niepełne dane lub nieudane połączenie oznaczają zachowanie dotychczasowych godzin, a nie fikcyjną oszczędność. Po częściowym wykonaniu korzyść liczymy dla pozostałych cykli; wyświetlana wycena całego planu zachowuje zapamiętane szacunki wcześniejszych cykli, więc nie jest rachunkiem za faktycznie zużytą energię.

W aplikacji „Planowanie zużycia” → „Wykonanie w Home Assistant” widać ostatni zatwierdzony harmonogram (start i koniec każdego cyklu), jego status i tryb, również dla Auto. Ostatnia kontrola pokazuje czas, koszt zachowania dotychczasowych godzin i koszt najlepszego znalezionego wariantu na tych samych aktualnych danych. Kontrola bez zmiany jest również widoczna; przy braku danych wartości pozostają puste. Karta pokazuje ostatnią kontrolę i zmianę, np. „12:15 → 11:15 · taniej o 0,18 zł”. Podgląd wykonania jest też w aplikacji, w Planowaniu zużycia. Przeliczenie nie gwarantuje globalnie najlepszego spośród wszystkich kombinacji — korzysta z dotychczasowego silnika planowania, bez AI.

### Auto

Kliknięcie **Auto** rozpoczyna trwałe odliczanie **10 minut**. Możesz przygotować urządzenia i wyłączyć ich switche; nie muszą być wyłączone przy kliknięciu. Karta wyróżnia Auto znakiem ✓ i kolorem, pokazuje komunikat oraz godzinę sprawdzenia. Dopiero po 10 minutach integracja HA prosi aplikację o świeży odczyt. Dla każdego switcha ze stanem dokładnie `off` wybieramy jeden cykl i zatwierdzamy wspólny pełny plan w trybie elastycznym. Obowiązuje zakres dat wybrany przy włączeniu Auto, bez przesuwania doby po północy. Urządzenia `on`, brakujące i `unavailable` nie są dodawane. Jeżeli żaden switch nie jest wyłączony albo nie ma pełnego planu, Auto nie uzbraja poleceń. Zachowujemy wybrane w aplikacji programy i terminy zakończenia. Jeśli istnieje aktywny plan, najpierw go anuluj.

**Auto obejmuje jedną partię**, najwyżej po jednym cyklu zmywarki i pralki. Co pół godziny sprawdza lepszą godzinę jej pozostałych uruchomień. Nie dopisuje bez końca kolejnych prań ani nie rozpoczyna nowej partii po ponownym wyłączeniu gniazdka. Po wysłaniu wszystkich poleceń Auto kończy pracę. Kolejne kliknięcie aktywnego Auto anuluje odliczanie lub przyszłe uruchomienia tej partii; nigdy nie wyłącza już pracujących urządzeń. Dla kolejnej partii włącz Auto ponownie.

Odliczanie przechowujemy również w HA. Po restarcie czekamy do zapisanego czasu, a przy braku połączenia po upływie 10 minut ponawiamy próbę najwyżej raz na minutę. Brak wyłączonych switchy lub pełnego planu kończy tę próbę Auto z opisem przyczyny. Anulowanie blokuje również spóźnioną odpowiedź z planem.

### Wykonanie poleceń i przerwy w działaniu

Integracja HA zapisuje uzbrojony plan lokalnie i ustawia zegar na konkretny czas UTC. Dla **każdego cyklu**, również kolejnego prania, wywołuje wyłącznie `switch.turn_on` z zapamiętanym `entity_id`. Polecenie jest wysyłane także wtedy, gdy switch już ma stan `on`. Nie wykonujemy `turn_off`, impulsu wyłącz/włącz ani innych usług. Urządzenie musi być przygotowane do startu po podaniu zasilania — samo włączenie już włączonego gniazdka nie daje ponownego impulsu i nie gwarantuje rozpoczęcia programu.

Normalny restart HA odtwarza przyszłe polecenia. Niedostępna aplikacja PV Lab nie zatrzymuje lokalnego wykonania już zapisanego planu, ale uniemożliwia znalezienie lepszych terminów. Jeśli HA nie działał o godzinie startu, dopuszczamy najwyżej 2 minuty opóźnienia; później oznaczamy polecenie jako pominięte. Brak lub niedostępność switcha oznacza błąd, nie wysłanie do innej encji. Anulowanie na karcie rozbraja lokalny plan także przy chwilowym braku połączenia z aplikacją; potwierdzenie anulowania zostanie przekazane po powrocie połączenia. Wyłączenie lub usunięcie integracji zatrzymuje jej zegary.

Przed wysłaniem zapisujemy zamiar wykonania. Normalny restart i powtarzane odczyty nie wysyłają drugi raz tej samej komendy. Nie można zagwarantować jednocześnie dostarczenia i dokładnie jednego wykonania przy awarii między zapisem a wywołaniem usługi: taki przerwany lub niepewny przypadek oznaczamy „niepewny” i **nie ponawiamy automatycznie**. „Wysłano polecenie” potwierdza wywołanie usługi HA, nie pracę programu ani sprzętowe potwierdzenie gniazdka. Faktyczną pracę oceniają istniejące czujniki mocy.

### Dane i retencja wykonania

`/data/dashboard-plan.json` przechowuje bieżący plan, tryb, zamrożone profile, pierwotny zakres, statusy cykli, ostatnią kontrolę kosztów, odliczanie Auto, kompaktowy wykres ostatniego zatwierdzenia lub kontroli i do 20 ostatnich zmian. Zapis wykresu jest zastępowany przy kontroli; nie tworzymy osobnego pliku na każdy odczyt. Dzienniki `/data/execution-RRRR-MM-DD.jsonl` zachowują zdarzenia zatwierdzeń, kontroli, zmian i potwierdzeń; nie podlegają automatycznemu usuwaniu i można je pobrać w Plikach i retencji. Eksport JSON/GZIP obejmuje też te zdarzenia. To małe podsumowania, bez surowych odczytów encji i kluczy.

W HA `.storage/pv_lab_execution_<entry_id>` jest osobnym trwałym rejestrem zegara i do 200 ostatnich tożsamości poleceń, z kolejką potwierdzeń, odliczaniem Auto i pamięcią ostatnich 200 anulowanych identyfikatorów Auto. Ta część należy do kopii Home Assistant, a nie eksportu samej aplikacji. Publiczny odczyt integracji nie przesyła pełnych profili wykonania. Nowe funkcje nie zmieniają prognozy PV, cen, historii produkcji ani ustawień AI.




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
