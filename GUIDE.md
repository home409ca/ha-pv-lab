Aktualna aplikacja: **0.2.3**. Zmiany i instrukcja: [UPDATE-0.2.3.md](UPDATE-0.2.3.md). Integracja HA: **0.2.1**.

# PV Lab 0.2 — instalacja i obsługa

Aktualna aplikacja: **0.2.2**, integracja HA: **0.2.1**. Błąd importu „0/365 dni” związany z jednostką w metadanych HA został poprawiony w aplikacji. Patrz [STATISTICS-FIX.md](STATISTICS-FIX.md).

Wersja zawiera aplikację HA OS z panelem WWW oraz osobną integrację HA udostępniającą encje. Obliczenia są lokalne i deterministyczne. Nie dodajemy bazy danych, MQTT ani wywołań chmurowego AI. Aplikacja nie steruje falownikiem ani odbiornikami.

## Aktualizacja aplikacji

1. Zrób eksport danych i kopię aplikacji w HA przed aktualizacją.
2. W swoim repozytorium GitHub podmień pliki **zawartością katalogu `pv-lab-v0.2`**. W głównym katalogu repozytorium muszą być `repository.yaml` oraz katalog `pv_lab`. Nowy katalog `custom_components` może leżeć obok nich, ale sam nie zainstaluje integracji w HA.
3. W sklepie aplikacji HA odśwież repozytoria. Otwórz PV Lab i zainstaluj aktualizację do **0.2.0**. Jeśli używasz instalacji lokalnej, podmień `/addons/pv_lab` i przebuduj aplikację.
4. Otwórz panel WWW. Przy starych zasobach odśwież stronę z pominięciem pamięci podręcznej.

Slug pozostaje `pv_lab`, więc przy aktualizacji tej samej aplikacji jej `/data` pozostaje. Nie odinstalowuj aplikacji, jeśli chcesz zachować dane. Nie przenoś przy tym instalacji lokalnej do instalacji z GitHuba bez osobnego planu migracji: inne prefiksy repozytorium oznaczają inne aplikacje i katalogi danych.

Model 0.1 jest archiwizowany jako `model-v0.1-backup.json`. Wersja 0.2 odbudowuje nowy model z zachowanych poprawnych pomiarów i prognoz zapisanych przed produkcją, w kolejności czasu. Nie przejmuje bezpośrednio starych współczynników, ponieważ poprawiono kolejność korekt i limitu oraz ocenę wspólnych próbek. Walidacja końcowych wariantów zaczyna się od nowych zapisów 0.2. Stare pomiary i prognozy pozostają do końca retencji. Archiwum modelu nie jest automatycznie przywracane przy powrocie do starszej aplikacji.

Instalacja od zera: dodaj adres swojego repozytorium w sklepie aplikacji HA, wybierz PV Lab, zainstaluj i uruchom. Włącz „Pokaż w panelu bocznym”. Aplikacja korzysta z tokena Supervisora automatycznie, bez wpisywania hasła lub kluczy dostawców.

## Instalacja integracji z encjami

Integrację można teraz zainstalować przez HACS, dodając repozytorium jako **Integration** i pobierając aktualną gałąź lub wydanie z `hacs.json`. Patrz [instrukcja HACS](HACS-INSTALL.md). Poniższa metoda ręczna pozostaje alternatywą.

1. Skopiuj **wewnętrzny katalog** `custom_components/pv_lab` z paczki do `/config/custom_components/pv_lab` w Home Assistant. W tym miejscu mają być bezpośrednio `manifest.json`, `__init__.py`, `sensor.py` itd. Nie twórz dodatkowego `pv_lab/pv_lab`.
2. Uruchom ponownie Home Assistant Core.
3. W panelu aplikacji otwórz **Integracja HA**. Znajdziesz tam wykryty wewnętrzny adres serwera i klucz parowania. Jeśli wykrycie adresu się nie powiodło, ustal nazwę hosta aplikacji w HA; dla aplikacji lokalnej zwykle będzie to `http://local-pv-lab:8099`. Nie używaj adresu `/api/hassio_ingress/...`.
4. W HA otwórz **Ustawienia → Urządzenia i usługi → Dodaj integrację → PV Lab**. Wpisz adres i klucz.
5. Encje pojawią się na urządzeniu **PV Lab**. Integracja odczytuje jeden wspólny wynik co 60 s; nie pobiera prognoz od dostawców i nie duplikuje silnika.

