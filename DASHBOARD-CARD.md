# Zaplanuj uruchomienie — karta PV Lab 0.8.8

1. Zaktualizuj aplikację PV Lab oraz integrację HACS do 0.8.8. Uruchom ponownie HA i odśwież dashboard/aplikację mobilną.
2. W edycji dashboardu dodaj kartę **Zaplanuj uruchomienie**. Jeżeli używasz konfiguracji ręcznej, wklej:

```yaml
type: custom:pv-lab-plan-card
title: Zaplanuj uruchomienie
```

3. Wybierz liczbę kolejnych prań i zmywań, daty i cel PV lub koszt. Naciśnij Pokaż 3 najlepsze propozycje. Profile i dodatkowe ograniczenia pochodzą z Planowania zużycia.
4. Każda propozycja pokazuje cały harmonogram, także oba osobne starty pralki. Zatwierdź wybrany wariant, jeśli chcesz opublikować jego terminy jako encje; Anuluj wycofuje zatwierdzenie.

Zatwierdzenie jeszcze nie włącza gniazdek. Flaga Plan urządzeń zatwierdzony i encje Zatwierdzony cykl 1…8 początek są przygotowane do późniejszych automatyzacji. Pierwsze trzy terminy są domyślnie włączone. Atrybuty wskazują urządzenie i plan_id; sprawdzenie stanu Pralka/Zmywarka pracuje pozostaje konieczne przed przyszłym sterowaniem.

Przy jednej integracji karta wybiera ją sama. Przy kilku wybierz instalację z listy. Zasób karty jest rejestrowany automatycznie. W razie korzystania z ręcznych zasobów: /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.8, typ JavaScript module.

Pełny opis stanów, terminów, bilansowania i przechowywania jest w Instrukcji PV Lab w aplikacji.
