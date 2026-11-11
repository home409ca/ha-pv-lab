# PV Lab 0.2.3 — wykresy, kalibracja i panel Energia

## Aktualizacja

1. Rozpakuj `pv-lab-update-0.2.3.zip`. Wgraj **zawartość** do głównego katalogu istniejącego repozytorium GitHub, zastępując pliki. Bez dodatkowego katalogu nadrzędnego.
2. Odśwież sklep aplikacji Home Assistant i zaktualizuj aplikację **PV Lab do 0.2.3**. Dla instalacji lokalnej przebuduj aplikację.
3. Odśwież panel WWW; na dole menu powinna być wersja 0.2.3.

Nie usuwaj aplikacji ani katalogu `/data`. Aktualizacja nie zmienia ustawień, klucza parowania ani zebranej kalibracji. Zmiana samych parametrów instalacji lub jakości nadal rozpoczyna nową kalibrację.

Integracja HACS pozostaje w wersji **0.2.1** i jest w paczce. Jeśli masz ją już zainstalowaną i sparowaną, do zmian WWW wystarczy aktualizacja aplikacji. Instalacja samej aplikacji nie tworzy encji — do tego potrzebna jest również integracja HA.

## Dlaczego nie było widać prognozy źródłowej?

Zielona krzywa była rysowana na pomarańczowej i przy identycznych wartościach ją przykrywała. W 0.2.3 źródło ma szeroki przerywany ślad, a wynik wąską linię. Wszystkie trzy serie można oddzielnie włączać i wyłączać. Panel informuje o identycznych wartościach i o braku przebiegu. Limit nadal wynosi maksymalnie 5500 W dla całej instalacji.

## Dlaczego kalibracja ma 0 porównań?

Bez danych z uruchomionej instalacji nie można wskazać konkretnego powodu. Pod licznikiem widać teraz:

- dostępne przebiegi dostawców;
- początek pomiarów i bieżącej kalibracji;
- ostatni pełny kwadrans i procent pokrycia pomiarami;
- brak prognozy zapisanej przed rozpoczęciem kwadransa;
- rzeczywisty i dozwolone statusy falownika;
- braki napięcia, mocy, przerwy, wysokie napięcie i limit mocy;
- zbyt małą prognozę (<20 Wh na kwadrans), np. nocą.

Prawidłowe porównanie wymaga prognozy zapisanej przed produkcją oraz pełnego kwadransa poprawnych pomiarów. Licznik oznacza porównania dostawca/horyzont/kwadrans, a nie dni ani liczbę odczytów. Import rocznej produkcji tworzy profile historyczne; nie tworzy archiwum dawnych prognoz. Nie obniżamy prognozy z powodu wyłączenia falownika przy wysokim napięciu.

Pola encji mocy, energii dziennej, statusu i trzech napięć oraz dopuszczonych statusów można zmienić w Ustawieniach. Nie dopuszczaj statusów awaryjnych tylko po to, żeby zwiększyć liczbę porównań.

## Godzina po godzinie

W Prognozach pod wykresem jest tabela całej wybranej doby: każdy dostawca po limicie, połączona prognoza po limicie, wynik po korektach, energia pozostała i kompletność. Braki są oznaczone kreską. Pełna godzina wymaga czterech kwadransów; pozostała część może być dostępna nawet przy braku minionych kwadransów. Przy zmianie czasu doba ma 23 albo 25 osobnych godzin.

## Dlaczego napięcia urywały się około 12:00?

Stary wykres obejmował dwa dni, ale opisywał oś samymi godzinami. Do tego przy retencji 0 h wartości napięcia nie wracają z dysku po restarcie, a bufor pamięci jest okresowo skracany. Sam kod nie pozwala stwierdzić, która przyczyna wystąpiła w Twoim panelu.

W 0.2.3 wybierz dzień w Napięciach i użyj **Odczytaj cały dzień z HA**. Odczyt dotyczy wyłącznie trzech skonfigurowanych encji i wybranej doby (dzisiaj lub do 7 dni wstecz). Korzysta ze szczegółowej historii Recorder; jeśli HA jej nie zapisywał lub już ją usunął, aplikacja jej nie odtworzy. Oś obejmuje całą dobę, ale przyszłość pozostaje pusta. Panel podaje faktyczny zakres próbek oraz moment odczytu.

Historia trafia wyłącznie do odpowiedzi dla otwartego panelu. Nie zapisujemy jej w plikach aplikacji ani nie używamy tego podglądu do kalibracji. Retencja napięć na dysku pozostaje zgodna z ustawieniami (domyślnie 0 h).

## Prognoza w Energii

1. Zainstaluj integrację PV Lab przez HACS lub skopiuj `custom_components/pv_lab` do `/config/custom_components/pv_lab` i uruchom HA ponownie.
2. Dodaj integrację w Urządzeniach i usługach. Adres i klucz znajdziesz w zakładce Integracja HA aplikacji.
3. W konfiguracji panelu Energia, w panelach słonecznych, edytuj istniejące źródło produkcji. Zachowaj rzeczywisty licznik AC, np. `sensor.inverter_total_yield`. W wyborze prognozy wskaż **PV Lab** dla tej instalacji.
4. Nie wybieraj sensora prognozy jako licznika rzeczywistej produkcji. Nie dodawaj równolegle prognoz dostawców tej samej instalacji jako dodatkowych instalacji.
5. W aplikacji, w Integracji HA, wybierz **Sprawdź podłączenie do Energii**. Wynik pokazuje wykrycie platformy, stan integracji, wybór w Energii oraz liczbę przekazanych godzin.

Mechanizm korzysta z natywnej platformy prognozy Energii (`energy.py`, `wh_hours`), zgodnie z [API Energii HA](https://github.com/home-assistant/core/blob/dev/homeassistant/components/energy/websocket_api.py). Encje prognozy nie mają `total_increasing`, bo zmienna prognoza nie jest licznikiem produkcji.

## Sprawdzenie

51 testów Node oraz 8 testów Python zakończonych powodzeniem. Obejmują czas letni/zimowy, sumy godzinowe, nakładanie krzywych, rozpoczęcie kalibracji, powody braku porównań, odczyt napięć bez zapisu oraz diagnostykę połączenia z Energią. Test HTTP przechodzi przez uruchomioną aplikację i symulowany HA. W przeglądarce sprawdzono wykresy i tabelę w demonstracji. Nie wykonano testu na Twoim działającym HA ani instalacji Docker.
