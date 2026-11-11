# Weryfikacja PV Lab 0.4.0

- 82 testy Node: wcześniejszy silnik, raporty i saldo oraz nowe profile cykli, fazy poboru, jednostki W/kW, niepełne cykle, braki danych, reset licznika dziennego, warianty i ręczna korekta.
- Test HTTP przechodzi przez uruchomioną aplikację i symulowany HA: import historii, zapis profilu, wybór w planie, powrót do trybu ręcznego i usunięcie aktywnego profilu. Surowe stany nie trafiają do zapisanego pliku.
- 20 testów Python: encje HA, wybór profilu/wariantu, metadane, paczki oraz publikacja wydania z atrapą API GitHub. Test opcjonalnej lokalnej paczki HACS może być pomijany w samym repozytorium na runnerze.
- Publikacja: testy sprawdzają dokładny commit, zgodność numerów, brak zewnętrznych Actions, składnię kodu bootstrap, szkic/załącznik/publikację metodą PATCH, ponowienie szkicu, nieprzepisywanie istniejących wydań i odmowę starszej wersji jako latest.
- Przeglądarka: demonstracyjna lista cykli, wykres 5-minutowy, zmiana wariantu i wybór profilu w formularzu planowania.

Nie wykonano publikacji w prawdziwym repozytorium, instalacji Docker ani testu na działającym HA użytkownika. Skrypt release.py --dry-run uruchamia testy i pakowanie bez zapisu do GitHub. Prawdziwy workflow uruchomi się po przesłaniu plików. Progi końca cyklu i rozbieżności licznika należy sprawdzić na własnej historii.
