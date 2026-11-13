# PV Lab 0.6.0 — import istniejącej historii

## Wgranie

Paczka różnicowa względem 0.5.4 zawiera tylko zmienione lub nowe pliki. Wgraj zawartość do głównego katalogu repozytorium. Nie trzeba nic usuwać. Poczekaj na publikację wydania w Actions, następnie zaktualizuj aplikację i integrację HACS oraz uruchom ponownie HA.

## Pierwszy import

1. Otwórz nową zakładkę „Import historii”.
2. Wpisz hasło do InfluxDB. Pozostałe parametry są ustawione według wcześniejszej diagnostyki; wszystkie można zmienić.
3. Zapisz połączenie i wybierz „Sprawdź encje”.
4. Zacznij od kilku zakończonych dni. Ustaw daty, zapisz i wybierz „Importuj historię”. Po sprawdzeniu dnia można rozszerzyć zakres od 2023-09-01.
5. Zobacz „Historyczny potencjał”, „Historia i trendy” oraz „Panele i zacienienie”. Liczba obserwacji i pochodzenie są widoczne w panelu. Brakujących optymalizatorów nie zastępujemy zerami.
6. Wybierz „Odczytaj pliki z Home Assistant”, aby odczytać Solcast i Open-Meteo. Dane bez potwierdzonego czasu wydania są pokazywane opisowo, poza rankingiem i wagami dostawców.

Daty zakresu importu oznaczają doby UTC, prezentacja energii i profili korzysta ze strefy HA. Import nie obejmuje niezakończonej doby UTC. Po zatrzymaniu ponownie wybierz import z pomijaniem zapisanych dni; odznaczenie tej opcji przelicza zakres bez dublowania obserwacji. Po pełnym imporcie opcjonalne uzupełnianie raz na dobę przelicza ostatnie trzy zakończone doby, w granicach ustawionego zakresu.

## Co wpływa na prognozę

Energia całego falownika i szacowane AC PV1/PV2 zasilają ten sam historyczny potencjał co statystyki HA. Potwierdzony profil AC całości może łagodnie ograniczyć wynik PV Lab zgodnie z ustawieniami historycznego profilu. Statystyki HA mają pierwszeństwo w pokrywających się godzinach; duże rozbieżności między źródłami wykluczają godzinę z uczenia.

Profil optymalizatorów jest względnym porównaniem z medianą dostępnych paneli tej samej połaci i wymaga co najmniej trzech poprawnych odczytów paneli w kwadransie. Nie jest dowodem fizycznego zacienienia ani dodatkowym mnożnikiem strat. Historia i bieżące obserwacje nie są sumowane dla tych samych dni. Uszkodzony/wymieniony optymalizator zachowuje osobny identyfikator.

## Pliki i jakość

- influx-history.json: zbiorcze energie godzinowe, profile paneli i postęp.
- influx-day-RRRR-MM-DD.json: energie kwadransowe, flagi jakości, przyczyny wykluczenia i dane pomocnicze; bez surowych napięć.
- provider-cache-history.json: kopia przebiegów archiwalnych dostawców do porównań opisowych.
- influx-credentials.json: osobne dane połączenia, niewidoczne w eksporcie WWW i przeglądarce plików. Zabezpiecza je kopia całego dodatku HA.

Nie tworzymy nowej bazy ani nie zmieniamy danych InfluxDB. Pliki importu są trwałe; dzienna retencja próbek i prognoz ich nie obejmuje. Eksport WWW zawiera profil zbiorczy i archiwa dostawców; pełne pliki dobowe chroni kopia całego dodatku HA. Trwałe archiwum Energii z 0.5.4 pozostaje niezależne.

Moc jest całkowana w krokach 30 s z ograniczeniem wieku pomiaru. Braki dzienne pozostają brakami; nocne zera wyznaczone astronomicznie są oznaczane. Stan tekstowy utrzymujemy do kolejnej zmiany; brak historycznego heartbeat nie pozwala udowodnić ciągłości łączności. Wysokie napięcie i nieprawidłowy status nie uczą profilu. Sama praca przy limicie AC nie wyklucza poprawnej energii godzinowej z potencjału AC; nie uczy porównań paneli.

Odczyt katalogu konfiguracji HA jest montowany w dodatku tylko do odczytu. Parser obsługuje rozpoznane formaty Solcast i Open-Meteo. Wiele plików Open-Meteo wymaga jednoznacznego wskazania źródła w kolejnej konfiguracji — aplikacja nie zgaduje ani nie sumuje duplikatów. Formatów nieznanych nie importuje.

Optymalizatory Huawei aktualizują się rzadziej niż falownik. Domyślna ważność ich mocy wynosi 420 s (edytowalna), przy wymaganym pokryciu kwadransa co najmniej 95%. Dłuższe luki nie tworzą obserwacji profilu. Limit falownika pozostaje odrębny.

Import może uzupełnić rzeczywistą energię w ostatnich siedmiu dniach „Prognoza a produkcja”, jeśli nie ma jej w statystykach HA. Źródło jest wtedy oznaczone jako historia InfluxDB. Nie są dopisywane brakujące dawne prognozy ani ich horyzonty.
