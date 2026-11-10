# PV Lab 0.1.0

Lokalna aplikacja Home Assistant OS do obserwacji instalacji PV i deterministycznej kalibracji prognoz. Interfejs po polsku, dostęp przez Home Assistant Ingress i boczne menu. Bez AI, dodatkowej bazy danych, MQTT ani integracji wystawiającej encje.

## Instalacja w Home Assistant OS

### Przez GitHub

1. Rozpakuj paczkę. Utwórz repozytorium na swoim GitHubie i prześlij **zawartość katalogu `pv-lab`**: `repository.yaml` i katalog `pv_lab` muszą być w głównym katalogu repozytorium.
2. W HA otwórz **Ustawienia → Aplikacje → sklep aplikacji → menu ⋮ → Repozytoria**. Dodaj adres swojego repozytorium GitHub. W starszej wersji HA aplikacje są nazywane dodatkami.
3. Odśwież sklep, wybierz **PV Lab** i naciśnij **Zainstaluj**. Obraz jest budowany lokalnie na urządzeniu; pierwszy start instalacji wymaga Internetu do pobrania obrazu Node.
4. Uruchom aplikację, włącz **Pokaż w panelu bocznym** oraz opcjonalnie **Uruchamiaj przy starcie**.
5. Otwórz interfejs. Aplikacja uzyska dostęp do API HA przez Supervisor automatycznie. Nie wpisujesz tokena, hasła ani kluczy dostawców.

Nie opublikowano tej paczki na GitHubie i nie zainstalowano jej na Twoim HA w ramach przygotowania plików.

### Lokalnie, bez GitHuba

Skopiuj katalog `pv_lab` do `/addons/pv_lab` na urządzeniu HA, np. przez udostępnienie Samba z dostępem do katalogu dodatków. Odśwież sklep aplikacji. PV Lab powinien pojawić się w sekcji lokalnej. Zainstaluj i uruchom jak wyżej. Samo skopiowanie do `/config` nie instaluje aplikacji.

## Pierwsze uruchomienie

- W **Ustawieniach** sprawdź automatycznie odczytane współrzędne HA. Jeżeli nie są jeszcze dostępne, poczekaj na udany odczyt lub wpisz je ręcznie. Nie wpisano zmyślonej lokalizacji.
- W **Źródłach danych** sprawdź odczyt każdego dostawcy i przypisania encji. Sam stan liczbowy dziennej prognozy nie wystarczy: potrzebny jest przebieg czasowy.
- Sprawdź, czy **Open-Meteo obejmuje obie połacie i 7,38 kWp**. Z listy encji nie można było potwierdzić jego konfiguracji fizycznej. Domyślnie jego przebieg traktowany jest jako prognoza całej instalacji; w pełnej konfiguracji można zmienić grupy lub wyłączyć dostawcę.
- Daj aplikacji pracować. Pierwsze porównania pojawiają się po pełnych przedziałach 15 min z ciągłym pomiarem i wcześniej zapisaną prognozą. Stabilne korekty, a szczególnie sezonowość, wymagają wielu obserwacji.
- Przycisk demonstracji pokazuje wyłącznie **sztuczne dane**. Nie są one zapisywane i nie wpływają na rzeczywistą kalibrację. Wyjdź z demonstracji, aby oceniać swoją instalację.

Zmiana ustawień rozpoczyna nową kalibrację. Wykonaj wcześniej eksport, jeżeli chcesz zachować dotychczasowy model. Stara historia pomiarów i prognoz pozostaje do końca retencji, ale prognozy sprzed zmiany nie zasilają nowego wyniku.

## Ustawienia startowe

| Parametr | Wartość |
| --- | --- |
| Falownik | Huawei SUN2000-5KTL-M1, limit AC **5500 W** |
| PV1 | 11 × 410 Wp = 4510 Wp; nachylenie 30°; azymut **220° od północy** |
| PV2 | 7 × 410 Wp = 2870 Wp; nachylenie 30°; azymut **130° od północy** |
| Łącznie | 7380 Wp; 18 optymalizatorów |
| Magazyn / ograniczenie eksportu | Brak według przekazanych informacji |
| Próg analizy napięcia | 253 V, zmienny w interfejsie; to nie nastawa zabezpieczeń |
| Odczyt pomiarów / prognoz | Co 60 s / co 15 min |
| Retencja szczegółowych pomiarów / prognoz | 30 / 14 dni |

Przeliczenie konwencji azymutu: 40° przy południu 0° = 220° od północy; −50° = 130° od północy.

