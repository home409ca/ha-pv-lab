# PV Lab 0.8.8

Tylko zmienione pliki od 0.8.7. Wgraj rozpakowaną zawartość do głównego katalogu repozytorium z zachowaniem podkatalogów i zaktualizuj aplikację w HA. Niczego nie usuwaj; import lat historii nie jest potrzebny.

Planowanie zużycia na telefonie ma karty urządzeń i harmonogramów, większe pola i czytelne zaznaczenia. Obie analizy pokazują początek i koniec całego planu.

Urządzenia teraz korzystają z istniejących encji mocy pralki i zmywarki oraz krótkiej historii HA. Widać start, szacowany koniec, stan pracy i blokadę kolejnego uruchomienia. Wybrane w formularzu cykle to kolejne uruchomienia — trwający cykl jest osobno uwzględniony w energii i zajętości sprzętu. Sam szacowany koniec nie zwalnia pracującego urządzenia.

Po aktualizacji integracji w HACS i przeładowaniu integracji lub restarcie HA pojawią się encje Pralka pracuje oraz Zmywarka pracuje z ikonami. Nie trzeba tworzyć ich ręcznie; stany i atrybuty pochodzą z tego samego detektora co planer. Zapisane encje i progi znajdziesz w Ustawienia → Urządzenia do analizy profilu. Czas ciszy kończącej cykl wynosi domyślnie 20 minut; krótsza przerwa to nadal możliwa pauza. Program włączony na urządzeniu nie jest potwierdzony, więc czas zakończenia pozostaje oszacowaniem. Przy brakach danych aplikacja pokazuje niepewność i pomija niepewne najbliższe okresy. Odczytaj dane i przelicz ponawia także odczyt krótkiej historii.

Ustawienia, biblioteka, historia i ceny pozostają zachowane. Nowy appliance-live.json zawiera mały stan detektora, a nie pełną kopię Recorder.

## Karta dashboardu HA

Po aktualizacji HACS i restarcie HA odśwież dashboard. Dodaj kartę Zaplanuj uruchomienie lub użyj type: custom:pv-lab-plan-card. Karta wybiera liczby prań/zmywań i daty, pokazuje trzy najlepsze znalezione plany oraz pozwala zatwierdzić jeden. Zatwierdzenie publikuje flagę i osobne terminy cykli do przyszłych automatyzacji; gniazdka nie są jeszcze sterowane. Opis: DASHBOARD-CARD.md.