Nie trzeba otwierać portu na routerze ani publikować serwera. Panel aplikacji pozostaje dostępny przez HA Ingress. Osobny endpoint integracji wymaga klucza, pozwala wyłącznie na GET i zwraca tylko prognozę. Klucz nie jest tokenem HA, nie pozwala sterować HA i nie jest dodawany do eksportu ani przeglądarki plików. Nie dodawaj go do GitHuba.

Integrację konfiguruje się przez formularz HA. Zmiana klucza/adresu wymaga obecnie usunięcia wpisu integracji i ponownego dodania; nie usuwa to danych aplikacji.

## Encje

| Wartość | Zakres / interpretacja |
| --- | --- |
| Prognoza dzisiaj | Licznik rzeczywistej produkcji od północy + prognoza od momentu przeliczenia |
| Pozostało dzisiaj | Tylko przyszła energia; spada wraz z upływem czasu |
| Pozostało w bieżącej godzinie | Od przeliczenia do końca godziny zegarowej |
| Prognoza jutro i za 2–7 dni | Suma pełnej przyszłej doby, jeśli jest pokrycie dostępnych godzin dziennych |
| Najlepsze dostępne 2 h / 3 h — energia | Największa suma kWh w ciągłych 8 / 12 kwadransach |
| Najlepsze dostępne 2 h / 3 h — początek | Timestamp startu; w atrybutach koniec, kWh, czas trwania i średnia moc |
| Ostatnia zmiana dziś / jutro | Moment ostatniej zmiany całodziennego wyniku o co najmniej 0,001 kWh po zaokrągleniu |
| Kierunek zmiany dziś / jutro | „wzrost”, „spadek” lub „pierwsza prognoza” |
| Zmiana prognozy dziś / jutro | Różnica kWh względem poprzedniego zapisanego wyniku tej samej daty |
| Ostatnie przeliczenie | Kiedy aplikacja obliczyła obecnie publikowany wynik |

Jest 49 definicji encji, z czego 25 jest domyślnie włączonych. Okna dni 2–7 można dodatkowo włączyć w rejestrze encji HA. Identyfikatory zależą od rejestru HA, nazwy urządzenia i ewentualnych istniejących wpisów; sprawdź je w szczegółach encji zamiast kopiować nazwę z przykładu.

Przy brakach encje prognozy stają się niedostępne, zamiast publikować zero. Prawidłowa prognoza 0 kWh pozostaje zerem. Po utracie aktualnego odczytu aplikacji na dłużej niż 5 min (lub czterokrotność interwału odczytu przy większym interwale) payload integracji jest oznaczony jako nieaktualny. Połączenie do samego serwera nadal może działać, ale sensory nie prezentują starego wyniku jako aktualnego.

Prognoza kWh **nie jest licznikiem wyprodukowanej energii**. Nie ma `state_class: total_increasing` i nie należy jej wybierać jako rzeczywistej produkcji PV. W panelu Energia wybierz prawdziwy licznik falownika, a PV Lab jako dodatkową **prognozę solarną**. Platforma `energy.py` udostępnia przebieg aktualnej krzywej prognozy zagregowany do pełnych godzin. Nie jest to historyczny zapis tego, co aplikacja przewidywała rano — do tego służą pliki opublikowanych prognoz i historia zmian.

## Planowanie pralki lub zmywarki

Otwórz **Prognozy**, wybierz dzień nad wykresem i sprawdź okna 2 h i 3 h. Początek wybierany jest co 15 min, wyłącznie od teraz. Okno nie przechodzi przez północ lokalną i nie przeskakuje brakujących kwadransów. Zmiana czasu nie skraca ani nie wydłuża jego rzeczywistego czasu trwania.

W HA sensor początku okna ma klasę timestamp, więc można użyć go jako czasu wyzwolenia własnej automatyzacji. Sprawdź również energię kWh oraz końcowy czas w atrybutach. To nie jest automatyczne sterowanie sprzętem. Okno opisuje **całą produkcję PV**, a nie nadwyżkę po zużyciu domu; nie gwarantuje pokrycia całego cyklu urządzenia. Przy częściowej prognozie dzień jest oznaczony jako niekompletny, a okno jest najlepsze tylko spośród dostępnych okresów.

## Jak liczymy i co widać w panelu

Parametry startowe: PV1 11 × 410 Wp, 30°, azymut 220° od północy; PV2 7 × 410 Wp, 30°, azymut 130° od północy; łącznie 7,38 kWp, 18 optymalizatorów. Limit falownika to 5500 W. Współrzędne są pobierane z HA lub wpisywane ręcznie. Historia wymiany PV2-01 z `ns2299002886` na `ns2329141515` pozostaje zachowana jako metadane.

