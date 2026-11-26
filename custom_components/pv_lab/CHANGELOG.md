# 0.10.0

Auto jednorazowe wraca do pustej karty po potwierdzonym zakończeniu cykli. Drugie kliknięcie włącza czerwone Auto ciągłe: bezterminowo reaguje na nowe wyłączenie switcha, planując wyłącznie w dniu zdarzenia. Trzecie kliknięcie wyłącza Auto. Oba aktywne tryby blokują szare przyciski dni. Dodano obserwację rzeczywistego startu i końca, automatyczną weryfikację kosztu/PV oraz ocenę przesunięcia tego samego planu po fakcie. Czasowe ograniczenie dostępności paneli (np. śnieg) wpływa na końcową prognozę, z terminem wygaśnięcia i sygnałem niskiej produkcji.

# 0.9.7

Wcześniejsza historia mocy potwierdza bezczynność bez ponownego czekania 20 minut. Niezmienione 0 W w początkowym wpisie HA uwzględnia czas ostatniej zmiany stanu, nie późniejszego odświeżenia atrybutów. Ponowienie niepełnego odczytu przy niskiej mocy najwyżej raz na minutę. Zawiera również poprawki komunikatów i pozornych zer z 0.9.6.

# 0.9.6

Wyjaśnienie blokady planu podczas potwierdzania bezczynności urządzeń: rzeczywisty czas blokady i wpływ bilansowania godzinowego. Niedostępne warianty nie pokazują fikcyjnych 0 zł/0 kWh ani wykresu bez cyklu. Zachowane zabezpieczenia wykrywania pracy i zapisane plany.

# 0.9.5

Ukrywanie minionych wariantów taniej strefy i szczytu PV. Jeśli okno jeszcze trwa, porównanie liczy nowy start od najbliższego kwadransa po teraz; po końcu okna znika z karty. Zatwierdzony plan pozostaje widoczny. Bez zmiany zapisanych godzin, historii i zasad kosztu.

# 0.9.4

Karta: wspólny ranking kosztów również dla porównań taryfy i szczytu, objaśnienie 0% pokrycia PV, brak domyślnie wybranych urządzeń (YAML default_cycles), tylko nazwane programy z preferowanym wariantem oraz wykres w szczegółach przed zatwierdzeniem, z osią kWh i pełnym horyzontem.

# 0.9.3

- Profile: rzeczywisty krok 5 minut bez dopisywania zer do kwadransa. Średni wariant zachowuje średnią energię i średni czas źródeł, z ograniczeniem szczytu do zaobserwowanej mocy.
- Oddzielne nazwy programów i urządzeń: pralka i zmywarka mogą mieć własny profil „60 min”. Dodano zapis domyślnego wariantu oraz profilu podstawowego urządzenia.
- Karta: uproszczony wykres zatwierdzenia domyślnie włączony, opcjonalna nazwa programu w nawiasie przy urządzeniu i wybór z rozwijanej sekcji. Brakujący profil przed zatwierdzeniem zastępuje profil podstawowy lub pierwszy pasujący; już uzbrojony plan zachowuje zapisany program.
- Biblioteka cykli: brak automatycznego kasowania po imporcie, zmianie progów lub wygaśnięciu Recordera; ręczne usuwanie zaznaczonych cykli nie zmienia zapisanych profili. Długa lista jest wyświetlana po 200 pozycji.
- Starsze profile uczone są przebudowywane, gdy pozostały wszystkie cykle źródłowe. Zachowujemy kopię biblioteki sprzed poprawki oraz dotychczasowe identyfikatory, nazwy, ustawienia i historię.

# 0.9.2

