Aktualizacja integracji **0.2.2**: [poprawka listy prognoz Energii](ENERGY-FIX-0.2.2.md). Poniżej zachowano opis wcześniejszej poprawki instalacji 0.2.1.

# Poprawka instalacji PV Lab przez HACS — integracja 0.2.1

W paczce 0.2.0 brakowało głównego `hacs.json`. HACS pobierający referencję commita może wtedy zgłosić: „The version … for this integration can not be used with HACS”. Dodano ten plik, wymagane metadane integracji i lokalną ikonę.

## Co wgrać na GitHub

Rozpakuj paczkę poprawki i wgraj **jej zawartość do głównego katalogu istniejącego repozytorium `ha-pv-lab`**. Podmień istniejące pliki. Nie twórz dodatkowego katalogu z nazwą paczki.

Najważniejsze ścieżki:

```text
ha-pv-lab/
├── hacs.json
├── repository.yaml                 ← istniejący plik zostaje
├── pv_lab/                         ← istniejąca aplikacja zostaje
└── custom_components/
    └── pv_lab/
        ├── manifest.json           ← wersja 0.2.1
        ├── __init__.py
        ├── sensor.py
        ├── const.py
        ├── brand/
        │   └── icon.png
        └── ...
```

Plik `hacs.json` musi być obok `repository.yaml`, a nie wewnątrz któregoś katalogu `pv_lab`. Nie należy ustawiać `content_in_root: true`: kod integracji jest w `custom_components/pv_lab`.

## Co zrobić w HACS po zapisaniu plików na GitHub

1. Otwórz repozytorium PV Lab w HACS i odśwież jego informacje.
2. Ponów pobieranie z **aktualnej domyślnej gałęzi**. Nie wybieraj starej referencji `b8bb690`: ten stary commit nie zawiera nowego `hacs.json` i nie zmieni się po dodaniu późniejszej poprawki.
3. Jeżeli HACS nadal oferuje wyłącznie stary commit, odśwież HACS / jego stronę i informacje repozytorium. Jeśli używasz wydań GitHub, opublikuj nowe wydanie `v0.2.1` wskazujące commit z poprawką i wybierz je przy pobieraniu. Wydanie nie jest obowiązkowe do pobrania domyślnej gałęzi.
4. Po instalacji uruchom ponownie HA, jeśli HACS o to poprosi. Dodaj PV Lab przez Ustawienia → Urządzenia i usługi → Dodaj integrację, o ile jeszcze nie ma wpisu. Adres i klucz odczytaj z panelu aplikacji → Integracja HA.

Repozytorium dodaje się do HACS jako **Integration**. HACS instaluje tylko część `custom_components/pv_lab`; silnik i panel aplikacji nadal instaluje/aktualizuje sklep aplikacji Home Assistant. Nie trzeba odinstalowywać aplikacji ani usuwać jej danych. Poprawka dotyczy integracji 0.2.1; aplikacja i protokół pozostają zgodne z 0.2.0.

## Weryfikacja

Sprawdzono lokalnie wymagane pola manifestu, strukturę pojedynczej integracji, ustawienia `hacs.json`, ikonę PNG, składnię Pythona i testy kontraktu encji. Samo pobranie przez HACS wymaga wgrania tych plików na GitHub i próby na Twoim HA; lokalna paczka nie zmienia zdalnego repozytorium ani starego commita.

Źródła: [wymagania HACS dla repozytoriów](https://www.hacs.xyz/docs/publish/start/), [wymagania integracji](https://www.hacs.xyz/docs/publish/integration/), [kontrola pobierania w HACS](https://github.com/hacs/integration/blob/main/custom_components/hacs/repositories/base.py).
