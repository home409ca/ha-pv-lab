# PV Lab 0.4.0 — wersje HACS i profile urządzeń

## Wgraj na GitHub

1. Rozpakuj `pv-lab-update-0.4.0.zip`. Wgraj **całą zawartość do głównego katalogu repozytorium w jednym zatwierdzeniu**, zastępując pliki. Bez katalogu nadrzędnego i bez przesyłania samego ZIP.
2. Wgraj także **`.github/workflows/release.yml`** i **`scripts/release.py`**. Wybrane ustawienia Actions są odpowiednie. Nie dodawaj osobnego tokenu.
3. GitHub sam uruchomi **Publish PV Lab version**, sprawdzi wersje i testy, a następnie opublikuje **v0.4.0** z dokładnie przesłanego commita.
4. Poczekaj na pomyślne zadanie i wydanie w **Releases**. Odśwież informacje repozytorium w HACS. Numer będzie widoczny w informacjach i oknie pobierania; tekst samego przycisku ustala HACS.
5. Zaktualizuj aplikację do **0.4.0**, następnie integrację HACS do **0.4.0**, uruchom ponownie cały Home Assistant i odśwież WWW.

Workflow nie używa zewnętrznych Actions: tylko `run`, Python, Node i własny kod. Uprawnienie `contents: write` otrzymuje wyłącznie zadanie publikacji. Nie potrzeba prawa tworzenia lub zatwierdzania PR-ów. Testy potomne nie otrzymują tokenu publikacji ani tokenów HA.

W HACS ukryto pobieranie domyślnej gałęzi. Dopóki pierwsze zadanie nie opublikuje wydania, może nie być nowej wersji do pobrania. Jeśli zadanie jest czerwone, przekaż błąd zamiast rozszerzać uprawnienia w ciemno.

Każda następna paczka musi mieć nowy numer aplikacji i integracji. Opublikowane wersje nie są nadpisywane ani przenoszone na inne commity. Starsze wydania mogą zostać na liście, ale domyślnie pobierasz najnowsze. Ponowienie przerwanego zadania na tym samym commicie może dokończyć szkic wydania. Nie trzeba ręcznie tworzyć tagów.

## Twoje urządzenia

Domyślnie ustawiono:

| Urządzenie | Moc W | Dzienna energia kWh |
|---|---|---|
| Pralka | `sensor.gniazdkopomiarpralka_energy_power` | `sensor.gniazdkopomiarpralka_energy_today` |
| Zmywarka | `sensor.gniazdkopomiarzmywarka_energy_power` | `sensor.gniazdkopomiarzmywarka_energy_today` |

Encje i progi możesz zmienić w Ustawieniach bez resetowania kalibracji PV. Obsługujemy również kW i Wh. Dodatkowe urządzenia dopisuje się w pełnej konfiguracji JSON do listy `appliances` (do 20, unikalne `id`).

## Utworzenie profilu

1. **Profile urządzeń** → Pralka/Zmywarka → odczytaj np. **14 dni** historii (zakres 1–30 dni).
2. Sprawdź wykryte cykle: czas, energia z całki mocy, kontrolny przyrost licznika, średnia i maksymalna odczytana moc.
3. Zaznacz cykle tego samego programu i nadaj nazwę, np. „Pralka — bawełna 40°C”. Nie trzeba wybierać wszystkich cykli.
4. Zapisz profil, wybierz wariant i kliknij **Użyj w planowaniu PV**.

Wymagana jest szczegółowa historia mocy W/kW w Recorder. Jeżeli HA ją usunął, same dobowe sumy kWh nie odtworzą faz pracy. Limit analizy to 250 tys. zmian; dla gęstszej historii wybierz krótszy zakres. Odczyt jest dzielony na doby.

## Wykrywanie i kontrola

