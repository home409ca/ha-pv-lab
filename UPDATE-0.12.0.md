# Aktualizacja PV Lab 0.11.0 → 0.12.0

Rozpakuj paczkę i wgraj jej zawartość do katalogu głównego tego samego repozytorium GitHub, zachowując podkatalogi. Nie usuwaj dawnych plików ani danych. Zwykła paczka pv-lab-update-0.12.0.zip zawiera tylko zmiany względem 0.11.0. Jeśli masz nadal 0.10.6, użyj paczki pv-lab-update-0.10.6-do-0.12.0.zip: zawiera łącznie zmiany 0.11.0 i 0.12.0, bez konieczności instalacji pośredniej. Wybierz jedną odpowiednią paczkę.

Po poprawnym workflow wydania zaktualizuj aplikację i integrację HACS do 0.12.0. Uruchom ponownie HA i odśwież przeglądarkę.

Otwórz Prognozy → Pogoda — jakość i źródła. Pierwszy udany odczyt zacznie archiwizację weather.* automatycznie; później odczyt co 30 minut. Sprawdź wykryte integracje, zakresy i pola. Bez potwierdzonej jednostki oraz znaczenia przedziału opad/promieniowanie nie są oceniane jako godzinowe wartości.

W „Źródła pogody, pomiary i publikowanie w HA” zobaczysz czujnik temperatury przy domu oraz temperaturę, wilgotność i ciśnienie z paczkomatu. Są początkowo niesprawdzone. Nie zaznaczaj potwierdzenia jakości tylko po to, aby uruchomić ranking. Najpierw sprawdź jednostki, fizyczny czas odczytu, osłonę i montaż. Temperatury z dwóch miejsc są archiwizowane osobno. Brak sensora albo jednostki nie tworzy zerowego pomiaru.

Weather.pv_lab znajdziesz w urządzeniu integracji PV Lab. Możesz dodać zwykłą kartę weather-forecast z forecast_type: hourly. Początkowo źródłem zastępczym jest weather.dom; po jego braku kolejne dostępne źródło jest jawnie opisane. Nie podmieniamy automatycznie źródeł w Twoich automatach ani w modelu ML. Istniejąca prognoza PV i Auto pozostają niezależne.

Nowe mieszanki są oceniane, nie uznawane z góry za lepsze. Publikowanie mieszanki wymaga jej wybrania oraz potwierdzonej przewagi dla parametru i horyzontu. Przy braku danych pozostaje pojedyncze źródło. Pełna instrukcja: rozdział 28. Eksperyment z zewnętrznym modelem PV wymaga rozszerzenia jego interfejsu — zobacz ML-WEATHER-EXPERIMENT.md.