- Karta: przyciski programów pod urządzeniami, własne profile jako pierwsze oraz warianty Typowy / Średni / Największy. Konfigurowalne położenie, widoczność, lista lub przyciski oraz osobne przełączniki czasu i kWh. Wybór działa również w Auto i nie nadpisuje ustawień aplikacji.
- Skrócono nazwy porównań do „Start tania strefa” i „Start szczyt PV”. Zawsze pozostają na rozwijanej liście karty, niezależnie od limitu głównych propozycji.
- Identyczne całe harmonogramy pokazujemy raz, pod nazwą porównania. Zatwierdzony wariant zachowuje swoją tożsamość. Dwa identyczne porównania mają wspólną nazwę.
- Zatwierdzenie odczytuje aktualne stany HA i używa tych samych profili co wybrana propozycja. Ujednolicono konserwatywne okresy dostępności planera i zatwierdzania; niepewność uwzględniona już przy obliczeniu nie odrzuca automatycznie przyszłego terminu.
- Faktyczna kolizja lub utrata danych nadal blokuje zatwierdzenie, z nazwą urządzenia i konkretną przyczyną. Nie przesuwamy po cichu wybranych godzin.
- Dodano kompletny przykład YAML i zaktualizowano instrukcję. Dane, ceny, ustawienia i historia pozostają zachowane.

# 0.9.1

- Karta: szczyt PV i początek dziennej taniej strefy jako dodatkowe rozwijane warianty, opcjonalny wykres zatwierdzonego planu i konfigurowalne niższe przyciski oraz kolory.
- Auto: 10 minut na przygotowanie urządzeń, potem świeży odczyt wyłączonych switchy; trwałe odliczanie, anulowanie i ponowienie po chwilowej utracie połączenia.
- Kłódki: czerwony → niebieski → zielony, z krótkim opisem końca planu. Aplikacja pokazuje ostatni harmonogram i porównanie kosztów ostatniej kontroli.
- Ograniczono przebudowy karty i zbędne pełne odczyty po kliknięciach. Kliknięcie karty nie odsuwa okresowego odczytu prognozy HA.
- Czujniki pracy zachowują ostatni potwierdzony stan, jawnie oznaczając jego nieświeżość. Potwierdzony wyłączony switch pozwala rozpoznać bezczynność bez pomiaru mocy.
- Wykres zużycia domu uwzględnia pozostały profil ręcznie uruchomionych cykli, zgodnie z obliczeniami planera; niepewny stan nie tworzy fikcyjnej nadwyżki PV.

# 0.9.0

Zatwierdzanie na karcie uzbraja zapisane w HA polecenia switch.turn_on dla każdego cyklu. Trzy tryby: stałe godziny, elastyczny, elastyczny bez późniejszego końca. Kontrola co 30 minut, wspólna aktualna wycena, próg poprawy i blokada ostatnich 15 minut. Auto tworzy i zatwierdza jedną partię po jednym cyklu urządzeń z wyłączonym switchem. Konfigurowalne encje switch, lokalna historia prób, odporność na restart i anulowanie także bez aplikacji. Starsze zatwierdzenia nie są automatycznie uzbrajane; stara karta musi zostać odświeżona. Silnik prognozy i Gemini bez zmian.

# 0.8.16

Zmywarka jest pierwszym urządzeniem w aplikacji i na karcie. Domyślny wybór to jeden cykl dziś; jutro wybieramy, gdy dzisiejsze poprawne okna wymagają zakupu całej energii lub cykl już się nie zmieści. Brak prognozy nie udaje zera. Profile i ograniczenia pozostają zachowane. Przyspieszono przygotowanie historii domu i usunięto powtarzane oceny tych samych startów; bez ograniczania liczby alternatyw ani zmiany kosztów. Karta wykorzystuje świeży odczyt HA zamiast wymuszać ponowny import historii urządzeń. Moduł Gemini pozostaje bez zmian.

# 0.8.15

Karta HA rozróżnia wybór dnia od działania: Dziś/Jutro mają neutralne tło, po wybraniu delikatne niebieskie podświetlenie i obramowanie. Zaplanuj zachowuje pełny kolor akcji z motywu HA. Zmiana obejmuje układ kompaktowy i pełny; obliczenia, ustawienia i moduł Gemini pozostają bez zmian.

# 0.8.14

Domyślny kompaktowy widok karty HA, nagłówek zmieniany/ukrywany w YAML, wspólny wiersz Dziś/Jutro/Zaplanuj i mniejsze odstępy. Opcje layout, title, show_header, max_plans, show_energy_bar, show_details. Opcjonalny moduł Analiza AI z Gemini: ręczny podgląd wysyłanych podsumowań, limit wywołań i klucz przechowywany wyłącznie po stronie serwera. AI nie zmienia obliczeń ani nie steruje urządzeniami.

