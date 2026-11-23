# PV Lab 0.9.1 — karta, Auto i bieżące zużycie domu

Wgraj zawartość paczki z zachowaniem katalogów do głównego katalogu repozytorium. Paczka zawiera tylko różnice względem 0.9.0, bez usuwania plików i danych użytkownika.

1. Zaktualizuj aplikację PV Lab do 0.9.1 i uruchom ją ponownie.
2. Zaktualizuj integrację PV Lab w HACS do 0.9.1 i uruchom ponownie Home Assistant.
3. Odśwież dashboard, aby załadował nowy plik karty. Jeśli zasób był dodany ręcznie, zmień jego końcówkę na `?v=0.9.1`.
4. Dodatkowe porównania są domyślnie włączone. Opcjonalny wykres zatwierdzenia włącz w YAML karty: `show_plan_chart: true`.
5. Auto zaznaczy się od razu, ale dopiero po 10 minutach sprawdzi wyłączone switche i zatwierdzi plan. „Anuluj Auto” zatrzymuje oczekiwanie.

Ustawienia, profile i historia pozostają zachowane. Istniejące uzbrojone plany zachowują godziny i tryb; nowa zwłoka dotyczy kolejnego włączenia Auto. Pracę urządzeń weryfikujemy na podstawie mocy, a wykonanie polecenia nie jest potwierdzeniem startu programu.

Szczegóły i parametry: Dokumentacja w aplikacji oraz DASHBOARD-CARD.md.
