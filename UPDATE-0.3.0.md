# Aktualizacja PV Lab do 0.3.0

## Instalacja

1. Opcjonalnie wyeksportuj dotychczasowe dane z panelu Pliki i retencja.
2. Rozpakuj pełną paczkę `pv-lab-update-0.3.0.zip` i wgraj jej zawartość do głównego katalogu repozytorium, podmieniając pliki.
3. Odśwież sklep aplikacji HA i zaktualizuj aplikację PV Lab do **0.3.0**. Dla lokalnego dodatku wykonaj przebudowę.
4. W HACS otwórz PV Lab, odśwież informacje i pobierz integrację **0.3.0** z aktualnej gałęzi lub z nowego wydania wskazującego ten kod.
5. Uruchom ponownie cały Home Assistant i odśwież panel. Nie trzeba usuwać ani ponownie parować integracji.

Aplikacja i integracja mają niezależną instalację. Sama aktualizacja HACS nie aktualizuje silnika, a sama aktualizacja aplikacji nie tworzy nowych encji.

## Po aktualizacji

- **Prognoza a produkcja**: wybierz tryb oceny, szczegół i zakres dat. Zmiana szczegółu ustawia domyślny zakres odpowiedni dla godzin, dni, miesięcy lub lat; możesz go zmienić.
- **Planowanie urządzenia**: ustaw np. 4 kWh, 2 h, rezerwę 300 W i bilansowanie godzinowe. Puste daty oznaczają od teraz do końca jutra. Daty formularza i rekomendacji są lokalne. Przycisk resetowania zakresu usuwa stałe ograniczenia dat.
- **Ustawienia → Bilans domu i archiwum porównań**: sprawdź encje i godzinę graniczną planu na jutro.
- W HA, w urządzeniu PV Lab, pojawią się trzy pola liczbowe, wybór trybu, dwie daty oraz nowe sensory planu i okien.

## Twoje encje bilansu

Główna encja: `sensor.energia_bilans_netto`. Wartość dodatnia oznacza eksport, ujemna import. Reset następuje o pełnej godzinie. W aplikacji i sensorach wynikowych zachowujemy ten sam znak.

Pomocnicze liczniki narastające:

- `sensor.0_electricity_meter_total_forward_active_energy_balanced`
- `sensor.0_electricity_meter_total_reverse_active_energy_balanced`

Są już zbilansowane godzinowo: nie używamy ich do odtwarzania fizycznego przepływu ani bilansu kwadransowego. Bieżące saldo godzinowe pochodzi z głównej encji. Dodatkowo weryfikujemy świeżość, jednostkę Wh/kWh i moment zgłoszenia względem początku godziny. Stare saldo poprzedniej godziny nie finansuje następnej. Jeżeli odczyt jest niedostępny, brakujące saldo jest szacowane z prognozy i rezerwy domu lub oznaczane jako brak.

W trybie kwadransowym i bez bilansowania nie korzystamy z godzinowego kredytu tej encji. Do dokładnego pomiaru takiego salda potrzebne byłyby odpowiednie niezbilansowane liczniki; ustawienie „liczniki już zbilansowane” można wtedy wyłączyć po wskazaniu właściwych encji. Nie zmieniamy trybu automatycznie na podstawie zapowiedzi przyszłych zasad rozliczeń.

## Zasady rekomendacji

Urządzenie ma początkowo równomierny pobór: 4 kWh / 2 h = 2000 W. Rezerwa domu to stałe założenie ustawiane przez użytkownika. Każdy kandydat zaczyna się na granicy kwadransa. Obliczamy wzrost niedoboru względem domu bez tego urządzenia w każdym okresie bilansowania. Minimum niedoboru wygrywa, przy remisie wcześniejszy start. W WWW pokazujemy trzy najlepsze warianty; mogą zaczynać się w sąsiednich kwadransach.