# 0.8.13

Karta HA pokazuje jeden polecany plan; strzałka rozwija pozostałe, zielona przy pełnym pokryciu wszystkich ukrytych planów przez PV/bilans, pomarańczowa przy koniecznym zakupie. W aplikacji dodatkowo porównujemy start w dziennej taniej strefie według konfiguracji taryfy oraz początek godziny największej prognozowanej produkcji PV. Ograniczenia czasu, sprzętu i kompletność danych są zachowane.

# 0.8.12

Karta HA wybiera do trzech pełnych harmonogramów z udziałem PV lub bilansu, filtrując przed ograniczeniem listy. Gdy takich planów nie znaleziono, pokazuje jeden najtańszy znaleziony i najwcześniejszy przy tej samej cenie. Pełne porównanie kosztów pozostaje w PV Lab. Dla jednego urządzenia sprawdzane są wszystkie dopuszczalne starty co 15 minut. Zatwierdzenie zapisuje dokładnie wybraną propozycję. Historia, taryfa i ustawienia pozostają zachowane.

# 0.8.11

Karta HA i PV Lab używają tej samej listy różnorodnych harmonogramów i wspólnego wyniku obliczeń przy tych samych ustawieniach. Karta pokazuje pierwsze trzy plany, aplikacja dalsze alternatywy. Usunięto odmienny ranking i dodatkowy bufor startu karty. Wybór cykli przechodzi 0–1–2–3–0; aktywne urządzenie jest zielone, liczba ma mały zapis bez plakietki. Zatwierdzanie jest w nagłówku, godziny przy nazwach cykli, szczegóły pod przyciskiem ?. Dane i ustawienia zachowane.

# 0.8.10

Planowanie zużycia: przyciski liczby cykli 0–3, jedna główna rekomendacja według szacowanego kosztu z PV i bilansowaniem. Różne propozycje są uporządkowane według kryterium; do 5 gr dopłaty preferowany jest zapas PV, potem niższy koszt wariantu z mniej korzystną pogodą. Kolumna Koszt przy innej pogodzie pozostaje z objaśnieniem. Rozwinięcie do 10 jest dostępne także w porównaniu PV. Karta HA ma dwa dni do zaznaczenia, liczniki urządzeń i krótkie propozycje bez wyboru celu. Historia i ustawienia zachowane.

# 0.8.9

Naprawa kompletności aktualizacji: pakiet naprawczy uzupełnia również moduł schedule-alternatives.mjs z 0.8.7. Kontrola wydania wykrywa brakujące lokalne importy przed pakowaniem. Plik karty dashboardu rejestrujemy przed pierwszym połączeniem z aplikacją, więc chwilowa awaria aplikacji nie blokuje jego udostępniania. Obliczenia, dane i ustawienia pozostają bez zmian.

# 0.8.8

- Natywna karta HA Zaplanuj uruchomienie: liczby prań i zmywań, daty, PV/koszt oraz 3 najlepsze znalezione wspólne harmonogramy. Jawne zatwierdzenie i anulowanie, flaga zatwierdzenia i osobne terminy cykli do późniejszych automatyzacji; bez fizycznego sterowania gniazdkami.
- Integracja HACS: Pralka pracuje i Zmywarka pracuje jako binary_sensor z ikonami, atrybutami początku/końca oraz prawidłową niedostępnością przy braku danych, także niezależnie od nocnej prognozy PV.
- Planowanie zużycia na telefonie: karty urządzeń zamiast szerokiego formularza, czytelne zaznaczenie celu i dat, większe pola oraz harmonogramy jako karty z podpisanymi wartościami.
- Początek całego harmonogramu obok końca w obu analizach.
- Bieżąca praca pralki i zmywarki rozpoznawana z istniejących encji mocy oraz krótkiej historii; widoczny start, szacowany koniec, pauzy i brak danych. Bez automatycznego sterowania i bez wymagania nowych encji HA.
- Trwający cykl blokuje kolejne uruchomienia tego samego fizycznego urządzenia. Jego pozostałe zużycie jest dodawane raz do oczyszczonego bilansu domu, poza nowymi cyklami wybranymi w planie.
- Kompaktowy stan detektora przetrwa restart; brak danych nie staje się zerowym zużyciem. Prognoza końca cyklu jest jawnym oszacowaniem, a przekroczony czas wydłuża blokadę.
- Zaktualizowana instrukcja oraz testy pauz, restartów, blokady sprzętu i wspólnego bilansowania trwających cykli.

