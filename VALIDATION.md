# Weryfikacja PV Lab 0.3.0

- 75 testów Node: dotychczasowe adaptery i kalibracja, raporty, planowanie, zmiana czasu, nocne zachowanie i uruchomiona aplikacja z symulowanym HA.
- 14 testów Python: kontrakt sensorów, metadane i pakowanie HACS, odczyt/zapis pól planu oraz dostępność sensorów dat po zmroku. Interfejsy HA dla nowych encji są zastępowane minimalnymi atrapami — to nie pełny runtime HA.
- Przeglądarka: demonstracja tabeli godzinowej/dobowej/miesięcznej/rocznej, przełączanie trybów, formularz planowania i prezentacja rekomendacji.
- Testy godzinowego salda: plus eksport, brak przenoszenia do następnej godziny, niewykorzystywanie już zbilansowanych liczników do salda kwadransowego, braki danych i niezależne oszacowanie poboru fizycznego.
- Testy archiwum: odcięcie o 20:00, zakaz użycia późniejszych prognoz, wspólne kohorty, błędy godzinowe nieznikające przy zgodnej sumie dobowej, 25-godzinna doba i idempotentne przenoszenie do miesięcy/lat.
- Test HTTP: autoryzowane zapisy planu przez osobny endpoint, odmowa innych pól i błędnego klucza, zachowanie eksportu bez sekretów i brak resetowania modelu przez samą zmianę retencji.

Nie wykonano budowy Docker ani instalacji na rzeczywistym HA użytkownika. Dokładność licznika salda i opóźnienie jego resetu wymagają sprawdzenia po instalacji. Rekomendacja jest szacunkiem energetycznym opartym na średniej mocy, a nie pomiarem sekundowego profilu urządzenia czy wyceną faktury.
