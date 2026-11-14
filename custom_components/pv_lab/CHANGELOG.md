# 0.7.8

- Dodano opcjonalne, domyślnie wyłączone linie bazy zużycia domu i nadwyżki godzinowej w kWh. Model bazy jest wspólny z Optymalizatorem, a nadwyżka to aktualne PV minus baza domu.
- Skala wykresu produkcji dopasowuje się do widocznych danych. Limit 5500 W / 5,5 kWh w godzinie jest pokazywany dopiero od około 5000 W / 5 kWh.
- Wyjaśniono pełną bieżącą godzinę, bilansowanie i różnicę między nadwyżką a wspólnym planem urządzeń. Instrukcja jest uaktualniona.

# 0.7.7

- W „Porównaniu prognoz i produkcji” dodano przełącznik mocy W i energii godzinowej kWh. Domyślny widok energii jest zapamiętywany w przeglądarce.
- Zachowano wybór dnia, dostawców i widoczności linii. Sumy godzin wymagają czterech kwadransów, pomiary pochodzą z zakończonych godzin raportów.
- Ograniczono ostrzeżenie o innych prognozach do potwierdzonego przypisania konkretnej działającej integracji do tego samego licznika PV. Sama dostępność nie wywołuje ostrzeżenia.
- Wyjaśniono różnicę między energią produkcji a wolną nadwyżką i uaktualniono instrukcję.

# 0.7.6

- Naprawiono pusty wykres porównania z Energią: godzinne odstępy nie są już traktowane jak luki i punkty są łączone.
- Usunięto przycisk ręcznego odczytu. Kontrola odbioru przez HA działa automatycznie najwyżej raz na minutę, w tle, bez blokowania podglądu eksportu.
- Podgląd nadal używa dokładnie tych samych wartości co integracja HACS. Nie zmieniono prognozy ani archiwum; ponowny import nie jest potrzebny.
- Uaktualniono pełną instrukcję.

# 0.7.5

- Dodano „PV Lab a panel Energia”: wykres i tabelę tych samych pełnych godzin w kWh, z różnicą, wersją, momentem zapisu i przyczyną.
- Podgląd korzysta z dokładnie tego samego eksportera co integracja, bez przeliczania lub nadpisywania archiwum.
- Dodano odczyt prognozy po stronie Home Assistant, kontrolę zgodności i ostrzeżenia o sumowaniu źródeł.
- Wyjaśniono agregację kwadransów, pozycje punktów oraz dymki HA i uzupełniono pełną instrukcję.

# 0.7.4

- Dodano wykres profilu bazy domu używanego w bieżącej symulacji optymalizatora, nad tabelą kwadransów. Podgląd pokazuje moc, energię, źródło i liczbę dni; linia odniesienia wskazuje rezerwę.
- Poprawiono datę ostatniej obserwacji dla historii godzinowej i opis jednostki niezgodności starszych importów statystyk.
- Uzupełniono pełną instrukcję. Zmiany prezentacji nie wymagają ponownego importu historii i nie zmieniają prognozy PV.

# 0.7.3

- Pełna instrukcja wszystkich modułów: obliczenia, interpretacja tabel, wpływ na wynik, retencja i diagnostyka. Instrukcja HTML w menu i kontrola aktualności przed wydaniem.
- Przeliczenie optymalizatora ponawia odczyt HA; panel pokazuje przyczynę braków oraz źródło bieżącej mocy.
- Moc domu może być odtworzona z PV i mocy sieci z prawidłowym znakiem importu/eksportu.
- Import bazy pokazuje postęp, puste dni, brakujące encje i rzeczywiste wykorzystanie historii w kwadransach.
- Dodano wieloletnią rekonstrukcję godzinowej bazy ze statystyk energii HA; brak energii odejmowanych urządzeń nie jest traktowany jako zero.

# 0.7.2

- Usunięto limit ośmiu kwadransów w „Skąd bierze się wynik”. Rozbicie obejmuje wszystkie dostępne przyszłe przedziały wybranego dnia, w tym południe i popołudnie.
- Doprecyzowano nazwę i opis widoku. Obliczenia prognozy i ryzyka pozostają zgodne z 0.7.1.

# 0.7.1

- Kwalifikowanie historii: wysokie napięcie przy poprawnej produkcji i statusie jest ostrzeżeniem, a nie powodem odrzucenia. Błędy statusu, przestoje, luki i skoki nadal wyłączają uczenie potencjału.
- Automatyczne przekwalifikowanie zapisanych kwadransów i godzin z InfluxDB; zachowano pomiary oraz dawne raporty prognoz.
- Końcowa prognoza PV uwzględnia empiryczne ryzyko przestojów według mocy, pory dnia, sezonu i rodzaju dnia. Bez powtarzalnych przesłanek przestoju nie ma potrącenia za sam próg 253 V.
- Jedna prognoza po korekcie trafia do encji HA, Energii i optymalizatora. Panel pokazuje energię przed ryzykiem, wynik końcowy i redukcję; pary ocen zapisane przed produkcją pozwalają sprawdzić skuteczność.
- Domyślne ceny użytkownika: 1,30 / 0,68 PLN/kWh i pozostałe opłaty zero. RCEm 439,78 PLN/MWh (0,43978 PLN/kWh).
- Obsługa liczb z przecinkiem, dokładniejsze komunikaty błędów, wybór jednostki ręcznej RCEm PLN/MWh lub PLN/kWh z przeliczeniem.
- Depozyt domyślnie wyłączony. Parametry RCEm i współczynnika pojawiają się po włączeniu wartości eksportu.

