# Rozszerzenie ML o pogodę PV Lab — kontrakt eksperymentu

Stan sprawdzony 27.11.2026: diagnostyka użytkownika wskazuje ML PV Forecast 0.9.9. Publiczny kod pod HEAD 41459af1c897c52da7effab7446fcd4897c82013 ma tę samą wersję. Nie jest to ponowny odczyt zainstalowanego HA po późniejszych aktualizacjach.

## Co integracja robi obecnie

core/weather.py pobiera bezpośrednio Open-Meteo: prognozę, historical-forecast, previous-runs i archive. Model używa szeregu cech meteorologicznych oraz modeli best_match, icon_seamless, meteofrance_seamless, ecmwf_ifs025 i gfs_seamless. Istnieją GHI, DNI, DHI, warstwowe zachmurzenie, temperatura, śnieg oraz dodatkowe cechy. Radiation jest wyrównywane z końca przedziału do początku. To inny kontrakt niż ogólna encja weather HA.

https://github.com/dominikamann/ha-machine-learning-based-pv-forecast/blob/41459af1c897c52da7effab7446fcd4897c82013/custom_components/ml_pv_forecast/core/weather.py

## Konkretna propozycja dla autora

1. Wprowadzić interfejs WeatherProvider z osobnymi metodami pobrania historycznych danych treningowych oraz prognozy. Dotychczasowy Open-Meteo pozostawić domyślnym, zgodnym źródłem. Adapter zewnętrzny powinien być opcjonalny.
2. Każdy zestaw musi podawać provider_id, source/model IDs, feature_schema_version, canonical units, interval_start/end, received_at i osobno issued_at albo null. Brak cechy nie może być zerem. Pola wymagane przez wybrany model są walidowane przed prognozowaniem.
3. Klucz modelu, cache i konfiguracji musi zawierać provider_id oraz feature_schema_version. Zmiana źródła tworzy nowy model i nowe uczenie, bez nadpisywania starego. W razie błędu wracamy do całego zgodnego starego modelu i źródła, a nie mieszamy nowych cech ze starymi wagami.
4. PV Lab może dostarczyć zarchiwizowaną pogodę i wyniki lokalnej korekty. Samo weather.pv_lab nie zapewnia GHI/DNI/DHI ani wszystkich warstw zachmurzenia. Przy brakach trzeba wybrać nowy, jawnie ograniczony zestaw cech i wytrenować go od początku. Nie udawać brakujących danych z produkcji PV. Nie wolno dopinać skorygowanej temperatury do wytrenowanego modelu i nazywać tego porównywalnym eksperymentem.
5. Testy adaptera: strefy i DST, jednostki, końce przedziałów promieniowania, brak wydania, brak wymaganej cechy, awaria źródła, zmiana schematu i brak odczytów z przyszłości. Źródła pogody używane w treningu i prognozie muszą mieć spójne znaczenie oraz dostępność historyczną.

## Jak przeprowadzić porównanie

Uruchomić dwa niezależne modele na tych samych pomiarach produkcji, podziale chronologicznym, godzinie zamrożenia i zasadach wykluczeń: A — obecny Open-Meteo, B — nowa pogoda/cechy. Nie dobierać wariantu na późniejszych danych ocenianych jako test. Przez wspólny okres archiwizować ich prognozy przed zdarzeniem. Porównać godzinowe i kompletne dobowe MAE, bias i asymetryczny błąd energetyczny oraz pokrycie P10/P90, osobno „na jutro” i krótkoterminowo. Nie sumować niepełnych dób jako pełnych wyników dobowych. Stosować jednakowe oznaczenia śniegu, zacienienia, limitu, awarii i sieci.

Obecnie wykonane: pasywny odczyt modelu A, jego archiwizacja w laboratorium PV, archiwum pogody i cztery porównania meteorologiczne oraz weather.pv_lab. Niewykonane z braku odpowiedniego wejścia w zewnętrznej integracji: model B, jego uczenie i test przewagi. Nie zgłaszamy poprawy PV bez tych danych. To propozycja zmiany do uzgodnienia z autorem; paczka nie zawiera nadpisanego forka ani nie zmienia zainstalowanej integracji ML.

Dokumentacja HA: https://developers.home-assistant.io/docs/core/entity/weather/
