# Aktualizacja PV Lab 0.6.3

Wgraj zawartość paczki aktualizacyjnej do głównego katalogu repozytorium, zachowując strukturę. Przeciągnij rozpakowane foldery i pliki do strony przesyłania GitHub. Nie trzeba niczego usuwać.

Po zakończeniu publikacji zaktualizuj aplikację PV Lab w Home Assistant. Nowa diagnostyka działa w aplikacji; integracja HACS ma zgodny numer wydania.

1. Otwórz „Napięcia i przestoje”.
2. W polu „Dzień” wybierz 15 maja 2026.
3. Kliknij „Analizuj dzień z InfluxDB”. Korzystamy z zapisanego połączenia; nie importuj ponownie całej historii.
4. Po zakończeniu pobierz raport napięć i przekaż go do analizy. Sprawdzimy zwłaszcza okolice 10:30 i 14:15.

Sam próg 253 V nie dowodzi wyłączenia. Prawdopodobny przestój wymaga spadku mocy, nieprawidłowego statusu i wcześniejszej produkcji przy wysokim napięciu. Diagnostyka nie jest potwierdzeniem przyczyny zabezpieczenia. Nie oblicza jeszcze utraconej energii i nie zmienia prognozy ani istniejących reguł importu.

Raport /data/voltage-analysis-RRRR-MM-DD.json zawiera podsumowania godzinowe i zdarzenia. Odczytane surowe szeregi napięć pozostają tylko w pamięci podczas analizy. Raporty nie są automatycznie usuwane; można je przeglądać w „Pliki i retencja” oraz pobrać osobno. Hasło InfluxDB nie trafia do raportu.
