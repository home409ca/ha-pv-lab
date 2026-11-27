# Pogoda PV Lab — wynik przeglądu i ograniczenia (27.11.2026)

## Stan wejściowy

PV Lab 0.11.0 ma pasywną krzywą ML, oceny PV, diagnostykę połaci, eksperymentalne warianty pogodowe i archiwum prognoz PV. Pogoda w tym laboratorium jest jednym źródłem pomagającym ocenić błąd produkcji, a nie rankingiem meteorologicznym. Import lat produkcji nie daje dawnych wydań prognoz pogody. Dostarczona diagnostyka wskazuje ML PV Forecast 0.9.9; publiczny HEAD sprawdzony w tym przeglądzie pozostaje 41459af1c897c52da7effab7446fcd4897c82013. Nie mieliśmy z tego środowiska bezpośredniego dostępu do działającego HA, więc rzeczywiste atrybuty i zakresy wszystkich czterech weather zostaną zinwentaryzowane po instalacji, nie są wymyślone w raporcie.

Znane nazwy usług z danych użytkownika: weather.openweathermap, weather.pirateweather, weather.dom i weather.dom_2. Same nazwy ostatnich dwóch nie potwierdzają backendu. Nowy moduł odczytuje rejestr encji i rzeczywiste odpowiedzi weather.get_forecasts. Potwierdzenie integracji nie jest potwierdzeniem niezależnego modelu meteorologicznego. OWM może udostępniać przebieg godzinowy albo trzygodzinny zależnie od konfiguracji; nie zakładamy trybu płatnego ani nie zmieniamy subskrypcji.

## Wykonane

Archiwum wersji prognoz i dostępności, normalizacja jednostek i czasu, osobne semantyki opadu/promieniowania, pomiary godzinowe, niezależne oceny parametru i wyprzedzenia na wspólnych godzinach. Cztery warianty prognozy, stabilne wagi i kontrola wspólnego pochodzenia modeli. Przedziały różnic błędów wyznaczane całymi dniami, brak automatycznej przewagi mieszanki. Encja weather.pv_lab oraz cztery diagnostyki HA. Osobny wybór dnia i parametru wykresu, porównanie temperatury domu z paczkomatem, pobieranie archiwum i aktualizacja instrukcji. Prognoza PV, ML i Auto nie zostały przełączone na nową pogodę.

## Czujniki

Temperatura przy domu jest przygruntowa i może nagrzewać się rano. Temperatura, wilgotność i ciśnienie paczkomatu są innym punktem, około 3 km dalej. Wszystkie zapisujemy jako niesprawdzone. Nie stwierdzamy, że są błędne; nie mamy jednak potwierdzenia osłony, wysokości, czasu fizycznego pomiaru i ewentualnej redukcji ciśnienia. Z tego powodu początkowo służą do opisowego porównania, nie do automatycznego uczenia korekt i ogłaszania zwycięzcy. Historyczna dostępność tych encji w Recorderze nie została potwierdzona. Obecne archiwum zacznie zbierać nowe odczyty; nie rekonstruuje dawnych prognoz z ich późniejszych aktualizacji.

## Publiczne stacje w okolicy Mielca

Zweryfikowano odpowiedź oficjalnego API IMGW, a nie tylko odległość na mapie:

| Stacja / kod | Wysokość | Dostępne w odczycie audytowym | Ocena przydatności |
| --- | --- | --- | --- |
| Mielec 250210210 | 170 m n.p.m. | Opad 10-minutowy; temperatura i wilgotność null | Blisko, ale nie jest obecnie źródłem temperatury z tego endpointu. |
| Chorzelów 250210180 | 170 m n.p.m. | Temperatura, wilgotność i opad 10-minutowy | Najbardziej obiecujący pobliski punkt regionalny z temperaturą; do porównania, nie zastąpienia lokalnego deszczu. |
| Zawada 250210240 | 200 m n.p.m. | Temperatura, wilgotność i opad 10-minutowy | Dalszy i wyższy punkt porównawczy; różnica otoczenia może mieć znaczenie. |
| Kolbuszowa 250210220 | 200 m n.p.m. | Temperatura, wilgotność i opad 10-minutowy | Dalszy punkt kontrolny, nie pierwszy wybór tylko dlatego, że ma komplet pól. |

Chorzelów wypada około kilkunastu kilometrów od instalacji według istniejącej lokalizacji; odległości nie zapisujemy jako publicznych współrzędnych domu. Dane API nie potwierdzają szczegółowego otoczenia, wysokości osłony i zmian stanowiska. Rok założenia stacji nie dowodzi ciągłości dostępnego archiwum. Oficjalne archiwa IMGW zawierają dane dobowe, miesięczne i terminowe; kompletność konkretnej stacji i parametru trzeba sprawdzić przed importem. Dla danych bieżącego meteo trzeba również potwierdzić strefę czasową znaczników i okno sumy opadu. Dlatego w tej paczce nie zaczęto automatycznie używać regionalnej stacji jako lokalnej prawdy ani jej skrobać ze strony internetowej.

Stacja badawcza Powietrze Mieleckie pokazuje parametry na stronie, ale sam podgląd nie potwierdza stabilnego API, znacznika czasu i znaczenia sumy opadu. Airly udostępnia m.in. temperaturę/wilgotność przez API, lecz wymaga dostępu i zachowania jego warunków. Czujnik na paczkomacie może być użyteczny; nie jest przez samą lokalizację wzorcem meteorologicznym. Dostarczone już encje HA wykorzystujemy bez zakładania nowego konta i bez dodatkowego klucza.

## Kiedy ocena i czego jeszcze nie dowiedziono

Pierwsze pomocnicze różnice: po zakończonych godzinach ze świeżym pomiarem i wcześniejszą prognozą. Warunek wiarygodnej decyzji: zweryfikowany pomiar, minimum 100 wspólnych godzin z 14 dni, odpowiednie wyprzedzenie i potwierdzenie różnic całymi dniami. Dla mieszanki potrzebna jest także rzeczywista poprawa co najmniej 2% na jej wcześniej wydanych prognozach. Zebranie treningu i późniejszych ocen może trwać dłużej niż dwa tygodnie. Bez wiarygodnego pomiaru nie ogłaszamy jakości zachmurzenia, opadu czy promieniowania.

Nie porównano jeszcze drugiego modelu PV uczonego na nowej pogodzie: integracja ML nie ma takiego wejścia, a standardowa encja weather nie zapewnia kompletu cech promieniowania. Kontrakt rozszerzenia i porównania A/B jest w ML-WEATHER-EXPERIMENT.md. To rzeczywiste ograniczenie, nie wynik negatywnego testu. Nie obiecujemy poprawy bez kolejnych pomiarów.

## Źródła sprawdzenia

- API i warunki danych IMGW: https://danepubliczne.imgw.pl/apiinfo
- Bieżąca telemetria stacji: https://danepubliczne.imgw.pl/api/data/meteo/
- Archiwa IMGW: https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_meteorologiczne/
- Met.no w HA: https://www.home-assistant.io/integrations/met/
- OWM w HA: https://www.home-assistant.io/integrations/openweathermap/
- Pirate Weather: https://docs.pirateweather.net/en/latest/
- API WeatherEntity HA: https://developers.home-assistant.io/docs/core/entity/weather/
- ML PV Forecast: https://github.com/dominikamann/ha-machine-learning-based-pv-forecast
- Powietrze Mieleckie: https://stacja.powietrzemieleckie.pl/warunki-meteo/
- Airly: https://airly.org/pl/rozwiazania/airly-api/