Pobór fizyczny szacujemy oddzielnie na średniej krzywej kwadransowej. Nie jest to pomiar sekundowego profilu urządzenia ani wyliczenie opłat. Rekomendacja nie uruchamia urządzenia i nie rezerwuje energii dla innych automatyzacji.

## Raporty i ich historia

Plan na jutro to ostatnia zapisana wersja znana przed 20:00 lokalnie poprzedniego dnia; musi być maksymalnie 6 godzin stara względem tego odcięcia. Bieżąca ocena korzysta z ostatniej wersji zapisanej przed początkiem godziny. Późniejsza poprawa prognozy nie zmienia ocenianej wartości. Czas zapisania/odczytu w PV Lab nie musi być godziną wydania modelu pogodowego dostawcy.

Rzeczywista produkcja pochodzi w pierwszej kolejności z godzinowych przyrostów potwierdzonego licznika AC w statystykach HA. Gdy ich nie ma, używamy kompletnych pomiarów mocy AC (co najmniej 95% kwadransa). Wysokie napięcie i przestoje pozostają widoczne jako oznaczenia. Raport ocenia faktyczny wynik także przy przestojach; uczenie korekt nasłonecznienia nadal takie przedziały odrzuca.

Pierwsze nowe porównania godzinowe mogą pojawić się po zakończeniu godziny. Dla „planu na jutro” potrzebny jest wcześniejszy zapis przed godziną graniczną. Dostępne archiwalne, opublikowane wyniki PV Lab z ostatnich dni mogą zostać wykorzystane, ale starsze wersje nie zapisywały wszystkich wartości źródłowych w publikacji — w takich kolumnach będzie brak danych. Nie wymyślamy dawnych prognoz ani nie przeliczamy ich nowym modelem po fakcie.

Niepełne godziny i dni są oznaczone. Ranking obejmuje wspólne okresy i identyczne zestawy uczestniczących źródeł. Raport rozdziela błąd przebiegu godzinowego od błędu sumy dobowej; przeciwne błędy rano i po południu nie znikają z oceny przebiegu. Sam zgodny wynik zero w nocy nie świadczy o jakości prognozy dziennej.

## Retencja

`reports.json` zawiera oczekujące, zamrożone prognozy i ocenione raporty. Szczegóły godzinowe pozostają przez bieżący dzień i sześć poprzednich, dobowe przez 30 dni, miesięczne przez bieżący i 11 poprzednich miesięcy, starsze dane rocznie. Agregacja i usunięcie przeniesionych składników są zapisywane razem atomowo, co chroni przed podwójnym liczeniem po restarcie. Roczne podsumowania są zachowywane bezterminowo. Podgląd w Plikach i retencji oraz eksport JSON obejmują raporty.

To retencja nowego archiwum porównań. Dzienniki robocze próbek/prognoz i wcześniej importowane statystyki mają odrębne, istniejące zasady retencji; ich ustawienia nie są automatycznie skracane podczas aktualizacji.

## Wieczór i okna

Po potwierdzonym końcu dziennego nasłonecznienia „pozostało” i energie okien wynoszą 0 kWh. Wynik całego dnia pozostaje końcową produkcją (jeżeli odczytano licznik), a początek nieistniejącego okna ma stan nieznany, z osobnym statusem „produkcja na dziś zakończona”. Nie podstawiamy sztucznej daty. Przed świtem nowego dnia nie zerujemy prognozy pozostałej produkcji. Awaria dostawcy w dzień nadal oznacza brak danych, nie zero. Do ustalenia końca dnia potrzebne są współrzędne instalacji, pobierane z HA.

## Zakres klucza integracji

Dotychczasowy klucz pozostaje ważny. Oprócz odczytu prognoz udostępnia wyłącznie zapis pól planu przez `/api/plan`. Nie umożliwia zmiany instalacji, odczytu plików ani sterowania urządzeniami. Encje prognoz nie stają się licznikami `total_increasing`; natywne przekazywanie prognozy do Energii pozostaje aktywne.
