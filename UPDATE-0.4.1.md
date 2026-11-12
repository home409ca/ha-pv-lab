# PV Lab 0.5.0

Wgraj całą zawartość ZIP do katalogu głównego repozytorium GitHub, łącznie z .github oraz scripts. Nie wgrywaj nadrzędnego katalogu. Zrób to jednym zatwierdzeniem. Po pomyślnym zakończeniu Actions pojawi się wydanie v0.5.0 i numer w HACS. Zaktualizuj aplikację oraz integrację HACS, następnie uruchom ponownie Home Assistant. W telefonie odśwież widok aplikacji.

- Poprawiony ukryty baner demonstracyjny na telefonach i usuwanie parametru demonstracji po powrocie do rzeczywistych danych.
- Wykresy: pionowy wskaźnik, czas i wartości widocznych serii; mysz i dotyk. Prognozy pokazują też energię pełnej godziny. Braki pozostają brakami.
- Domyślny wykres i nowe raporty dostawców uwzględniają limit falownika co kwadrans (5500 W = 1375 Wh). Oryginały pozostają do diagnostyki. Starsze raporty są w osobnym archiwum metody, bez mieszania rankingu; ostatnie prognozy są odczytywane wyłącznie z zapisów znanych przed produkcją.
- Bilans: dla wskazanej instalacji poprawione znaczenie niezależnych liczników poboru/oddania. Saldo godzinowe ma pierwszeństwo i nie jest bilansowane ponownie. Jednorazowa migracja dotyczy tylko dokładnie wskazanych trzech encji; pozostałe konfiguracje pozostają zgodne z wyborem użytkownika. Zmiana nie zeruje kalibracji.
- Profile: kolejne odczyty dołączają cykle bez powtórzeń; biblioteka do 2000 cykli na urządzenie, maksymalnie 30 dni historii w jednym odczycie. Wykryte cykle można grupować w różne programy i zapisywać jako nowe profile lub aktualizować istniejący profil tego samego urządzenia. Zmiana encji/progów rozpoczyna nową listę analizy, zachowując zapisane profile.
- Ustawienia: dodawanie i usuwanie urządzeń z formularza, encja mocy i opcjonalny licznik energii. Dla pracy ciągłej (np. pompy ciepła) stałe okna obserwacji 15–1440 minut zamiast udawania rozpoznanych programów. Przesuwalność pracy wymaga oceny użytkownika; aplikacja nie steruje ogrzewaniem.

Dane: pliki JSON w /data; appliance-profiles.json przechowuje cykle i profile bez surowej historii HA. Dotychczasowe raporty zachowane w reports.json jako legacy, dostępne w wyborze metody w zakładce raportów. Szczegółowa historia mocy musi być nadal dostępna w Recorder HA. Nazwy programów nadajesz ręcznie.
