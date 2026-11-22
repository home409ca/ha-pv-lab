# PV Lab 0.8.9 — naprawa uruchamiania

Pakiet naprawczy zawiera tylko pliki zmienione od 0.8.6. Uwzględnia również brakujący schedule-alternatives.mjs z 0.8.7, także gdy użyto przyrostowej paczki 0.8.8 bez wcześniejszej aktualizacji. Kontrola wydania sprawdza kompletność lokalnych importów.

1. Rozpakuj ZIP. Wgraj jego zawartość do głównego katalogu tego samego repozytorium GitHub, zachowując podkatalogi. Nie wgrywaj samej zawartości src do katalogu głównego.
2. W HA odśwież repozytoria aplikacji/dodatków, następnie zaktualizuj aplikację PV Lab do 0.8.9. Aktualizacja przebuduje obraz; sam restart nie uzupełni plików.
3. Uruchom aplikację i sprawdź log. ERR_MODULE_NOT_FOUND nie powinien już występować. Pozostający HTTP 502 (/states) wymaga osobnej diagnostyki po uruchomieniu.
4. Zaktualizuj też integrację HACS PV Lab do 0.8.9 i uruchom ponownie HA.

Nie usuwaj aplikacji, integracji ani danych. Historia, profile i ustawienia zostają zachowane. Nie trzeba ponownie importować historii.

Jeżeli karta dashboardu nie jest załadowana automatycznie, dodaj zasób /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.9-dashboard typu Moduł JavaScript. Konfiguracja karty pozostaje type: custom:pv-lab-plan-card.

Rejestracja pliku karty HA następuje przed pierwszym odczytem aplikacji. Niedostępna aplikacja nie blokuje już udostępnienia /pv_lab_frontend/pv-lab-plan-card.js. Planowanie wymaga jednak działającej i sparowanej aplikacji. Po aktualizacji HACS uruchom ponownie HA. Gdy adres pliku nadal zwraca 404, sprawdź obecność pliku /config/custom_components/pv_lab/www/pv-lab-plan-card.js i log uruchomienia integracji PV Lab. Sama instalacja HACS bez skonfigurowanej integracji PV Lab nie rejestruje pliku.
