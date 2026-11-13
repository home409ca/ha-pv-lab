# PV Lab 0.5.4

Poprawiono brak minionych prognoz w panelu Energia. Osobne archiwum prognoz godzinowych nie ma automatycznej retencji. Dostępna historia zostanie odzyskana z zachowanych dzienników; starszych brakujących prognoz nie można odtworzyć.

Wgraj zawartość paczki do głównego katalogu repozytorium, zachowując strukturę. Nie trzeba nic usuwać. Po zakończeniu publikacji zaktualizuj dodatek oraz integrację PV Lab w HACS, uruchom ponownie HA i odśwież panel Energia.

Archiwum: /data/energy-forecast-archive.json. Dostępne w plikach aplikacji i eksporcie kopii. Prognoza zakończonej godziny to ostatnia kompletna wersja znana przed jej początkiem. Nie jest później przeliczana według nowego modelu.

## Numer wersji w HACS

Paczka zawiera również `.github/workflows/release.yml` — wgraj ten ukryty katalog. Zadanie publikacji musi zakończyć się pomyślnie. W jego podsumowaniu pojawi się numer wersji i odnośnik do wydania. Samo wgranie manifestu z numerem wersji nie zastępuje publikacji Release.

Sprawdź w GitHub → Releases, czy istnieje opublikowane (nie Draft) wydanie v0.5.4. Następnie w HACS otwórz PV Lab → menu → odśwież informacje („Redownload”/ponowne pobranie służy instalacji, nie odświeżeniu informacji). Jeśli HACS nadal oferuje commit, sprawdź wynik zadania w Actions oraz czy HACS wskazuje to samo repozytorium. Nie usuwaj integracji ani jej ustawień.