# 0.8.7

- Planowanie zużycia: domyślnie pięć propozycji oraz przycisk Pokaż do 10; rozwinięcie korzysta z gotowych wyników, bez ponownego wyszukiwania.
- Pierwszy harmonogram pozostaje najlepszy według wybranego celu. Alternatywy dobieramy także według końca pracy, późniejszego startu, zapasu PV i innej kolejności urządzeń, z czytelnym opisem wariantu.
- Pomijamy fizyczne duplikaty i niemal identyczne przesunięcia; gdy pełnych, wyraźnie różnych propozycji jest mniej, lista nie jest sztucznie uzupełniana. Niepełne plany nie wypierają pełnych.
- Koszty G12w, bilansowanie, profile, terminy urządzeń i zapis wybranego wariantu pozostają zachowane. Starty nadal co 15 minut, profile w krokach 5 minut.
- Zaktualizowana instrukcja, testy różnorodności, limitu listy, zachowania najlepszego planu i krótkich okien.

# 0.8.6

- Jeden moduł Planowanie zużycia: wspólny zakres dat, lista cykli, profile, zużycie domu i bilans; równoległa analiza wykorzystania PV oraz kosztu według zachowanej taryfy.
- Szybkie daty Dziś, Jutro, Dziś i jutro oraz zakres własny; terminy zakończenia wszystkich cykli danego urządzenia, opcjonalnie z konkretną datą.
- Różne kolejności i godziny startu, poprawki harmonogramu, do trzech różnych wariantów każdego celu. Te same fizyczne urządzenia nie pracują równocześnie, różne mogą.
- Przy zerowym dodatkowym imporcie i remisie celu wybierany jest większy margines nadwyżki w okresach pracy. Pokazujemy margines i godzinę zakończenia całego wariantu.
- Osobne, trwałe ustawienia wspólnego planu; dawne ustawienia, profile, historia, ceny, importy oraz zapisane plany pozostają zachowane. Przycisk zapisu utrwala dokładnie wybrany wariant.
- Uaktualniona pełna instrukcja, testy zakresów i zmiany czasu, terminów urządzeń, wariantów, wspólnego bilansu i zgodności HTTP.

# 0.8.5

- Bezstratna kompresja istniejących i nowych dzienników prognoz; te same rekordy, czasy wydań i ustawienia retencji. Kopia JSON.gz i zwykły JSON, rozpakowany podgląd i pobieranie plików.
- Ostrożniejsza prognoza na jutro wybrana w retrospektywnym teście kolejnych dni: niższa prognoza lepszego wcześniej dostawcy może obniżyć wynik PV Lab z udziałem 50%. Warunek pełnych wcześniejszych dni, bez danych z dnia wydania i dnia prognozy. Wyłącznik i parametry w ustawieniach.
- Nowe zapisy zachowują wynik przed korektą na jutro do późniejszej oceny. Stare prognozy i archiwum Energii pozostają bez zmian.
- Rzeczywista produkcja w tabeli godzinowej; kolorowanie najlepszych i najsłabszych zapisanych prognoz. Bieżąca godzina jest częściowa i nie jest oceniana.
- Naprawiono planowanie późniejszych dat: horyzont dopasowany do zakresu, do 7 dni, z opisem braku okna. Nie scala to automatycznie ustawień Planowania i Optymalizatora.
- Opcjonalne linie bazy domu i nadwyżki pozostają domyślnie wyłączone.

# 0.8.4

