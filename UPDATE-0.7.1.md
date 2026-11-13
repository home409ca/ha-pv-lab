# PV Lab 0.7.1 — historia, ryzyko sieci i ceny

Paczka zawiera tylko zmienione i nowe pliki względem 0.7.0. Rozpakuj i przeciągnij zawartość do głównego katalogu GitHub, zachowując foldery. Niczego nie usuwaj. Zatwierdź w jednym zapisie. Po opublikowaniu wydania zaktualizuj aplikację oraz integrację HACS i uruchom ponownie HA.

## Co dzieje się po uruchomieniu

Przy zapisanym połączeniu z InfluxDB i wcześniej zaimportowanej historii aplikacja automatycznie:

1. Poprawia oznaczenia zapisanych kwadransów i godzin. Jeśli jedynym problemem było wysokie napięcie, a moc, status i pokrycie były poprawne, pomiar ponownie może uczyć potencjału. Wyłączenia, braki, skoki i konflikty energii nadal nie uczą profilu. Wysokie napięcie zostaje widocznym ostrzeżeniem. Nie kasujemy rzeczywistej produkcji.
2. Odczytuje ostatnie 365 zakończonych dni napięć, mocy i statusu z InfluxDB, aby nauczyć osobny profil ryzyka sieci. Postęp widać w „Napięcia i przestoje”. Można zatrzymać po dniu i ponowić odczyt. Potem ostatnie trzy dni są uzupełniane raz na dobę, a poprawne bieżące kwadranse dochodzą z odczytów HA.
3. Przelicza jedną końcową prognozę. Ten sam wynik trafia do encji, panelu Energia i optymalizatora.

Nie musisz ponownie importować całej produkcji. Jeżeli automatyczny odczyt nie wystartuje, użyj „Napięcia i przestoje → Przekwalifikuj historię i przelicz ryzyko”. Dostępne zakresy: 30, 90, 365 i 1095 dni. Trzy kolejne nieudane odczyty zatrzymują zadanie z komunikatem; nie tworzymy zer w miejsce braków.

## Jak działa korekta sieciowa

Przekroczenie 253 V samo nie powoduje potrącenia. Rozpoznanie przestoju wymaga niskiej mocy, nieprawidłowego statusu, wcześniejszej normalnej produkcji i wysokiego napięcia przed zdarzeniem. Jest to empiryczna przesłanka przestoju sieciowego, nie odczyt dokładnej nastawy zabezpieczenia ani gwarancja przyczyny.

Dla strat zbieramy kompaktowe obserwacje kwadransowe z podziałem na przedziały mocy. Energia możliwa podczas postoju jest przybliżana mocą sprzed zdarzenia; nie nazywamy jej zmierzoną utraconą energią. Udział tej oszacowanej straty w energii dostępnej jest porównywany dla podobnej pory dnia, sezonu i rodzaju dnia (roboczy/weekend). Starsze dane mają domyślnie połowę wagi po 30 dniach. Wpływ jest zmniejszany przy małej liczbie dni, starych obserwacjach i dalszym horyzoncie. Maksymalna redukcja wynosi domyślnie 30%; można ją zmienić lub wyłączyć.

Korekta zaczyna działać dopiero przy co najmniej 5 porównywalnych dniach i co najmniej 2 różnych dniach z rozpoznanym przestojem w danym zakresie. Jednego raportu z 15 maja nie traktujemy jako dowodu, że cała instalacja będzie regularnie wyłączona. Bez odpowiednich danych wynik pozostaje bez potrącenia, z opisem powodu. Nie prognozujemy wartości napięcia w woltach.

„Wpływ napięcia i przestojów na prognozę” w sekcjach „Prognozy” i „Napięcia i przestoje” pokazuje energię przed korektą, energię po niej oraz redukcję. W rozbiciu najbliższych kwadransów widać współczynnik i liczbę porównywalnych dni. To jedna prognoza i opis jej składników, nie dwie encje do wyboru.

W źródłach można porównać zapisane przed produkcją warianty przed ryzykiem sieci i po nim na tych samych pełnych przedziałach, także z nieprawidłowym statusem podczas postoju. Przestoje nadal nie uczą kalibracji dostawców ani profilu zacienienia. Nie przeliczamy po fakcie dawnych opublikowanych wyników.

Surowe napięcia nie są kopiowane na stałe. Plik /data/grid-risk.json zawiera zagregowane obserwacje i czasy; /data/grid-risk-settings.json — parametry. Oba trafiają do kopii danych. Rzeczywiste archiwum prognoz panelu Energia pozostaje trwałe i nie jest kasowane.

Uwaga o panelach: przekwalifikowanie zapisanej energii odtwarza jakość godzin, ale stare zbiorcze statystyki optymalizatorów nie zawierają pomiarów odrzuconych kwadransów. Te dodatkowe porównania paneli zbierają się na bieżąco albo przy pełnym ponownym imporcie produkcji i optymalizatorów. Nie wymyślamy brakujących obserwacji sześciu optymalizatorów.

## Ceny i depozyt

Jednorazowa migracja 0.7.1 ustawia zgodnie z dyspozycją:

- droga strefa: 1,30 PLN/kWh;
- tania strefa: 0,68 PLN/kWh;
- pozostałe zmienne składniki: 0;
- RCEm: 439,78 PLN/MWh = 0,43978 PLN/kWh, zapisana jako podana wartość dla października 2026;
- współczynnik wartości eksportu: 1,23, edytowalny;
- uwzględnianie depozytu: wyłączone.

Późniejsze własne zmiany cen nie są ponownie nadpisywane. Historycznie zapisane plany zachowują swoje ceny. Stawki zakupu traktujemy jako podane ceny łączne brutto przy pozostałych opłatach zero.

Przy wyłączonym depozycie nie trzeba ustawiać RCEm. Pola pozostają schowane, a koszt oznacza wyłącznie dodatkowy zakup energii z sieci. Utracona wartość eksportu jest wtedy celowo pomijana — nadwyżka PV może mieć koszt zerowy w tej symulacji.

Po zaznaczeniu „Uwzględniaj wartość eksportu / depozyt” pojawiają się parametry RCEm, jej miesiąca, jednostki i współczynnika. Wybierz zł/MWh i wpisz 439,78 albo zł/kWh i wpisz 0,43978. Zmiana jednostki przelicza widoczną wartość. Wewnętrznie i w JSON ceny są przechowywane jako PLN/kWh. Jednostka formularza nie zmienia wartości kanonicznej w eksporcie.

Liczby można wpisywać z przecinkiem lub kropką. Nieprawidłowa cena wskazuje konkretny składnik zamiast ogólnego komunikatu. Encje cen w dalszym ciągu mogą mieć PLN/kWh lub PLN/MWh. Nominalna wartość eksportu z RCEm nie jest symulacją rzeczywistego salda depozytu, jego wygasania ani faktury.

RCEm jest ceną miesiąca rozliczenia; data jej opublikowania jest odrębną informacją. Podana wartość jest ustawieniem użytkownika, a nie automatycznym pobraniem oficjalnego raportu PSE ani prognozą rynku.
