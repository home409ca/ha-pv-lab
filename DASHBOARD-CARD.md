# Zaplanuj uruchomienie — PV Lab 0.8.15

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnięcia Pralka lub Zmywarka wybierają kolejno 0 → 1 → 2 → 3 → 0. Aktywne urządzenie jest zielone; obok jest mała liczba bez plakietki. Zaznacz Dziś, Jutro lub oba. Zaplanuj pokazuje do trzech znalezionych pełnych planów z udziałem PV lub bilansu. Nie dokłada propozycji w całości płatnych, jeśli są słoneczne. Jeśli nie znaleziono takiego planu, pokazuje jeden najtańszy znaleziony; przy tej samej cenie najwcześniejszy. Pełne porównanie kosztów i pozostałe alternatywy pozostają w aplikacji. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. W nagłówku planu są kwota, ?, Zatwierdź. Nazwa cyklu i godziny są w jednym wierszu. Przycisk ? otwiera energię, zapas PV i warianty pogodowe. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź publikuje terminy w encjach, Anuluj wycofuje zatwierdzenie. Gniazdka nie są sterowane. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.15-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

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
