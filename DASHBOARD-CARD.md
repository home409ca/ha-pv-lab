# Zaplanuj uruchomienie — PV Lab 0.8.11

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnięcia Pralka lub Zmywarka wybierają kolejno 0 → 1 → 2 → 3 → 0. Aktywne urządzenie jest zielone; obok jest mała liczba bez plakietki. Zaznacz Dziś, Jutro lub oba. Zaplanuj pokazuje te same pierwsze trzy propozycje co PV Lab przy tym samym wyborze i danych. W aplikacji są dalsze alternatywy. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. W nagłówku planu są kwota, ?, Zatwierdź. Nazwa cyklu i godziny są w jednym wierszu. Przycisk ? otwiera energię, zapas PV i warianty pogodowe. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź publikuje terminy w encjach, Anuluj wycofuje zatwierdzenie. Gniazdka nie są sterowane. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.11-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

Na karcie pod ceną znajduje się cienki pasek udziałów energii: zielony PV i bilans, pomarańczowy Do dokupienia. Procent zakupu = dodatkowa energia do dokupienia po bilansowaniu / suma energii cykli, ograniczony do 0–100%; zielony jest dopełnieniem. To udział po rozliczeniu okresów, a nie fizyczny pobór w każdej minucie. Baza domu i trwające cykle są już uwzględnione przed nowymi cyklami. Przy brakującej energii lub niepoprawnym wyniku pasek jest pomijany, nie pokazuje fikcyjnego 100% PV. Gdy miniona część bieżącego okresu miała saldo importu, dodatkowy zakup może być większy niż energia cykli; udział jest wtedy ograniczony do 100%, a wyliczony koszt nie jest obcinany. Procenty zaokrąglamy do pełnych liczb.
