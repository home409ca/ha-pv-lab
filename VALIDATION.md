# Weryfikacja 0.2.0

- 36 testów Node: obliczenia i clipping, zachowanie energii, braki danych, ciągłe okna 2/3 h, rewizje i ich kierunek, wspólne próbki rankingów, chronologiczna ocena opublikowanych wariantów, statystyki energii i doby 23/25 h, flagi napięcia i retencja, zapis/odzyskiwanie plików, HTTP z symulowanym HA, klucz parowania i brak jego ujawnienia, prawdziwy klient WebSocket z serwerem testowym.
- 4 testy Pythona: 49 unikalnych definicji i 25 domyślnie aktywnych encji, rozróżnienie 0/braku, mapowanie okien i rewizji, kompletne godzinowe agregacje dla Energii bez dublowania kwadransów.
- Sprawdzenie składni wszystkich plików Pythona integracji.
- Ręczne sprawdzenie w przeglądarce: prognozy, okna, dostawcy, historia, retencja, przeglądarka plików, konfiguracja integracji i ustawienia liczników; bez błędów konsoli.

Nie przeprowadzono uruchomienia w rzeczywistym Home Assistant ani budowy Docker — te narzędzia/instancja nie są podłączone do tego testu. Trzeba potwierdzić rejestrację encji, endpoint wewnętrzny, platformę Energia oraz format danych/statystyki Twojej instalacji. Testy jednostkowe i symulowany HA nie dowodzą poprawy dokładności prognoz na przyszłej rzeczywistej produkcji.

Paczka nie zawiera danych wykonawczych, kluczy, buforów podglądu ani plików `__pycache__`. Repozytorium GitHub i instalacja HA nie zostały automatycznie zmodyfikowane.
