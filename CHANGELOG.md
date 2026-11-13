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
