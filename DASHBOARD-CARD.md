# Zaplanuj uruchomienie — PV Lab 0.9.0

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnięcia Pralka lub Zmywarka wybierają kolejno 0 → 1 → 2 → 3 → 0. Aktywne urządzenie jest zielone; obok jest mała liczba bez plakietki. Zaznacz Dziś, Jutro lub oba. Zaplanuj pokazuje do trzech znalezionych pełnych planów z udziałem PV lub bilansu. Nie dokłada propozycji w całości płatnych, jeśli są słoneczne. Jeśli nie znaleziono takiego planu, pokazuje jeden najtańszy znaleziony; przy tej samej cenie najwcześniejszy. Pełne porównanie kosztów i pozostałe alternatywy pozostają w aplikacji. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. W nagłówku planu są kwota, ?, Zatwierdź. Nazwa cyklu i godziny są w jednym wierszu. Przycisk ? otwiera energię, zapas PV i warianty pogodowe. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź uzbraja terminy i włączenie switchy w HA, Anuluj rozbraja przyszłe polecenia. Wysyłamy tylko turn_on; nigdy nie wyłączamy gniazdek. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.9.0-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

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
```

| Opcja | Domyślnie | Działanie |
| --- | --- | --- |
| `layout` | `compact` | `compact`: mniejsze odstępy, Dziś/Jutro/Zaplanuj w jednym wierszu, bez opisu i powtórzenia wyboru. `full`: dotychczasowy obszerniejszy układ. |
| `title` | `Zaplanuj uruchomienie` | Dowolna nazwa. `title: ""` ukrywa nagłówek. |
| `show_header` | `true` | `false` ukrywa nagłówek, zachowując wpisaną nazwę w konfiguracji. |
| `max_plans` | `3` | Liczba dostępnych na karcie planów: 1, 2 lub 3. Domyślnie widoczny jest jeden, pozostałe rozwija strzałka. |
| `show_energy_bar` | `true` | `false` ukrywa pasek i procenty PV/bilans–sieć. |
| `show_details` | `true` | `false` ukrywa przycisk `?` oraz szczegóły. Zatwierdzenie pozostaje dostępne. |
| `entry_id` | automatycznie | Identyfikator integracji przy kilku instalacjach; dotychczasowe działanie pozostaje. |

Najmniejsza karta: `show_header: false`, `max_plans: 1`, `show_details: false`. Wersja pełna: `layout: full`. Zachęcamy do pozostawienia paska energii — szybko pokazuje zakup z sieci. Wszystkie te parametry zmieniają tylko wygląd, nigdy model, taryfę, liczbę cykli ani ranking. Zatwierdzony plan pozostaje widoczny także wtedy, gdy po zmniejszeniu `max_plans` znalazłby się poza zakresem. Pełne alternatywy nadal są w aplikacji.

W kompaktowej karcie przyciski `?` i zatwierdzenia są mniejsze, a przycisk pozostałych planów jest blisko rekomendacji, po prawej. Urządzenia nadal wybierasz dotykiem 0 → 1 → 2 → 3 → 0, z zielonym zaznaczeniem i małą liczbą przy wybranym sprzęcie.

Od wersji 0.8.15 przyciski Dziś/Jutro mają neutralne tło; zaznaczony dzień wyróżnia delikatne niebieskie podświetlenie i niebieskie obramowanie. Zaplanuj zachowuje pełne wypełnienie kolorem akcji motywu Home Assistant. Dzięki temu wybór zakresu jest wizualnie oddzielony od uruchomienia obliczeń. Dotyczy obu układów oraz jasnych i ciemnych motywów. Nie zmienia to wybranych dni, rankingu, obliczeń ani przechowywanych danych.


## Domyślny wybór i kolejność urządzeń — 0.8.16

Zmywarka jest pierwsza, pralka druga, a pozostałe urządzenia dalej, z zachowaniem ich wzajemnej kolejności. Dotyczy kart urządzeń, profili, konfiguracji oraz karty dashboardu. Harmonogram wykonania nadal pokazuje czas pracy; przy jednoczesnym starcie pierwsza jest zmywarka. Kolejność wyświetlania nie jest priorytetem obliczeń i nie zmienia blokady kolejnych cykli tego samego sprzętu.

Po świeżym otwarciu karty lub aplikacji domyślny wybór to zmywarka ×1 i pralka ×0. System sprawdza dopuszczalne starty dzisiaj, korzystając z tego samego profilu programu, ograniczeń, bazy domu, stanu pracy i bilansowania co planer. Nawet częściowy udział PV lub dostępnego bilansu pozostawia dziś. Gdy wszystkie poprawne dzisiejsze okna wymagają zakupu całej energii, automatycznie wybiera jutro. Tak samo, jeśli cykl nie zmieści się już przed końcem doby. Nie wybieramy jutra tylko dlatego, że jutro jest taniej. Przy brakujących dziennych prognozach zostawiamy dziś i podajemy powód — brak nie oznacza zerowej produkcji. Jutro to tylko proponowany zakres, nie obietnica dostępności PV ani kompletnej prognozy.

Profile, warianty, encje, terminy zakończenia oraz zapisane ustawienia nie są kasowane. Domyślny wybór jest propozycją formularza, nie automatycznym zapisem ustawień ani zatwierdzeniem harmonogramu. Zmienione liczby cykli i dni pozostają w bieżącej sesji, a po zapisaniu formularza obowiązują zapisane wybory. Na karcie zatwierdzony plan ma pierwszeństwo i nie jest zastępowany domyślną zmywarką. Wybór możesz dowolnie zmienić przed przeliczeniem. Rozpoczęcie nowej sesji ponownie proponuje jeden cykl zmywarki. Zasada dziś/jutro jest obliczana na serwerze raz i udostępniana obu widokom.

## Szybkość planowania — 0.8.16

Przygotowane statystyki wieloletniego zużycia domu są buforowane w pamięci zamiast ponownie przeglądać wszystkie godziny przy każdym przeliczeniu. Bufor dotyczy wyłącznie zagregowanych statystyk; świeży pomiar domu, wiek danych i bieżący czas nadal są uwzględniane na nowo. Import, zmiana danych lub źródeł, strefy oraz nadejście przyszłej próbki unieważniają bufor. Restart przygotowuje go ponownie. Historia na dysku i jej retencja nie zmieniają się.

W obrębie jednego obliczenia ponownie wykorzystujemy oceny tych samych startów przy identycznych rezerwacjach, najwyżej 32 zestawy. Identyczne kolejności urządzeń są sprawdzane raz. Dla jednego cyklu nadal sprawdzamy wszystkie dopuszczalne starty co 15 minut, bez powtarzania wielourządzeniowych przejść. Pozostają dwie analizy, scenariusze pogodowe, porównania taniej taryfy/szczytu PV i dotychczasowa liczba alternatyw. Nie zmniejszono dokładności ani zakresu poszukiwania.

Karta może wykorzystać wspólny odczyt HA młodszy niż 10 sekund. Starszy odczyt jest pobierany ponownie; krótka historia urządzeń jest odświeżana według dotychczasowych warunków świeżości, zamiast wymuszania jej przy każdym kliknięciu. Ręczne „Odczytaj dane i przelicz” zachowuje wymuszenie odczytu. Zmiana bieżącego pomiaru lub stanu urządzenia unieważnia wynik planu. Pierwsze obliczenie po starcie/importowaniu dużej historii może trwać dłużej; problem z HA lub siecią nadal może wydłużyć oczekiwanie.


## Włączanie urządzeń i automatyczna aktualizacja planu — 0.9.0

**Co zmieniło się względem 0.8:** od tej wersji nowe zatwierdzenie na aktualnej karcie HA oznacza zgodę na wysłanie poleceń włączenia switchy. Samo „Zaplanuj”, zapis wariantu w aplikacji do porównania i potwierdzenie wykonania w archiwum nadal nie sterują urządzeniami. Wcześniejsze zatwierdzenia bez sekcji wykonania nie są automatycznie uzbrajane. Stara karta z pamięci podręcznej dostaje komunikat o konieczności odświeżenia, zanim będzie mogła uzbroić sterowanie.

### Konfiguracja switchy

Wejdź w **Ustawienia → Urządzenia — profile i sterowanie → Zmywarka / Pralka**. Pole „Switch do włączenia o zaplanowanej godzinie” przyjmuje wyłącznie encję `switch.*`; puste pole wyłącza możliwość uzbrojenia danego urządzenia. Domyślnie:

| Urządzenie | Switch |
| --- | --- |
| Zmywarka | `switch.gniazdkopomiarzmywarka` |
| Pralka | `switch.gniazdkopomiarpralka` |

Można podać inne encje. Nie wolno przypisać tego samego switcha dwóm urządzeniom. Przed zmianą mapowania anuluj aktywny plan; zatwierdzenie zapamiętuje konkretny switch, więc zmiana ustawień nie może po cichu przekierować istniejącego polecenia. Wykrywanie pracy nadal korzysta z encji mocy, nie ze stanu gniazdka. Switch „on” nie jest dowodem, że program urządzenia pracuje.

### Trzy tryby przy zatwierdzaniu

Kolorowa ikona kłódki obok `?` i „Zatwierdź” przełącza kolejno:

| Kolor / tryb | Reguła |
| --- | --- |
| Czerwony, zamknięta kłódka — **Stałe godziny** | Domyślny. Nie zmieniamy godzin zatwierdzonych cykli. |
| Zielony, otwarta kłódka — **Elastyczny** | Co 30 minut sprawdzamy lepsze terminy przyszłych cykli w pierwotnie wybranym, bezwzględnym zakresie dat i z zachowaniem ograniczeń. |
| Niebieski — **Elastyczny, bez późniejszego końca** | Jak elastyczny, ale koniec ostatniego cyklu każdego urządzenia nie może przekroczyć jego końca z pierwotnie zatwierdzonego planu. |

Opis ikony jest dostępny po wskazaniu/fokusie i jako etykieta dostępności. Tryb można zmienić także po uzbrojeniu planu. Kliknięcie ikony w Auto przełącza partię na wskazany tryb ręcznie zatwierdzonego planu; nie dodaje cykli. Zmiana trybu sama nie przesuwa żadnego terminu — pierwsza kontrola przypada po 30 minutach.

### Sprawdzanie lepszego terminu

Kontrola działa w integracji HA także po zamknięciu karty. Do PV Lab trafia żądanie oceny co 30 minut, sprawdzane przez niezależny minutowy zegar. Porównujemy pozostawienie pierwotnych przyszłych terminów z nowymi wariantami, **oba na tej samej aktualnej prognozie, bazie domu i cenach**. Dopuszczamy zmianę przy co najmniej 0,05 zł oszczędności albo przy większym o co najmniej 0,2 kWh zapasie PV bez wzrostu kosztu, przy tej samej cenie po zaokrągleniu do groszy. To progi ograniczające ciągłe drobne przesunięcia.

Nie zmieniamy liczby cykli, programu ani horyzontu. Profil i ograniczenia zatwierdzenia są zapamiętane. Przyszłe starty są nadal sprawdzane co 15 minut z 5-minutowym przebiegiem cyklu i wybranym bilansowaniem. Cykle jednego sprzętu nie mogą się nakładać. Wysłane/rozpoczęte cykle nie są ponownie planowane; ich zapamiętany czas zakończenia oraz bieżąca obserwacja pracy blokują wcześniejszy kolejny start. Start w ostatnich 15 minutach jest zamrożony. Niepełne dane lub nieudane połączenie oznaczają zachowanie dotychczasowych godzin, a nie fikcyjną oszczędność. Po częściowym wykonaniu korzyść liczymy dla pozostałych cykli; wyświetlana wycena całego planu zachowuje zapamiętane szacunki wcześniejszych cykli, więc nie jest rachunkiem za faktycznie zużytą energię.

Karta pokazuje ostatnią kontrolę i zmianę, np. „12:15 → 11:15 · taniej o 0,18 zł”. Podgląd wykonania jest też w aplikacji, w Planowaniu zużycia. Przeliczenie nie gwarantuje globalnie najlepszego spośród wszystkich kombinacji — korzysta z dotychczasowego silnika planowania, bez AI.

### Auto

Kliknięcie **Auto** pobiera aktualne stany skonfigurowanych switchy. Dla każdego urządzenia ze stanem dokładnie `off` wybieramy jeden cykl, wyznaczamy wspólny pełny plan w zaznaczonym zakresie Dziś/Jutro i od razu go zatwierdzamy w trybie elastycznym. Urządzenia `on`, brakujące i `unavailable` nie są dodawane. Jeżeli żaden switch nie jest wyłączony albo nie ma pełnego planu, Auto nie uzbraja poleceń. Zachowujemy wybrane w aplikacji programy i terminy zakończenia. Jeśli istnieje aktywny plan, najpierw go anuluj.

**Auto obejmuje jedną partię**, najwyżej po jednym cyklu zmywarki i pralki. Co pół godziny sprawdza lepszą godzinę jej pozostałych uruchomień. Nie dopisuje bez końca kolejnych prań ani nie rozpoczyna nowej partii po ponownym wyłączeniu gniazdka. Po wysłaniu wszystkich poleceń Auto kończy pracę. Kolejne kliknięcie aktywnego Auto anuluje przyszłe uruchomienia tej partii; nigdy nie wyłącza już pracujących urządzeń. Dla kolejnej partii włącz Auto ponownie.

### Wykonanie poleceń i przerwy w działaniu

Integracja HA zapisuje uzbrojony plan lokalnie i ustawia zegar na konkretny czas UTC. Dla **każdego cyklu**, również kolejnego prania, wywołuje wyłącznie `switch.turn_on` z zapamiętanym `entity_id`. Polecenie jest wysyłane także wtedy, gdy switch już ma stan `on`. Nie wykonujemy `turn_off`, impulsu wyłącz/włącz ani innych usług. Urządzenie musi być przygotowane do startu po podaniu zasilania — samo włączenie już włączonego gniazdka nie daje ponownego impulsu i nie gwarantuje rozpoczęcia programu.

Normalny restart HA odtwarza przyszłe polecenia. Niedostępna aplikacja PV Lab nie zatrzymuje lokalnego wykonania już zapisanego planu, ale uniemożliwia znalezienie lepszych terminów. Jeśli HA nie działał o godzinie startu, dopuszczamy najwyżej 2 minuty opóźnienia; później oznaczamy polecenie jako pominięte. Brak lub niedostępność switcha oznacza błąd, nie wysłanie do innej encji. Anulowanie na karcie rozbraja lokalny plan także przy chwilowym braku połączenia z aplikacją; potwierdzenie anulowania zostanie przekazane po powrocie połączenia. Wyłączenie lub usunięcie integracji zatrzymuje jej zegary.

Przed wysłaniem zapisujemy zamiar wykonania. Normalny restart i powtarzane odczyty nie wysyłają drugi raz tej samej komendy. Nie można zagwarantować jednocześnie dostarczenia i dokładnie jednego wykonania przy awarii między zapisem a wywołaniem usługi: taki przerwany lub niepewny przypadek oznaczamy „niepewny” i **nie ponawiamy automatycznie**. „Wysłano polecenie” potwierdza wywołanie usługi HA, nie pracę programu ani sprzętowe potwierdzenie gniazdka. Faktyczną pracę oceniają istniejące czujniki mocy.

### Dane i retencja wykonania

`/data/dashboard-plan.json` przechowuje bieżący plan, tryb, zamrożone profile, pierwotny zakres, statusy cykli i do 20 ostatnich zmian. Dzienniki `/data/execution-RRRR-MM-DD.jsonl` zachowują zdarzenia zatwierdzeń, kontroli, zmian i potwierdzeń; nie podlegają automatycznemu usuwaniu i można je pobrać w Plikach i retencji. Eksport JSON/GZIP obejmuje też te zdarzenia. To małe podsumowania, bez surowych odczytów encji i kluczy.

W HA `.storage/pv_lab_execution_<entry_id>` jest osobnym trwałym rejestrem zegara i do 200 ostatnich tożsamości poleceń, z kolejką potwierdzeń. Ta część należy do kopii Home Assistant, a nie eksportu samej aplikacji. Publiczny odczyt integracji nie przesyła pełnych profili wykonania. Nowe funkcje nie zmieniają prognozy PV, cen, historii produkcji ani ustawień AI.
