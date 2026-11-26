# PV Lab 0.10.3 — naprawa uruchamiania

Zbiorcza aktualizacja tylko zmienionych plików względem 0.10.0. Zawiera również 0.10.1 i 0.10.2; przeznaczona także dla częściowo wgranego 0.10.2. Bez kasowania konfiguracji, historii ani zatwierdzonych planów.

1. Rozpakuj i wgraj zawartość do katalogu głównego repozytorium, zachowując podkatalogi.
2. Poczekaj na zielone Actions → Publish PV Lab version.
3. Odśwież repozytorium aplikacji/dodatków HA i zaktualizuj APLIKACJĘ PV Lab do 0.10.3. To jest konieczne także wtedy, gdy wcześniej widniało 0.10.2 — obraz mógł zawierać starsze pliki. Sam restart nie przebudowuje aplikacji.
4. Zaktualizuj integrację HACS do 0.10.3, uruchom ponownie HA i odśwież dashboard.

Nie odinstalowuj aplikacji, nie usuwaj danych i nie importuj historii od nowa. YAML karty bez zmian. Budowanie oraz publikacja sprawdzają teraz rzeczywiste eksporty modułów, bez wykonywania aplikacji i bez połączeń z HA.
