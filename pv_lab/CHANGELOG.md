# 0.4.0

- Profile z historii mocy, wybór cykli i edytor przebiegu.
- Planowanie według faz pracy co 5 minut.
- Encje pralki i zmywarki oraz edytowalne progi.
- Automatyczne wydania HACS.

# 0.3.0

- Raporty godzinowe/dobowe/miesięczne/roczne, plan na jutro i ocena bieżąca.
- Ciągłe okna 1/2/3 h oraz stany po zakończeniu produkcji.
- Planowanie zapotrzebowania, rezerwa domu i trzy tryby bilansowania.
- Saldo bieżącej godziny z potwierdzonej encji użytkownika.
- Integracja HA z nowymi sensorami i wejściami number/select/datetime.

# 0.2.5

- Odczyt bieżącego stanu i czasu ostatniego zgłoszenia statusu przez API szablonów HA; usuwa fałszywe odrzucanie niezmiennego On-grid.
- Kontrola rzeczywistej świeżości, awarii i jakości pomiarów pozostaje aktywna.
- Bez resetowania kalibracji i zmiany integracji HACS.

# 0.2.4

- Osobne krzywe Forecast.Solar, Open-Meteo, Solcast i PV Lab ze wspólną osią czasu i mocy.
- Niezależne przełączniki serii, pomiar i opcjonalna prognoza połączona bez korekt.
- Wybór oryginalnych prognoz lub wartości po limicie; brakujące źródła oznaczone bez sztucznych zer.
- Zmiany dotyczą prezentacji; ustawienia, kalibracja i integracja pozostają bez zmian.

# 0.2.3

- Osobne przełączniki krzywych, widoczne identyczne przebiegi, oś całej doby.
- Tabela prognozy godzina po godzinie z dostawcami, korektą, pozostałą energią i lukami.
- Diagnostyka kalibracji, pokrycia pomiarami i wcześniejszych prognoz; edytowalne encje i statusy.
- Wybrany dzień napięć: odczyt Recorder HA na żądanie, bez zapisu w PV Lab.
- Instrukcja i diagnostyka podłączenia natywnej prognozy do panelu Energia.
- Bez zmiany schematu modelu i ustawień; integracja HACS nadal 0.2.1.

# 0.1.0

- Pierwsza aplikacja lokalna z polskim panelem WWW przez Ingress.
- Edytowalne parametry dwóch połaci, 18 optymalizatorów i limit 5500 W.
- Odczyt istniejących integracji Huawei Solar, Forecast.Solar, Open-Meteo Solar i Solcast.
- Zapisywanie prognoz i pomiarów w JSON/JSONL, kalibracja według dostawcy, horyzontu i sezonu.
- Analiza napięć, jakości pomiarów i względnej produkcji paneli.
- Oddzielny tryb demonstracyjny i import historii do inspekcji.
# 0.2.0

- Integracja HA z encjami prognoz, pozostałej energii, zmian i najlepszych okien 2/3 h; platforma prognozy dla Energii.
- Widoczne prognozy źródłowe, mnożniki, wagi, rozpisane kwadranse i historia rewizji.
- Ranking wspólnych okresów oraz walidacja zapisanych wariantów przed zdarzeniem, MAE/RMSE/WAPE.
- Poprawiona kolejność: korekta produkcji przed limitem 5500 W; nowy model z archiwizacją checkpointu 0.1.
- Napięcia domyślnie tylko w buforze pamięci, na dysku flagi jakości; edytowalna retencja i przeglądarka plików.
- Import statystyk energii HA partiami po 30 dni, raporty dobowe, miesięczne i godzinowe, z potwierdzaniem liczników.
- Retencja i kanały statystyk nie zerują kalibracji.

# 0.2.2

- Poprawiono rozpoznawanie jednostki w metadanych Recorder: `statistics_unit_of_measurement` w nowym HA i `unit_of_measurement` w starszym formacie.
- Ta sama normalizacja działa w imporcie i wyszukiwarce liczników.
- Dodano komunikaty per identyfikator: brak statystyki, brak sumy, nieobsługiwana jednostka oraz pusty zakres historii.
- Dodano regresję prawdziwego schematu publicznej odpowiedzi HA i pełnego przepływu HTTP/WebSocket z symulowaną historią.
- Wersja aplikacji jest publikowana spójnie w API i panelu. Integracja HACS pozostaje w wersji 0.2.1, bez zmiany protokołu.

