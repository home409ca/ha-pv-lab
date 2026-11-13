# PV Lab 0.5.3 — aktualizacja z 0.5.2

Wgraj zawartość ZIP do głównego katalogu istniejącego repozytorium jednym zatwierdzeniem. Paczka zawiera tylko zmienione i nowe pliki, z zachowaniem struktury. Nie trzeba niczego usuwać ani ponownie importować danych. Po poprawnym zakończeniu Actions zaktualizuj aplikację i integrację HACS, a następnie otwórz PV Lab ponownie.

- Rozwinięte szczegóły raportów pozostają otwarte po automatycznym odświeżeniu co 15 sekund oraz po ponownym odczycie. Stan jest przypisany do konkretnego okresu i wariantu raportu, a nie numeru wiersza. Zamknięcie szczegółów jest respektowane. Otwarte objaśnienia tabel i rozbicia prognoz również są zachowywane podczas odświeżania bieżącej karty.
- W szczegółach braku wariantu nie opisujemy już jako „błąd — · zapis brak”. Pokazujemy wprost, że wariantu wcześniej nie zapisano i jego błędu nie można wyliczyć. Nie uzupełniamy go późniejszym modelem.
- Dwie pozycje PV Lab to prognoza przed profilem historycznym i wynik końcowy po profilu. Dostawcy są pokazani pojedynczo jako ich własne prognozy. Dodałem ten opis przy szczegółach.
- „statystyki HA” oznacza źródło rzeczywistej energii, a 20:00 — godzinę graniczną zapisania prognozy na następny dzień. Opisy są teraz rozdzielone.
- Komunikaty o statusie falownika, braku mocy lub niepełnym przedziale dotyczą próbek mocy/statusu. Jeśli energia wiersza pochodzi ze statystyk HA, taki komunikat nie oznacza automatycznie braku przyrostu energii w statystyce. Widok to wyjaśnia.
- Historia i trendy wyjaśnia, że tabele są podsumowaniami, a godzinowe dane tego samego importu służą też Historycznemu potencjałowi i korekcie prognozy. Pokazuje, czy automatyczne uzupełnianie ostatniego tygodnia raz na dobę jest włączone. Samych średnich z tabel nie mnożymy dodatkowo przez prognozę.

Reguły obliczeń, archiwum, ustawienia i dotychczasowa kalibracja pozostają bez zmian.