Panel pokazuje teraz każdą warstwę:

1. **Oryginalna prognoza dostawcy.** Odczyt z istniejącej integracji HA. Forecast.Solar jest sumą PV1 i PV2; Open-Meteo i Solcast domyślnie opisują całą instalację. Sprawdź, czy Open-Meteo faktycznie obejmuje obie połacie. Parametry dostawców trzeba zmieniać w ich konfiguracji HA — edycja geometrii w PV Lab nie rekonfiguruje zewnętrznych integracji.
2. **Wspólne kwadranse.** Energia jest rozdzielana z zachowaniem sumy, bez udawania większej dokładności pogody. Dla stringów wymagamy wspólnego pokrycia, zamiast traktować brak jednego stringu jako 0.
3. **Kalibracja systematyczna.** Używamy dostawcy, horyzontu, sezonu i przybliżonego położenia Słońca. Przy braku obserwacji mnożnik wynosi 1. Przy zbyt małej liczbie obserwacji szczegółowego profilu używany jest ostrożniejszy współczynnik ogólny. Mnożniki pozostają ograniczone do 0,25–1,75 i regularyzowane. Rozwijany kwadrans pokazuje profil, mnożnik oraz liczbę obserwacji.
4. **Limit falownika.** Nakładany po korekcie: `min(energia oryginalna × mnożnik, 1375 Wh na kwadrans)`. Wersja 0.1 obcinała przed mnożeniem; mogło to nadmiernie obniżać okresy po ujemnej korekcie. Limit kwadransowy jest przybliżeniem — nie znamy wszystkich szczytów wewnątrz kwadransa.
5. **Łączenie źródeł.** Wagi wykorzystują błąd po kalibracji na wspólnych poprawnych przedziałach w tym samym paśmie horyzontu. Do zebrania minimum obserwacji wspólnych waga wynosi 1. Potem jest proporcjonalna do `1 / (WAPE + 0,15)²`, z ograniczeniem 0,1–10; WAPE w tym wzorze jest ułamkiem, nie liczbą procentów. Udział wagi jest normalizowany osobno dla każdego kwadransa.
6. **Bieżąca korekta pogody.** Produkcja z ostatnich 15 min może zmienić najbliższą prognozę. Mnożnik 0,3–1,5 wygasa wykładniczo ze stałą czasową 1 h. To nie jest model ruchu chmur. Po nim ponownie pilnujemy fizycznego limitu mocy.

W **Prognozach** są pełne sumy dostawców, sumy po limicie, po kalibracji, procent korekty, udział wag i rozwijane obliczenia kwadransów. Dzisiejsza suma dostawcy i dzisiejszy wynik aplikacji mają inną podstawę: pierwsza jest pełną prognozą, druga zawiera już zmierzoną produkcję.

W **Źródłach danych** ranking opiera się na tych samych porównywalnych kwadransach i pasmach horyzontu. Dodatkowa tabela wszystkich próbek dostawcy jest diagnostyczna i nie jest uczciwym samodzielnym rankingiem. Niższe WAPE, MAE i RMSE oznaczają mniejszy błąd. RMSE bardziej karze duże pomyłki. Nie stosujemy MAPE przy zerowej i bardzo małej produkcji.

Porównujemy też cztery rzeczywiście zapisane warianty: bazowe źródła, prostą kalibrację, profil oraz końcowy wynik. Ocena wybiera zapis znany przed początkiem produkcji i nie poprawia go po fakcie nowymi współczynnikami. Ta walidacja zaczyna się od wersji 0.2. Bardziej złożony wariant nie ma zagwarantowanej przewagi — wyniki mają to dopiero pokazać.

Prognoza jest przeliczana po odczycie pomiarów, domyślnie co 60 s. Źródła są odczytywane co 15 min, bez wymuszania odświeżenia chmurowych API. Rejestr zmian dotyczy całodziennej estymacji konkretnej daty. Pozostała energia malejąca wraz z czasem nie jest sama w sobie oznaczana jako pogorszenie całego dnia. W przeglądarce odczyt wyniku nie tworzy nowych zapisów zmian.

## Napięcia i retencja

Próg analizy wynosi domyślnie **253 V**. To nie jest nastawa zabezpieczeń. Okresy z wysokim napięciem, brakami, nieprawidłowym statusem, długimi przerwami lub mocą bliską limitowi nie zmieniają profilu kalibracji. Odczyt alarmów i korelacja napięcia z przestojem nie dają automatycznie pewnej diagnozy przyczyny.

