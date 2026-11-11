# Krytyczna ocena załączonego podsumowania

Podsumowanie potraktowano jako materiał do oceny, a nie nowe polecenie nadrzędne. Liczby miesięczne, liczby rekordów i daty dostępności nie zostały potwierdzone na rzeczywistej bazie HA w tej sesji i nie zostały wprowadzone jako wyuczone współczynniki.

## Sugestie wykorzystane

1. **Różne azymuty i moce stringów.** Porównania PV1/PV2 wymagają normalizacji kWp i uwzględnienia orientacji. Dane historyczne są raportowane według stringu i miesiąca, jeśli potwierdzisz odpowiednie liczniki. Naturalna przewaga PV2 rano i PV1 po południu nie jest stratą od cienia.
2. **Astronomia zamiast historii `sun.sun`.** Pozycja Słońca była już wyliczana lokalnie z czasu i współrzędnych. Nie zależymy od obecności dawnych atrybutów encji `sun.sun`.
3. **Porównywalne przedziały i właściwe jednostki.** Dane U i I stringu nie są mnożone, jeśli ich czasy raportowania różnią się bardziej niż dopuszczalna przerwa. Brak pomiaru nie staje się zerem. Moce DC i energia optymalizatorów nie są utożsamiane z AC falownika.
4. **Walidacja chronologiczna.** Oprócz oceny dostawców zapisujemy rzeczywiście opublikowane warianty: źródła, prostą korektę, profil i końcowy wynik. Późniejszy model nie poprawia prognozy wstecz. Dostawców porównujemy na wspólnych próbkach i paśmie horyzontu. Dodano MAE i RMSE oraz WAPE odporne na dzielenie przez pojedyncze wartości bliskie zeru.
5. **Użycie historii przez API.** Import długoterminowych statystyk HA jest dzielony na małe zakresy; bez ciężkich SQL i bez pobierania całej historii napięć. Raport zawiera miesięczne średnie, normalizację kWp i profile godzinowe oraz oznaczenia niepełnych dni.
6. **Oddzielanie przyczyn strat.** Wysokie napięcie i przestoje wyłączają okresy z kalibracji. Ich flagi pozostają po usunięciu szczegółowych napięć. Powtarzalna różnica produkcji jest wskazaniem diagnostycznym, nie automatycznym dowodem cienia.

## Sugestie wymagające zmiany lub zastrzeżeń

- **„Dzienne liczniki — bierz maksimum”.** To jest warunkowo poprawne: jeden prawidłowy reset o północy, brak dodatkowych resetów, kompletna końcówka dnia i właściwe jednostki. Ogólnie bezpieczniejsze są poprawnie skonfigurowane statystyki przyrostów `change`/`sum`. Nigdy nie sumujemy wszystkich stanów licznika. Częściowych dni nie porównujemy jako pełnych.
- **„10/10 zapytań z 19.10 oznacza brak aktualizacji po tej dacie”.** Pojedynczy odczyt licznika limitu nie daje takiego wniosku. Limity mogą dotyczyć dnia i konkretnego konta, a dane mogą być aktualizowane w inne dni. Nie wykonujemy dodatkowych chmurowych zapytań. Rozdzielamy datę odczytu przez aplikację od `last_updated` encji; ta druga też nie zawsze jest datą wydania modelu pogodowego.
- **„Końcowa prognoza dnia kontra produkcja tego dnia”.** Może zawierać informację poznaną dopiero w trakcie dnia. To nie jest równoważne ocenie prognozy z poprzedniego wieczoru. Statystyki dobowe/średnie prognozy nie odtwarzają jej wersji znanej w konkretnym momencie. Bez takiego zapisu nie uznajemy dawnych wyliczeń za uczciwy test przyszłości.
- **„Kilka warstw korekt mnożonych kolejno”.** Pora roku, godzina, orientacja i zacienienie mogą opisywać tę samą stratę. Ich niezależne mnożenie łatwo odejmuje ją wielokrotnie. Stosujemy jeden warunkowy profil z przejściem do prostszego przy braku danych; diagnostyka optymalizatorów nie jest dodatkowym mnożnikiem.
- **„Niższa produkcja historyczna → obniż przyszłą prognozę”.** Sama historyczna produkcja zależy od pogody i sezonu, które dostawca już uwzględnia. Takie mnożenie bez porównywalnej dawnej prognozy może pogorszyć wynik. Wersja 0.2 używa tych danych do trendów, nie narzuca z nich korekty pogody ani cienia.
- **„Pełny model osobno dla PV1/PV2”.** Jest sensownym kierunkiem, jeżeli są poprawne prognozy i pomiary dla każdej połaci. Nie wolno odtworzyć tego przez stały podział prognozy całej instalacji proporcją 11/18 i 7/18, bo różne orientacje mają różne profile godzin. Statystyki stringów z załącznika pozostają niepotwierdzone. W tym wydaniu nie wprowadzono pozornego modelu per-string bez tych przesłanek.
- **„Rozpoznawaj cień, chmury i temperaturę”.** Bez wiarygodnych pomiarów pogody/promieniowania i temperatury modułów nie da się pewnie rozdzielić wszystkich przyczyn. Temperatura falownika nie zastępuje temperatury paneli. Różnice raportujemy z ograniczeniami, bez kategorycznych diagnoz.

## Błąd znaleziony w dotychczasowej implementacji

Limit falownika był nakładany przed mnożnikiem korekty. Przykładowo 2000 Wh w kwadransie i korekta 0,5 powinny dać 1000 Wh — poniżej limitu 1375 Wh. Najpierw obcięcie do 1375 Wh, a potem mnożenie przez 0,5 dawało 687,5 Wh. Poprawiono kolejność i dodano test. Przy ograniczonej rozdzielczości nadal jest to przybliżenie clippingu wewnątrz kwadransa.

## Czego nie uznajemy jeszcze za dowiedzione

Nie potwierdzono, że rzeczywista instalacja ma cień w konkretnych godzinach ani że nowy pełny wariant zawsze wygrywa z prostą korektą lub najlepszym dostawcą. Tabele walidacji mają to zweryfikować na przyszłych, wcześniej nieznanych pomiarach. Przedstawione w załączniku odchylenia miesięczne są wskazówką do analizy, nie gotowym modelem ani dowodem przyczyny strat.
