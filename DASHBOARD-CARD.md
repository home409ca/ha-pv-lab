# Zaplanuj uruchomienie — PV Lab 0.8.16

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnięcia Pralka lub Zmywarka wybierają kolejno 0 → 1 → 2 → 3 → 0. Aktywne urządzenie jest zielone; obok jest mała liczba bez plakietki. Zaznacz Dziś, Jutro lub oba. Zaplanuj pokazuje do trzech znalezionych pełnych planów z udziałem PV lub bilansu. Nie dokłada propozycji w całości płatnych, jeśli są słoneczne. Jeśli nie znaleziono takiego planu, pokazuje jeden najtańszy znaleziony; przy tej samej cenie najwcześniejszy. Pełne porównanie kosztów i pozostałe alternatywy pozostają w aplikacji. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. W nagłówku planu są kwota, ?, Zatwierdź. Nazwa cyklu i godziny są w jednym wierszu. Przycisk ? otwiera energię, zapas PV i warianty pogodowe. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź publikuje terminy w encjach, Anuluj wycofuje zatwierdzenie. Gniazdka nie są sterowane. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.16-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

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
