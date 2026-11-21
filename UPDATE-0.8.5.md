# PV Lab 0.8.5

Paczka zawiera tylko zmienione pliki względem 0.8.4. Wgraj zawartość do głównego katalogu repozytorium, zachowaj podkatalogi i zaktualizuj aplikację. Niczego nie usuwaj; ponowny import historii nie jest potrzebny.

Przy pierwszym starcie dzienniki forecast/published są bezstratnie kompresowane na miejscu po sprawdzeniu rozpakowanych bajtów. Start może chwilę potrwać. Nazwy logiczne plików się nie zmieniają; pobranie GZIP dodaje .gz. Podgląd i opcja Pobierz JSONL dają czytelny tekst. Nie zmieniamy ustawionej retencji ani trwałego archiwum Energii. Starsza wersja aplikacji nie czyta skompresowanych dzienników — przed powrotem do starszej wersji potrzebne jest ich rozpakowanie albo odtworzenie pełnej kopii dodatku.

W Pliki i retencja pobierzesz mniejszą kopię JSON.gz lub zgodny zwykły JSON. Kompresja nie usuwa rekordów, źródeł ani czasów wydań.

Prognozy: karta Ostrożniejsza prognoza na jutro pokazuje działanie nowej korekty. Jej wyłącznik i parametry są w Ustawieniach. To ograniczony retrospektywny test, nie gwarancja poprawy przy każdej pogodzie. Nowe warianty są zapisywane do sprawdzania na kolejnych dniach. Tabela godzinowa pokazuje rzeczywistą energię i ranking zamkniętych godzin na zapisach sprzed produkcji. Bieżąca godzina pozostaje częściowa.

Wspólne planowanie przeszukuje wskazany zakres do 7 dni; dla np. dnia za 5 dni nie kończy już obliczeń na 48 godzinach. Różnice celu i dat względem Optymalizatora są opisane w instrukcji.
