# PV Lab 0.6.2 — referencja historyczna i historia zmian

Paczka różnicowa względem 0.6.1. Wgraj jej zawartość do głównego katalogu repozytorium. Niczego nie usuwaj. Po pomyślnej publikacji wydania zaktualizuj aplikację i integrację HACS, uruchom ponownie HA. Nie powtarzaj importu HA/InfluxDB. Wybierz tę samą datę w Historycznym potencjale i kliknij „Pokaż profil dnia”.

## Referencja i aktywność korekty

Próg 60% modelu służy wyłącznie metodzie jasnych godzin; nie blokuje już widoczności statystycznego profilu poprawnych godzin. Jeżeli zakwalifikowanych jasnych godzin jest za mało, wyliczamy wysoki ważony percentyl ilorazu rzeczywista energia/model ze wszystkich poprawnych godzin w porównywalnym okresie i położeniu Słońca. Uwzględnia starsze obserwacje z malejącą wagą. Widoczna krzywa nie dowodzi jasnej pogody ani fizycznego zacienienia. Nie uzupełniamy brakujących godzin interpolacją i nie korzystamy z wykluczonych pomiarów.

Do wyświetlenia statystycznego poziomu potrzeba przynajmniej trzech poprawnych obserwacji. Do jego użycia w korekcie pozostają minimum 10 dni, wymagane niezależne sezony oraz dodatkowo co najmniej trzy różne dni z wysokim poziomem potwierdzonym w wymaganej liczbie sezonów. Potwierdzenie oznacza wynik w granicach ±20% wyznaczonego wysokiego stosunku energia/model. Pojedynczy wysoki skok nie może sam aktywować korekty.

Domyślnie co najmniej 50% dostępnych obserwacji tej godziny w porównywanym oknie musi być poprawnych. W przeciwnym razie krzywa pozostaje opisowa, a korekta jest zablokowana. Ten udział odnosi się do dni obecnych w archiwum; nie dowodzi kompletności wszystkich danych z całego okresu. Brakujące całe dni pozostają nieznane. Próg można zmienić w ustawieniach „Minimum poprawnych dni profilu statystycznego”.

Siła statystycznej korekty jest dodatkowo mnożona przez 0.5, udział poprawnych danych i współczynnik liczebności potwierdzeń (pełny od 10 dni). Pozostają margines, limit redukcji 25%, model tylko potwierdzonej energii AC całości oraz limit falownika. Końcowa prognoza nie jest powiększana. Stabilny niski profil może być skutkiem pogody, zacienienia lub innych powtarzalnych warunków — nie twierdzimy, że sam potwierdza przyczynę.

Gdy metoda jasnych godzin spełnia dotychczasowe warunki, nadal ma pierwszeństwo. Tabela rozróżnia metody i pokazuje konkretne powody blokady. „Obserwacje referencji / lata” opisuje rzeczywisty zbiór użyty do wyznaczenia wyświetlanej referencji; nie wszystkie te dni są jasne.

## Historia zmian

CHANGELOG.md w katalogu głównym, w pv_lab/ i w custom_components/pv_lab/ jest teraz synchronizowany. Publikacja odrzuci niezgodne opisy lub brak sekcji aktualnej wersji. Bieżąca sekcja jest również umieszczana w GitHub Release. Istniejące wydania pozostają niezmienne.

## Sprawdzenie

Odtworzono przypadek braku referencji na eksporcie użytkownika i porównano wynik przed/po, bez publikowania prywatnych danych w repozytorium. Testy syntetyczne sprawdzają powtarzalnie niskie profile, wykluczenia jakości, pojedyncze skoki i brak niezależnych sezonów. Wyniki na danych użytkownika opisują odtworzenie historycznego profilu; nie są dowodem poprawy dokładności przyszłej prognozy. Tę oceniamy dopiero na wcześniej zapisanych prognozach i późniejszej produkcji.
