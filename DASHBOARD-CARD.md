# Zaplanuj uruchomienie — PV Lab 0.8.10

Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie albo użyj:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

Naciśnij Pralka lub Zmywarka tyle razy, ile potrzebujesz cykli (do 3). Wyzeruj usuwa wybór danego sprzętu. Zaznacz Dziś, Jutro lub oba. Zaplanuj zwraca do trzech znalezionych planów według szacowanego kosztu, z PV i bilansowaniem. Do 5 gr dopłaty względem najtańszego planu wyżej jest większy zapas PV, a potem niższy koszt przy gorszej pogodzie. Widać kwotę i godziny każdego cyklu. Profile i terminy zakończenia zmienisz w pełnej aplikacji.

Zatwierdź publikuje terminy w encjach, Anuluj wycofuje zatwierdzenie. Gniazdka nie są sterowane. Pracujący sprzęt jest uwzględniony osobno i blokuje nakładanie cykli.

Jeśli zasób nie załaduje się automatycznie, dodaj w Zasobach dashboardu /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.10-dashboard jako Moduł JavaScript. Nie twórz drugiej integracji ani osobnego repozytorium.

Na karcie pod ceną znajduje się cienki pasek udziałów energii: zielony PV i bilans, pomarańczowy Do dokupienia. Procent zakupu = dodatkowa energia do dokupienia po bilansowaniu / suma energii cykli, ograniczony do 0–100%; zielony jest dopełnieniem. To udział po rozliczeniu okresów, a nie fizyczny pobór w każdej minucie. Baza domu i trwające cykle są już uwzględnione przed nowymi cyklami. Przy brakującej energii lub niepoprawnym wyniku pasek jest pomijany, nie pokazuje fikcyjnego 100% PV. Gdy miniona część bieżącego okresu miała saldo importu, dodatkowy zakup może być większy niż energia cykli; udział jest wtedy ograniczony do 100%, a wyliczony koszt nie jest obcinany. Procenty zaokrąglamy do pełnych liczb.