# 0.7.0

- Nowy moduł „Optymalizator zużycia energii” korzystający ze wspólnej prognozy PV Lab, profili urządzeń i bilansowania.
- Konfigurowalne ceny brutto, składniki dystrybucji, sezonowe strefy G12w, weekendy, polskie święta i wersje cenników.
- Miesięczna RCEm i prognozy cen z encji lub ręcznie; jawny koszt utraconego eksportu. Bez symulowania salda depozytu.
- Porównanie wszystkich dostępnych startów co 15 minut: najtaniej, największy udział PV oraz rekomendacja z analizą wrażliwości.
- Wspólny harmonogram do 8 urządzeń: rezerwacja nadwyżek, priorytety, godziny pracy, terminy i limit importu. Heurystyka bez gwarancji globalnego minimum.
- Import oczyszczonego profilu domu z HA/InfluxDB oraz jego bieżące uzupełnianie; brakujące urządzenia nie są traktowane jak zerowy pobór.
- Zapis planu i późniejsze porównanie z pomiarami mocy przy zapisanych stawkach. Weryfikacja wymaga potwierdzenia wykonania; nie odtwarza realnego cyklu z planu.
- Nowe encje rekomendacji w integracji HA. Tryb wyłącznie analityczny — brak sterowania urządzeniami.

# 0.6.3

- Analiza przestojów z InfluxDB dla wybranego dnia: napięcia, statusy, moc i luki pomiarów.
- Osobne oznaczenia ostrzeżeń napięciowych i prawdopodobnych przestojów; wysokie napięcie samo nie oznacza wyłączenia.
- Trwały raport do pobrania bez zapisu surowej historii napięć. Analiza diagnostyczna nie zmienia jeszcze prognozy.

# 0.6.2

- Rozdzielono widoczną referencję historyczną od zgody na korygowanie prognozy.
- Statystyczny profil poprawnych godzin może odtworzyć powtarzalne niedobory poniżej 60% modelu, bez uznawania ich za potwierdzoną pogodę.
- Korekta statystyczna wymaga liczebności, powtarzalności między sezonami i wystarczającego udziału poprawnych obserwacji; jej wpływ jest dodatkowo ograniczony.
- Tabela pokazuje metodę, liczbę potwierdzeń, udział poprawnych dni i konkretne powody blokady korekty.
- Zsynchronizowano historię zmian aplikacji, integracji i repozytorium. Publikacja sprawdza ich zgodność i umieszcza bieżące zmiany w opisie wydania.
- Nie trzeba ponownie importować danych. Nie zmieniono historycznych pomiarów, ustawień jakości, raportów ani trwałego archiwum Energii.

# 0.6.1

- Poprawiono kwalifikację referencji historycznej: pojedyncza zła godzina i brak zapisów nocnych nie wykluczają całego dnia.
- Stabilne fragmenty co najmniej trzech kolejnych godzin mogą zasilać profil z ograniczoną wagą i wpływem.
- Dodano liczebność referencji, informacje o fragmentach, czas przeliczenia i edytowalne progi.
- Istniejąca historia jest wykorzystywana po restarcie bez ponownego importu.

# 0.6.0

- Import wieloletniej produkcji, napięć/statusów jako flag jakości i optymalizatorów z istniejącej bazy InfluxDB.
- Profile godzinowe i sezonowe oraz historyczne porównania paneli bez duplikowania godzin HA.
- Nowy panel importu, postęp, zatrzymywanie, ponowne odczyty i automatyczne uzupełnianie po zakończonym imporcie.
- Odczyt archiwów Solcast/Open-Meteo do porównań opisowych, bez udawania znanego czasu wydania prognozy.
- Opis HACS z README.md; aktualna dokumentacja i zachowane trwałe archiwum Energii.

# 0.5.4

- Trwałe archiwum godzinowych prognoz dla panelu Energia, bez automatycznego kasowania.
- Odzyskanie dostępnych prognoz z dzienników oraz przekazywanie historii przez integrację.
- Historia pozostaje dostępna przy braku bieżącej prognozy.

# 0.5.1

- Automatyczne numerowane wydania dla HACS bez zewnętrznych Actions.
- Profile z historii urządzeń: potwierdzanie cykli, trzy warianty i korekta ręczna.
- Planowanie według faz pracy i dwa wybory profilu w HA.
- Zachowanie funkcji i danych 0.3.0.

[Instrukcja](UPDATE-0.5.1.md).