Parametry lokalne opisują instalację i mapowanie paneli. **Nie zmieniają automatycznie konfiguracji integracji dostawców w HA.** Jeżeli zmienisz moc, orientację lub nachylenie, uaktualnij również prognozy źródłowe u dostawców. Ta wersja koryguje ich prognozy; nie generuje własnej prognozy promieniowania z danych pogodowych.

Przypisanie Forecast.Solar: encje bez `_2` → PV1, z `_2` → PV2. Open-Meteo: encje z `_3` i `energy_production_d2`–`d7`. Solcast: encje `solcast_pv_forecast_prognoza_*`. Własne pomocniki dokładności, zapamiętane prognozy i agregaty `optimizer_pv*` nie są używane.

Źródła pomiarowe: `sensor.inverter_active_power`, `sensor.inverter_daily_yield`, `sensor.inverter_total_yield`, wejściowa moc DC, napięcia trzech faz, status i alarmy. Moce stringów są szacowane jako U × I; nie należy utożsamiać ich bezpośrednio z mocą AC. Do kalibracji energii używana jest całka z mocy AC w poprawnie pokrytych przedziałach; licznik dzienny służy do sumy dnia.

PV2-01 (1.2.7): dawny optymalizator `ns2299002886`, obecny `ns2329141515`; wymiana około IX–X 2023. Metadane wymiany są zachowane, ale ta wersja **nie scala automatycznie** historii liczników obu urządzeń.

## Algorytm i interpretacja

1. Odczyt trzech istniejących integracji, bez dodatkowych wywołań chmurowych API. Prognoza Forecast.Solar jest pobierana odczytową akcją HA `forecast_solar.get_forecast`. Jeśli zainstalowana wersja jej nie oferuje i nie ma atrybutu przebiegu, panel pokaże diagnostykę zamiast wymyślać krzywą z sumy dnia.
2. Adaptery: Open-Meteo `wh_period_15m` lub godzinowe `wh_period` (Wh); Solcast `detailedForecast` (30 min) lub `detailedHourly` (60 min), `period_start` i `pv_estimate` (średnia kW). Nieobsługiwany format wymaga dostosowania adaptera po sprawdzeniu rzeczywistych atrybutów; załączone spisy zawierały tylko ich nazwy.
3. Energia jest rozdzielana na kwadranse z zachowaniem sumy. Rozbicie godziny na kwadranse nie zwiększa dokładności informacji pogodowej. Prognozy stringów sumujemy tylko dla wspólnych okresów wszystkich skonfigurowanych stringów.
4. Limit 5500 W nakładany jest na sumę całej instalacji: maksymalnie 1375 Wh na kwadrans. Wykresy nie odtwarzają krótkich szczytów wewnątrz kwadransa, więc clipping jest przybliżony.
5. Zapisujemy prognozę wraz z momentem jej odczytu przez aplikację. Nie udajemy, że jest to dokładna godzina wydania modelu pogodowego. Przy ocenie wybierana jest najnowsza zapisana przed początkiem okresu prognoza dla każdego horyzontu: 0–6 h, 6–24 h, 1–3 dni, 3+ dni. Przyszła aktualizacja nie poprawia wstecz oceny starej prognozy.
6. Kalibracja tworzy tabele dla dostawcy, horyzontu, kwartału roku, azymutu Słońca (koszyki 20°) i wysokości (10°). Pozycja Słońca jest przybliżona astronomicznie. Przy braku lokalizacji stosujemy godzinę lokalną. Przy zbyt małej liczbie próbek lokalnego profilu stosowana jest wolniejsza korekta ogólna dostawcy/horyzontu. Mnożniki są regularyzowane i ograniczone do 0,25–1,75.
7. Źródła bez wystarczającej historii mają wagę 1. Później waga jest odwrotnością kwadratu znormalizowanego błędu z dodanym marginesem 0,15 i ograniczeniem 0,1–10. Wynik to średnia ważona dostępnych źródeł.
8. Pomiar ostatnich 15 min może korygować najbliższą prognozę; mnożnik 0,3–1,5 wygasa wykładniczo ze stałą czasową 1 h. Nie jest to prognoza ruchu chmur.

Do aktualizacji nie trafiają okresy z brakami i przerwami w danych, nieprawidłowym statusem, wysokim napięciem ani mocą bliską limitowi falownika. Nie interpolujemy bezkrytycznie długich przerw. Noc i prognozy poniżej 20 Wh nie służą do oceny dostawców.

Profil optymalizatorów pokazuje średnią relację mocy panelu do mediany tej samej połaci przy podobnym położeniu Słońca i sezonie. Nie odróżnia niezawodnie cienia, zabrudzenia, uszkodzenia i niejednakowej mocy paneli. Profil służy diagnostyce; nie jest drugim mnożnikiem prognozy, aby nie naliczać tych samych strat ponownie. W przypadku zacienienia całej połaci względne porównanie jej paneli może nie wykazać różnic — pozostaje korekta prognozy całej instalacji.