Domyślne progi: start 10 W, koniec po 20 minutach poniżej 5 W, minimum 2 minuty aktywności, 10 minut długości i 0,05 kWh, maksimum 8 godzin. Krótkie pauzy pozostają w cyklu. Długi postój może podzielić program — w razie potrzeby zwiększ czas ciszy. Cykl ucięty na początku, nadal trwający lub zawierający `unavailable` nie jest uznawany za pełny.

Nazw programów nie rozpoznajemy automatycznie. Użytkownik potwierdza cykle; różne programy powinny mieć osobne profile. Jeden cykl daje profil wstępny, kilka podobnych cykli lepszy obraz.

Moc jest traktowana jako stała do kolejnej zapisanej zmiany. Maksimum oznacza maksimum dostępnych próbek, nie pomiar impulsu między nimi. Licznik dzienny jest kontrolą: obsługujemy reset przy zmianie lokalnej daty, a reset w środku dnia unieważnia kontrolny wynik. Rozbieżność większa niż 20% i 0,03 kWh jest oznaczona. Nie skalujemy po cichu profilu do rozbieżnego licznika.

## Warianty

- **Typowy:** najczęstsza długość cyklu w przedziałach 15 minut, a w tej grupie rzeczywisty cykl bliski medianie energii. Zachowuje prawdziwe fazy jednego cyklu.
- **Średni:** średnia energia w kolejnych 5 minutach od startu. Krótsze cykle mają zera na końcu. Energia jest średnią energią wybranych cykli.
- **Najbardziej energochłonny:** rzeczywisty cykl o największej energii. Nie jest sztucznym połączeniem maksimów wszystkich faz ani gwarancją najgorszego przyszłego przypadku.

Wykres pokazuje średnią moc w przedziałach 5 minut. Koniec planowania dopełniamy zerami do kwadransa, bez dodawania energii.

## Korekta i planowanie

**Popraw jako profil ręczny** kopiuje wariant do edytora. Jedna liczba W w wierszu oznacza kolejny przedział 5 minut. Zapis tworzy nowy profil; oryginał pozostaje. Można też utworzyć profil od zera. Limit: 24 godziny, 0,01–100 kWh, unikalna nazwa. Ręczny profil ma jeden wariant.

Planowanie integruje fazy poboru w każdym okresie bilansowania. Starty nadal są wyszukiwane co 15 minut. W ocenie fizycznego poboru i bez bilansowania używamy kroków 5-minutowych; prognoza PV nadal ma rozdzielczość 15 minut i stałą średnią moc wewnątrz kwadransa. To oszacowanie, nie pomiar sekundowy.

Profil narzuca energię i czas. Ręczna zmiana tych liczb przez encję HA przełącza plan na ręczne zapotrzebowanie zamiast skalować profil. Rezerwę domu, daty i bilansowanie można zmieniać z zachowaniem profilu.

W HA dochodzą wybory **Plan profil urządzenia** i **Plan wariant profilu**. Lista odświeża się po odczycie aplikacji, zwykle w ciągu minuty. Profil tworzy się w WWW; później można wybierać go w dashboardzie HA. Urządzenie nie uruchamia się automatycznie.

## Dane i ograniczenia

`/data/appliance-profiles.json` przechowuje pochodne analizy, do 120 cykli na urządzenie i zapisane profile (do 100). Surowe stany pozostają w HA. Nowy odczyt zastępuje analizę urządzenia; zapisane profile pozostają do ręcznego usunięcia. Plik jest dostępny w podglądzie i eksporcie. Usunięcie aktywnego profilu przełącza plan na ręczny z ostatnimi liczbami.

Nie usuwaj `/data` ani integracji. Ustawienia, kalibracja, raporty, istniejące identyfikatory i klucz pozostają zachowane. Nie publikuj w GitHub katalogu danych ani eksportów prywatnych danych.

Testy i panel sprawdzono lokalnie z symulowanym HA/GitHub. Prawdziwa publikacja Actions nastąpi po przesłaniu plików, a progi wykrywania trzeba sprawdzić na Twojej historii.