Domyślna retencja **surowych napięć wynosi 0 h**: nowe pliki próbek nie zawierają trzech napięć, tylko `voltageFlag` i `voltageThreshold`. Oznaczenie wystarczy, aby wykluczyć próbkę z kalibracji. Przy aktualizacji starsze próbki są oczyszczane ze szczegółowych napięć. Bieżące napięcia są dostępne w krótkim buforze pamięci sesji, około 1–2 h; nie trzeba ich zachowywać na dysku, żeby obejrzeć obecny stan.

Można ustawić retencję 1–168 h. Przy dodatniej retencji oczyszczanie odbywa się co godzinę, więc granica czasu jest przybliżona o maksymalnie około godzinę. Kopie i eksporty wykonane wcześniej nie są zdalnie czyszczone. Historia napięć w HA pozostaje nietknięta.

Nowe instalacje zachowują pozostałe szczegółowe próbki przez 7 dni, przebiegi prognoz przez 14, a historię zmian przez 90 dni. Istniejąca własna retencja próbek jest zachowywana przy aktualizacji; można ją zmienić. Retencja dzienników usuwa pełne pliki dobowe, więc próbki mogą istnieć do około doby dłużej. Same współczynniki i statystyki modelu nie znikają po usunięciu starych surowych danych.

W **Pliki i retencja** obejrzysz listę plików i podgląd pierwszych 32 kB:

| Plik w `/data` aplikacji | Co zawiera |
| --- | --- |
| `settings.json` i `settings-backup.json` | Obecnie i poprzednie ustawienia |
| `model.json` | Skumulowane korekty, porównania, profile i watermarki |
| `sample-RRRR-MM-DD.jsonl` | Wybrane pomiary i oznaczenia jakości, napięcia tylko według retencji |
| `forecast-RRRR-MM-DD.jsonl` | Kolejne odczyty przebiegów dostawców |
| `published-RRRR-MM-DD.jsonl` | Warianty prognozy zapisane przed zdarzeniem do uczciwej walidacji |
| `revisions.json`, `revision-RRRR-MM-DD.jsonl` | Ostatni stan i historia zmian wyników dla dat |
| `statistics.json` | Ostatni raport trendów z HA, bez surowej historii napięć |
| `integration-key.json` | Klucz parowania; celowo niewidoczny w przeglądarce plików i eksporcie |

Nie jest to katalog `/config` ani bezpośredni plik bazy HA. Dane JSON/JSONL są zwykłymi plikami, a nie nową bazą. Ustawienia i checkpoint modelu zapisywane są przez plik tymczasowy i podmianę. Przerwany ostatni wiersz dziennika jest oddzielany przy odzyskiwaniu; plik z uszkodzeniem w środku nie jest bezkrytycznie nadpisywany. Eksport zawiera prywatne dane instalacji, w tym lokalizację i identyfikatory urządzeń, ale nie klucz integracji ani token HA. Nie publikuj eksportu na GitHubie. Nie ma jeszcze formularza przywracania całego eksportu.

Zmiana samej retencji, opisów lub kanałów statystyk nie zeruje kalibracji. Zmiana fizycznych parametrów, wejść modelu, aktywnych dostawców lub progu jakości rozpoczyna nową kalibrację.

## Statystyki historyczne z HA

W **Ustawieniach** wyszukaj dostępne liczniki energii, wybierz identyfikatory statystyk, zaznacz potwierdzenie i zapisz. Domyślnie potwierdzony jest tylko `sensor.inverter_total_yield`. Podane w załączonym podsumowaniu `sensor.energia_czynna_pv1` i `sensor.energia_czynna_pv2` są jedynie propozycjami, domyślnie nieaktywnymi. Sprawdź ich poprawność oraz to, czy opisują DC czy AC. Nie utożsamiamy sum energii optymalizatorów z produkcją AC.

Następnie w **Historia i trendy** wybierz 1–730 dni i uruchom import. Używamy WebSocket API `recorder/statistics_during_period`, okres godzinowy, `types: [change]`, jednostka energii kWh. Zapytania idą partiami po 30 dni; nie wykonujemy SQL i nie czytamy bezpośrednio bazy. Źródło musi mieć statystyki przyrostów energii Wh/kWh. Brak statystyk daje komunikat, a nie zastępcze zera.