Statystyki błędu po korekcie oceniają korektę przed aktualizacją na danej obserwacji; nie są pełnym testem całego końcowego ensemble i nowcastingu. Poprawa dokładności nie jest gwarantowana. Dla nowego sezonu lub horyzontu trzeba zgromadzić odpowiednią historię.

## Napięcia sieciowe

Wysokie napięcie to sygnał do wyłączenia próbek z kalibracji i analizy wspólnie z mocą/statusami. Nie przypisujemy każdemu przestojowi pewnej przyczyny. Odczyt alarmów i napięć nie zmienia parametrów pracy falownika.

Bez prognozy napięcia sieci nie można wiarygodnie przewidzieć przyszłych wyłączeń. Wynik tej wersji jest prognozą produkcji przy dostępnej sieci, po ograniczeniu mocy falownika. Nie odejmujemy z przyszłej produkcji arbitralnego „współczynnika wysokiego napięcia”.

## Pliki zamiast bazy

W kontenerze wszystko zapisywane jest w trwałym `/data` aplikacji:

- `settings.json`: ustawienia; `settings-backup.json`: poprzednie ustawienia;
- `model.json`: skumulowane współczynniki, profile i statystyki, zachowywane także po usunięciu starych szczegółowych próbek;
- `sample-RRRR-MM-DD.jsonl`: wybrane pomiary co minutę;
- `forecast-RRRR-MM-DD.jsonl`: kolejne odczyty przebiegów prognoz.

Pliki modelu i konfiguracji zapisywane są przez plik tymczasowy i podmianę. Uszkodzony model nie jest automatycznie nadpisywany pustym. Eksport JSON zawiera konfigurację, model i zachowaną historię, w tym współrzędne i identyfikatory urządzeń, ale nie token środowiskowy HA. Traktuj eksport jako prywatne dane instalacji. Nie ma w tej wersji przycisku przywracania eksportu.

Retencja jest wykonywana raz na godzinę i dotyczy pełnych plików dobowych, więc faktyczny zakres może być dłuższy maksymalnie o około dobę. Rozmiar zależy od liczby paneli i szczegółowości prognoz; aplikacja pokazuje użycie dysku. Uwzględnij dane aplikacji w kopii zapasowej HA.

Opcjonalny import ostatnich 7 dni korzysta z **API historii HA**, bez bezpośredniego czytania i bez modyfikowania jego bazy. Zakres zależy od retencji Recorder. Importowane historyczne stany nie potwierdzają świeżości urządzeń, dlatego służą tylko do oglądania przebiegów; nie wpływają na model ani bieżące wskazania produkcji. Uczenie bazuje na odczytach wykonywanych od uruchomienia aplikacji. Dawne prognozy nie mogą zostać odtworzone z samej historii produkcji.

## Podgląd na komputerze

Wymagany Node.js 22 lub nowszy. Uruchom `Start-local.cmd` w głównym katalogu paczki albo:

```text
cd pv_lab
node src/server.mjs
```

Otwórz http://127.0.0.1:8099, a dla sztucznych danych http://127.0.0.1:8099/?demo=1. Domyślnie brak połączenia z HA jest wyraźnie oznaczony. Lokalny serwer nasłuchuje tylko na własnym komputerze. Możliwe jest podłączenie przez zmienne środowiskowe `HA_URL` i `HA_TOKEN`; nie zapisuj tokena w repozytorium. Instalacja w HA OS nie wymaga tych zmiennych.

## Weryfikacja i zakres wersji

Testy: z katalogu `pv_lab` wykonaj `node --test test/*.test.mjs`. Obejmują m.in. limit AC, zachowanie energii, brakujące stringi, jednostki, przerwy, napięcia, brak wglądu w przyszłość przy kalibracji, zmianę czasu i zapis plików. Dodatkowo istnieje test HTTP z symulowanym HA (`test/http.test.mjs`).

Lokalnie sprawdzono API i interfejs WWW. Budowa kontenera i praca w rzeczywistym Supervisorze oraz formaty prognoz Twoich wersji integracji wymagają próby po instalacji. Nie dodano integracji HA, encji, zapisu do Energii ani sterowania urządzeniami — zgodnie z zakresem tego etapu.

Dokumentacja źródłowa: [Ingress](https://contributors.home-assistant.io/apps/guides/ingress/), [konfiguracja aplikacji](https://contributors.home-assistant.io/apps/reference/configuration/), [repozytoria](https://contributors.home-assistant.io/apps/guides/repository/), [akcja Forecast.Solar](https://www.home-assistant.io/actions/forecast_solar.get_forecast/).
