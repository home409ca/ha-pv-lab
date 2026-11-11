# PV Lab — poprawka widoczności prognozy w Energii

Dotyczy integracji HA **0.2.2**. Aplikacja obliczeniowa pozostaje **0.2.3**. Te dwie części mają niezależne wersje.

## Przyczyna

W manifeście integracji brakowało `"integration_type": "service"`. Okno konfiguracji paneli słonecznych w HA odczytuje integracje prognoz z filtrem typu `service`. Sam plik `energy.py` nie wystarczał: bez właściwego typu integracja była pomijana przy budowaniu listy, nawet gdy jej encje działały.

Źródło: [kod okna konfiguracji Energii, `_fetchSolarForecastConfigEntries`](https://github.com/home-assistant/frontend/blob/dev/src/panels/config/energy/dialogs/dialog-energy-solar-settings.ts) oraz [manifest Forecast.Solar](https://github.com/home-assistant/core/blob/dev/homeassistant/components/forecast_solar/manifest.json).

## Aktualizacja przez GitHub i HACS

1. Rozpakuj `pv-lab-energy-fix-0.2.2.zip`. Wgraj **zawartość do głównego katalogu istniejącego repozytorium GitHub**, zastępując pliki. Nie twórz dodatkowego katalogu nadrzędnego. Paczka zawiera `hacs.json`, kompletny `custom_components/pv_lab` i tę instrukcję; nie zastępuje aplikacji `pv_lab`.
2. W HACS otwórz PV Lab, odśwież informacje repozytorium i pobierz ponownie najnowszą domyślną gałąź. Jeśli używasz wydań zamiast gałęzi, potrzebne jest nowe wydanie wskazujące commit z poprawką. Nie wybieraj starego commita.
3. Uruchom ponownie **cały Home Assistant**. Restart samej aplikacji PV Lab nie przeładuje manifestu integracji.
4. Odśwież stronę HA i ponownie otwórz konfigurację paneli słonecznych w Energii. Przy włączonej opcji prognozowania zaznacz **PV Lab**.

Jeżeli integracji nie ma jeszcze w Ustawienia → Urządzenia i usługi, dodaj PV Lab i sparuj ją z adresem i kluczem z zakładki Integracja HA aplikacji. Samo pobranie plików w HACS nie dodaje wpisu integracji.

Nie trzeba usuwać integracji, ponownie tworzyć encji ani kasować danych. Poprawka nie zmienia identyfikatorów encji, klucza parowania, prognoz, kalibracji ani protokołu połączenia. Aplikacja 0.2.3 nie wymaga ponownej aktualizacji.

## Alternatywa ręczna

Zastąp katalog `/config/custom_components/pv_lab` kompletnym katalogiem z tej paczki, a następnie uruchom ponownie HA. Nie umieszczaj integracji w katalogu aplikacji Supervisor.

## Sprawdzenie

Dodano test wymagający typu `service` i obecności platformy prognozy Energii. Sprawdzono również zgodność wersji, kompletność paczki i dotychczasowy kontrakt encji. Nie przeprowadzono instalacji na działającym HA użytkownika.