Sumujemy **przyrosty**, nie wartości licznika. HA przelicza resety swoich obsługiwanych liczników. Nie wykorzystujemy automatycznie maksimum dobowego, które może być błędne po dodatkowym resecie lub przy niepełnym dniu. Niepoprawne, ujemne lub wyraźnie niefizyczne przyrosty są pomijane. Średnie miesięczne liczymy z kompletnych dni, uwzględniając doby 23- i 25-godzinne. W raporcie zachowujemy osobno dni niekompletne.

Powstają miesięczne sumy i średnie dobowe oraz profile godzin kalendarzowych miesięcy (przy zakresie wieloletnim wspólnie dla danego miesiąca). Ponowny import zastępuje raport wybranym zakresem, zamiast wielokrotnie dopisywać te same obserwacje. Rozkład historyczny służy analizie sezonowości i pracy stringów. **Nie jest mnożnikiem prognozy pogody**: niższa produkcja zimą jest już uwzględniana przez dostawców, a jej ponowne odjęcie byłoby podwójną korektą.

Bez dawnych wersji prognoz, zapisanych przed produkcją, nie można uczciwie ocenić dawnego dostawcy ani odtworzyć prognozy „na jutro o 18:00”. Z samych godzinowych sum energii nie odzyskamy też informacji o napięciu, chmurach i przestojach. Dlatego te raporty nie są automatycznie używane do uczenia cienia czy błędu dostawcy. Dotychczasowy import szczegółowej historii 1–7 dni pozostaje w API do inspekcji, ale główny interfejs promuje import statystyk zamiast kopiowania tysięcy stanów.

## Ograniczenia i weryfikacja

- Pełny silnik nadal koryguje prognozy całej instalacji. Nie dzielimy sztucznie całkowitego Solcast/Open-Meteo na PV1/PV2 stałą proporcją mocy. Profilowanie per-string wymaga potwierdzonych, porównywalnych danych i prognoz per-string.
- Nierówne azymuty powodują naturalne różnice poranne i popołudniowe. Diagnostyka paneli porównuje panele tej samej połaci i nie dowodzi automatycznie zacienienia. Nie dokładamy drugiego mnożnika „cienia” na już skalibrowaną prognozę.
- Nie prognozujemy napięcia sieci ani przyszłych wyłączeń. Wynik zakłada dostępną sieć, z ograniczeniem 5500 W. Nie jest gwarancją produkcji po wszystkich przyszłych awariach.
- Zmiany długości dnia, temperatury modułów, zachmurzenia i zacienienia nie są jednoznacznie rozdzielane bez odpowiednich pomiarów. Temperatura wewnętrzna falownika nie jest temperaturą modułów.
- Odczyt źródeł zależy od wersji integracji. Forecast.Solar wymaga odczytowej akcji `forecast_solar.get_forecast` albo atrybutu przebiegu. Open-Meteo używa `wh_period_15m` / `wh_period`; Solcast `detailedForecast` / `detailedHourly`. Same sumy dobowe nie wystarczą do okien 2/3 h.
- Tryb demonstracyjny ma wyłącznie sztuczne dane. Nie zapisuje ich do rzeczywistych modeli, zmian ani statystyk i nie publikuje ich przez endpoint integracji.

Testy Node z katalogu `pv_lab`: `node --test test/*.test.mjs`. Test kontraktu integracji: `python tests/test_contract.py` z głównego katalogu repozytorium. Testujemy obliczenia, limity, okna i luki, dobę zmiany czasu, rewizje, retencję, brak podglądu przyszłości, HTTP, uwierzytelnienie endpointu oraz prawdziwy klient WebSocket z symulowanym HA. Kod Pythona jest również sprawdzany składniowo.

Nie uruchomiono w tej sesji samego Home Assistant ani kontenera Docker. Integracja wymaga próby na Twojej instalacji: dodanie wpisu, weryfikacja encji, dostępność statystyk i podgląd prognozy w Energii. Repozytorium nie zostało automatycznie zaktualizowane na GitHubie.

Ocena załączonego podsumowania znajduje się w [REVIEW.md](REVIEW.md).

Źródła techniczne: [proxy API HA dla aplikacji](https://contributors.home-assistant.io/apps/supervisor-api/core/), [API statystyk Recorder](https://github.com/home-assistant/core/blob/dev/homeassistant/components/recorder/websocket_api.py), [platforma prognozy Energii](https://github.com/home-assistant/core/blob/dev/homeassistant/components/forecast_solar/energy.py).
