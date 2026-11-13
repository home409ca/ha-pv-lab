# PV Lab 0.6.1 — kwalifikacja częściowych dni

Paczka różnicowa względem 0.6.0. Wgraj zawartość do głównego katalogu repozytorium. Niczego nie usuwaj. Po publikacji wydania zaktualizuj aplikację i integrację HACS, uruchom ponownie HA.

Nie trzeba powtarzać importu HA ani InfluxDB. Profil jest odbudowywany automatycznie z istniejących plików godzinowych. Nowe ustawienia są uzupełniane automatycznie; nie zerują kalibracji dostawców. W „Historycznym potencjale” wybierz datę i kliknij „Pokaż profil dnia”.

Usunięto wymóg kompletu zaakceptowanych 24 godzin. Szersza referencja wymaga minimum 3 poprawnych godzin produkcyjnych, co najmniej 50% modelowanej energii całego dnia oraz produkcji co najmniej 60% modelu w dokładnie tych samych godzinach. Nieobecne lub złe godziny nie są zerami.

Jeśli to kryterium nie jest spełnione, kwalifikowany może być stabilny fragment minimum 3 kolejnych poprawnych godzin: produkcja co najmniej 60% modelu dla tych godzin oraz odchylenia godzinowych stosunków produkcja/model od ich mediany nieprzekraczające 35%. Nie łączymy fragmentu przez wykluczoną lub brakującą godzinę. Waga fragmentu i siła jego wpływu są pomniejszone o 25%. Progi są edytowalne w ustawieniach profilu.

Pozostają minimum 10 dni obserwacji wstępnej, minimum 2 niezależne sezony roczne, limit korekty 25% i limit falownika. Pojedyncze rekordy, zbyt mała produkcja lub niestabilny fragment nie tworzą referencji. Dane o złej jakości nadal nie trafiają do korekty. Klasyfikacja nie dowodzi bezchmurnej pogody ani fizycznego zacienienia.

Tabela pokazuje liczbę dni z jasną obserwacją danej godziny, w tym obserwacje ze stabilnych fragmentów. Pod tabelą są liczniki godzin obu typów referencji dla całej historii. Jest też czas przeliczenia profilu. Nie gwarantujemy niezerowej korekty każdej godziny: nadal zależy od jakości i liczby danych oraz tego, czy bieżąca prognoza przekracza poziom odniesienia.

Poprawka nie przywraca pomiarów odrzuconych już przy pierwotnym imporcie jako niepoprawne przyrosty. Zachowuje pliki i dotychczasowe raporty oraz trwałe archiwum Energii. Historia 12 z 18 optymalizatorów nie zmienia energii całej instalacji: ta pochodzi z falownika, a podział AC z napięć/prądów stringów. Porównania paneli są diagnostyczne.
