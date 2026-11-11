# PV Lab 0.2.5 — świeżość statusu falownika

Status On-grid może pozostawać niezmienny wiele godzin, mimo że HA regularnie otrzymuje jego zgłoszenia. W zgłoszonym przypadku ostatnia zmiana była o 11:48 UTC, a rzeczywiste zgłoszenie o 14:21 UTC. Aplikacja odrzucała status po uznaniu czasu odczytanego z REST za nieaktualny.

Przy każdym odczycie aplikacja pobiera teraz dodatkowo bieżący stan i rzeczywisty czas ostatniego zgłoszenia skonfigurowanej encji statusu przez lokalne API szablonów Home Assistant. Odczytuje bezpośrednio właściwości State, zamiast opierać się wyłącznie na serializowanym rekordzie /states. Nie wymusza aktualizacji falownika ani nie zmienia jego ustawień. Nadal wymaga poprawnej encji i dozwolonego statusu, sprawdza wiek zgłoszenia, napięcia i kompletność pomiarów. Nie ustawia On-grid na sztywno.

## Aktualizacja

1. Wgraj zawartość `pv-lab-update-0.2.5.zip` do głównego katalogu istniejącego repozytorium, zastępując pliki.
2. Odśwież sklep aplikacji Home Assistant i zaktualizuj aplikację PV Lab do **0.2.5**.
3. Odśwież panel i sprawdź Stan kalibracji: przy aktualnym On-grid status powinien być widoczny zamiast „brak”.

Integracja HACS pozostaje 0.2.2 i nie wymaga zmiany. Dane, klucz parowania i dotychczasowa kalibracja pozostają zachowane. Pominięte wcześniej kwadranse nie są automatycznie uznawane za poprawne na podstawie obecnego stanu falownika. Pierwsze nowe porównania mogą pojawić się po pełnym poprawnym kwadransie z prognozą zapisaną przed jego rozpoczęciem, zwykle w ciągu 15–30 minut produkcji. Noc, prognoza poniżej 20 Wh lub inne wykluczenia nadal mogą opóźnić porównania.

## Weryfikacja

57 testów aplikacji zakończonych powodzeniem. Nowe testy obejmują stary serializowany czas przy świeżym rzeczywistym zgłoszeniu, rozpoczęcie kalibracji, rzeczywiście przeterminowany status, unavailable, awarię i błędną odpowiedź API. Sprawdzono odczyt przez uruchomioną aplikację i symulowany HA. Nie przeprowadzono testu na działającym HA użytkownika.
