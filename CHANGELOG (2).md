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
