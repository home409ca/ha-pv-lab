# Aktualizacja PV Lab 0.10.6 → 0.11.0

Paczka zawiera tylko zmienione lub nowe pliki, z zachowaną strukturą katalogów. Wgraj jej rozpakowaną zawartość do głównego katalogu tego samego repozytorium GitHub. Nie wgrywaj samego ZIP jako kodu. Nie usuwaj pozostałych plików ani katalogu danych.

1. Wgraj wszystkie pliki z paczki jednocześnie, zachowując pv_lab, custom_components i scripts oraz pliki w katalogu głównym.
2. Poczekaj na poprawne zakończenie workflow wydania w GitHub Actions.
3. Zaktualizuj aplikację PV Lab oraz integrację PV Lab w HACS do 0.11.0. Uruchom ponownie HA po aktualizacji integracji; odśwież przeglądarkę.
4. Otwórz Prognozy → Laboratorium prognozy — pięć etapów. Domyślnie odczytujemy sensor.pv_forecast_total_forecast_curve i sensor.pv_forecast_fotowoltaika_model_status.
5. Puste pole pogody korzysta z wybranej już encji śniegu, np. weather.dom. Krzywa pojawi się automatycznie po udostępnieniu jej przez model ML. Stan uczenia i brak krzywej są poprawnym stanem oczekiwania.

Nie trzeba ponawiać importu historii. Zachowane są ustawienia, profile, Auto i zapisane prognozy. Nowe modele pozostają obserwacyjne — 0% wpływu na wynik i sterowanie. Wszystkie pięć etapów ma obliczenia i ocenę, ale potrzebuje danych zbieranych od instalacji; ich poprawa nie jest z góry potwierdzona i nie uruchamia korekt automatycznie.

Pełny opis każdego etapu jest w instrukcji aplikacji, rozdział 27. Źródło ML nie zastępuje istniejącej prognozy ani nie zmienia jej wag. Paczka nie zawiera danych ani haseł użytkownika.
