# PV Lab — poprawka importu statystyk, aplikacja 0.2.2

## Przyczyna

Aplikacja 0.2.0 odczytywała jednostkę z pola `unit_of_measurement`. Publiczna odpowiedź Recorder w obecnym HA udostępnia `statistics_unit_of_measurement` oraz osobno `display_unit_of_measurement`. Poprawne liczniki `total`/`total_increasing` w Wh/kWh mogły być odrzucane jeszcze przed pierwszym zapytaniem o historię (postęp 0/365).

## Poprawka

- Normalizacja obu formatów jednostki zapisu: nowego i starszego.
- Wspólna obsługa importu i wyszukiwarki liczników.
- Rozróżnienie jednostki statystyk od jednostki wyświetlanej; żądania historii nadal proszą HA o konwersję do kWh.
- Konkretny komunikat dla każdego pomijanego identyfikatora: brak ID w metadanych, brak `has_sum`, nieobsługiwana jednostka zapisu.
- Ostrzeżenie, jeśli metadane są poprawne, ale wybrany zakres nie zawiera przyrostów godzinowych.

Nie zmieniaj atrybutów prawidłowych encji ani danych Recorder w celu obejścia tego błędu. Poprawka nie zmienia ustawień, modelu, retencji, identyfikatorów encji ani klucza parowania. Aplikacja ma wersję **0.2.2**, integracja HA pozostaje zgodna w wersji **0.2.1**.

## Instalacja

1. Rozpakuj paczkę poprawki i wgraj **jej zawartość do głównego katalogu istniejącego repozytorium**. Katalog `pv_lab` w paczce ma zastąpić obecny `pv_lab` — nie umieszczaj go w `custom_components` ani w drugim `pv_lab`.
2. W Home Assistant otwórz **sklep aplikacji/dodatków**, odśwież aktualizacje repozytoriów i zaktualizuj aplikację PV Lab do **0.2.2**. Dla lokalnej instalacji podmień `/addons/pv_lab` i przebuduj aplikację.
3. Po uruchomieniu odśwież stronę panelu. Na dole bocznego menu aplikacji powinno być **PV Lab 0.2.2**.
4. Sprawdź zapisane identyfikatory liczników i potwierdzenia w Ustawieniach. Ponów import w Historia i trendy.

To poprawka silnika aplikacji, **nie instalacji HACS**. Aktualizacja samej integracji przez HACS nie aktualizuje kontenera aplikacji. Nie trzeba usuwać aplikacji, wpisu integracji ani istniejącej historii.

Jeżeli import nadal się nie powiedzie, prześlij nowy komunikat — powinien wskazać konkretną encję i rzeczywisty powód. Przy „brak ID” sprawdź wyszukiwarkę statystyk aplikacji oraz Narzędzia deweloperskie → Statystyki w HA. Nie należy utożsamiać istniejącej historii stanów z dostępnością długoterminowych statystyk przyrostów.

## Weryfikacja

43 testy Node przeszły, w tym regresja obu formatów metadanych, rozróżnienie jednostki zapisu/wyświetlania i import przez HTTP/WebSocket z symulowanym HA zwracającym obecny format odpowiedzi. Sprawdzono składnię zmienionego skryptu panelu. Poprawka nie została automatycznie wgrana na GitHub ani zainstalowana na Twoim HA.

Źródło schematu API: [spłaszczanie metadanych statystyk w Home Assistant](https://github.com/home-assistant/core/blob/dev/homeassistant/components/recorder/statistics.py).
