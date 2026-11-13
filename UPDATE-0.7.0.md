# Aktualizacja PV Lab 0.7.0 — Optymalizator zużycia energii

Paczka aktualizacyjna zawiera tylko pliki zmienione względem 0.6.3. Rozpakuj ją i przeciągnij foldery oraz pliki do głównego katalogu repozytorium w GitHub. Nie wgrywaj samego ZIP-a, nie dodawaj zewnętrznego folderu i niczego nie usuwaj. Zatwierdź wszystkie pliki jednym zapisem. Po zielonym „Publish PV Lab version” zaktualizuj osobno aplikację oraz integrację HACS i uruchom ponownie HA.

## Pierwsze uruchomienie

1. Otwórz nową sekcję „Optymalizator zużycia energii”.
2. Uzupełnij ceny brutto energii, dystrybucji i opłat zmiennych zgodnie z umową. Każdy składnik może pochodzić z encji lub wartości ręcznej. Brak cen oznacza brak rekomendacji, a nie darmową energię. Jawne 0 jest dopuszczalne dla nieobowiązującej opłaty.
3. Wpisz ostatnią RCEm, jej miesiąc i właściwy współczynnik. Ręczna RCEm jest w PLN/kWh: wartość z PSE w PLN/MWh dzielisz przez 1000. Encje mogą mieć PLN/kWh lub PLN/MWh — program przelicza jednostkę. Możesz osobno dodać prognozę RCEm na bieżący i następny miesiąc. Bez niej ostatnia cena jest oznaczonym założeniem, a nie prognozą rynku.
4. Sprawdź godziny G12w i potwierdź ceny brutto. Domyślne okna PGE uwzględniają lato, zimę, weekendy i święta. Nastawy można zmienić zgodnie z umową. Przy zmianie stawek dodaj nowy cennik z datą wejścia, zamiast nadpisywać dawne ceny.
5. Sprawdź bazę domu. Początkowo używamy rezerwy i trybu bilansowania z dotychczasowego planowania. Do profilu historycznego odczytaj moc domu oraz wszystkich odejmowanych urządzeń. Dla HA wybierz 1–30 dni, dla InfluxDB 1–3650 dni. Gdy którejś encji brakuje, nie udajemy zerowego zużycia. Rezerwa pozostaje bezpiecznym, widocznym założeniem.
6. Istniejące profile z przypisanym urządzeniem mogą wstępnie pojawić się w konfiguracji. Sprawdź programy i zakresy. Można dodawać kolejne urządzenia, w tym klimatyzację i pompę ciepła. Profil wczytany z biblioteki narzuca fazy poboru; równomierna moc jest wyłącznie ręcznym uproszczeniem.
7. Kliknij „Przelicz symulację”. Oceniane są starty co 15 minut. Porównaj najtańszy wariant, wariant z największym udziałem PV i wspólny plan.

## Co oznacza koszt

Liczymy różnicę bilansu domu z cyklem i bez cyklu: dodatkowy zakup energii plus utracona wartość eksportu. Zużyta nadwyżka PV ma koszt alternatywny. Cena sprzedaży nie jest ceną zakupu. Stałe opłaty z faktury nie zmieniają porównania terminów i są pomijane.

Saldo godzinowe jest wykorzystywane tylko do końca tej godziny. Nie przenosi się na kolejną. Pozostałe tryby to bilansowanie kwadransowe i rozdzielczość 5 minut przy braku bilansowania. Fizyczne przepływy są szacunkiem opartym na kwadransowej prognozie PV; nie udają sekundowych pomiarów.

Wiele urządzeń dzieli jedną nadwyżkę. Koszt wspólny jest policzony raz. Koszty marginalne urządzeń warunkowane pracą pozostałych nie muszą sumować się do kosztu wspólnego. Harmonogram jest heurystyką z priorytetami i poprawkami, bez gwarancji znalezienia globalnego optimum.

Scenariusze uwzględniają dotychczasowy względny błąd prognoz w danym horyzoncie i zmienność bazy. Bez 20 ocenionych przedziałów przyjmowany jest jawny margines PV 25%. Są to scenariusze wrażliwości, nie gwarantowany zakres ani statystyczny przedział ufności. Rekomendacja może brać pod uwagę koszt najgorszego scenariusza; osobno widać najtańszy wariant centralny.

## Historia i porównanie z pomiarami

„Zapisz wspólny plan do porównania” zapisuje niezmienny plan, ceny i przebiegi profili. Nie uruchamia urządzeń. Po rzeczywistym wykonaniu cykli potwierdź wykonanie i wybierz porównanie z pomiarami HA. Potrzebna jest historia mocy domu, PV i każdego urządzenia. Gdy cykl nie wystąpił lub brakuje danych, program nie obliczy pozornego kosztu rzeczywistego. Wynik używa cen zapisanych w planie; nie jest fakturą ani wyliczeniem końcowego depozytu.

## Encje Home Assistant

Integracja dodaje status optymalizatora, koszt wspólny w PLN, czas przeliczenia i 8 miejsc na rekomendacje urządzeń: start, koszt marginalny i status. Pierwsze dwa miejsca są domyślnie włączone. Atrybuty pokazują nazwę i identyfikator urządzenia oraz jego wariant najtańszy i najbardziej słoneczny. Miejsca odpowiadają kolejności włączonych urządzeń; sprawdzaj identyfikator w atrybutach przy zmianie kolejności. Nieaktualny plan nie udostępnia starej godziny jako gotowej rekomendacji. Encje niczego nie włączają.

## Pliki

- /data/optimizer-settings.json — ustawienia modułu;
- /data/optimizer-load.json — oczyszczone kwadransowe energie bazowe i informacje o źródle;
- /data/optimizer-history.json — ręcznie zapisane plany i wyniki ich weryfikacji.

Nie dodajemy bazy danych i nie kopiujemy surowych napięć. Plany oraz profil są trwałe i znajdują się w eksporcie kopii. Osobny eksport optymalizatora zawiera ustawienia, wynik i historię. Hasło InfluxDB i klucz HA nie trafiają do tych plików. Dotychczasowe prognozy Energii pozostają w swoim trwałym archiwum.

## Co celowo pozostaje założeniem

Nie znamy Twoich stawek ani dostępności depozytu, więc nie wstawiamy cennika na oko i nie gwarantujemy oszczędności. Depozyt, jego wykorzystanie i wygasanie nie są modelowane. Nie tworzę nowej prognozy PV ani pozornej prognozy ceny RCEm. Dane z innego dnia, produkcja odtworzona po fakcie i niepotwierdzone archiwa dostawców nie są oceną jakości wcześniejszej rekomendacji.

Dokładniejsze zasady, architektura i źródła taryf: ENERGY-OPTIMIZER.md.
