# PV Lab 0.9.2

Aktualizacja zawiera tylko zmienione pliki względem 0.9.1. Wgraj je z zachowaniem struktury do głównego katalogu repozytorium. Nie usuwaj danych ani ustawień.

Zaktualizuj aplikację i integrację HACS do 0.9.2, uruchom ponownie aplikację i Home Assistant, a następnie odśwież dashboard. Jeśli zasób karty był dodany ręcznie, ustaw końcówkę `?v=0.9.2`.

Porównania „Start tania strefa” i „Start szczyt PV” są zawsze obecne po rozwinięciu listy; identyczny zwykły plan jest zastąpiony nazwanym wariantem. Zatwierdzenie pobiera świeży stan HA i sprawdza dostępność zgodnie z zasadami planera, bez cichej zmiany godzin.

Pełny YAML: CARD-EXAMPLE.yaml. Instrukcja w aplikacji opisuje wszystkie ustawienia i zachowanie zatwierdzania. Po aktualizacji ponownie przelicz niezatwierdzone propozycje. Już uzbrojone plany zachowują swoje terminy i tryb.

Warianty programu wybierzesz pod przyciskami urządzeń. W YAML: `show_program_variants: true` i `program_variants_position: below_devices` lub `details`. Auto zapamiętuje te warianty na początku odliczania.