- Wspólne porównanie prognozy na jutro i aktualizowanej w ciągu dnia. Ocena ryzyka: zawyżenie 100%, niedoszacowanie domyślnie 50%, obok zwykłego błędu.
- Poprawione błędy dobowe w widoku godzinowym: kompletne podsumowania dni zamiast sztucznego zera pełnych dób.
- Wspólny plan wielu cykli urządzeń: blokada nakładania pracy tego samego sprzętu, równoległa praca różnego sprzętu i jedna pula bilansowania.
- Domyślny zakres na dziś, pobór fizyczny, pokrycie bilansem i dodatkowa energia do rozliczenia pokazane osobno.
- Zachowane opcjonalne linie bazy domu i nadwyżki, domyślnie wyłączone. Historia i wcześniejsze prognozy pozostają bez zmian.

# 0.8.3

- Osobne mapy paneli PV1 i PV2 według schematu instalacji, z przerwami między panelami.
- Edycja układu: przeciąganie myszą i dotykiem, strzałki, pola położenia, obrót i zamiana numerów w obrębie połaci.
- Zapis układu w osobnym pliku, bez restartu kalibracji, zmiany prognozy lub usuwania historii.
- Zachowane opcjonalne linie zużycia domu i nadwyżki, domyślnie wyłączone.

# 0.8.2

- Godzinowe wykresy kWh pokazują zakresy 09–10, 10–11 zamiast czasu środka przedziału.
- Dodano osobny pusty znacznik i podświetlenie trwającej godziny oraz komunikat „Wyprodukowano dotychczas” z czasem i źródłem pomiaru.
- Bieżąca energia pochodzi z różnicy liczników AC albo poprawnej całki mocy. Brak pomiarów nie jest zerem; niepełna godzina nie jest dopełniana prognozą.
- Pełne godziny, archiwum, prognozy i rozliczenia zachowują swoje znaczenie. Linie domu i nadwyżki pozostają domyślnie wyłączone.
- Zaktualizowano instrukcję i dodano testy granic godzin, braków, resetów liczników oraz zmiany czasu.

# 0.8.1

- Wprowadzono kwalifikowany godzinowy limit poziomu po normalizacji, z edytowalnym marginesem, bezpiecznikiem i możliwością powrotu do dawnej korekty. Nie zmieniamy starych raportów.
- Główny wykres pokazuje minione dni oraz plan wieczorny lub prognozy zapisane przed kolejnymi godzinami. Raporty mają wykresy i porównanie błędów, Historia i trendy — przebieg miesięczny, a historia zmian — przebieg kolejnych wydań.
- Pomiary kWh ponawiamy co 2 minuty; błędy nie blokują odczytu na godzinę. „Odczytaj dane” wymusza odczyt dostępnych danych HA; raport ma osobne odświeżenie kWh.
- Pliki i retencja: łączny rozmiar kodu i danych, osobne rozmiary oraz pobieranie całych pojedynczych plików. Prywatna konfiguracja nadal chroniona.
- Linie domu i nadwyżki pozostają domyślnie wyłączone. Instrukcja i testy zostały zaktualizowane.

# 0.8.0

- Audyt stabilności, danych, rozliczeń oraz głównych widoków; bez nowych zależności i usuwania danych.
- Naprawiono kolizje równoczesnych zapisów JSON i nadpisywanie własnego cennika przez migrację starszych ustawień.
- Brak pomiaru nie jest zerem: odrzucono puste teksty i niepoprawne moce; dodano czytelny błąd niepoprawnej odpowiedzi HA.
- Naprawiono pamięć podręczną ryzyka sieci: słaby lub zakończony kwadrans nie przejmuje potrącenia innego przedziału.
- Uproszczono Prognozy i Optymalizator: wykresy, okna i wspólny harmonogram przed szczegółami; zaawansowane sekcje są rozwijane. Linie domu i nadwyżki są nadal domyślnie wyłączone.
- Przyspieszono grupowanie kroków symulacji bez zmiany wyników; usunięto martwe instrukcje i powtórzone opisy źródeł w dymkach.
- Dodano testy regresji, sprawdzenie kopii użytkownika i raport audytu. Pełna instrukcja jest zaktualizowana.

# 0.7.9

- Naprawiono włączanie linii zużycia domu i nadwyżki: kliknięcie w widoku W automatycznie przełącza na kWh. Pola nie są już zablokowane.
- Linie pozostają domyślnie wyłączone. Zaktualizowano instrukcję; algorytm prognozy pozostaje bez zmian.

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
