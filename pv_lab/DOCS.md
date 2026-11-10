# PV Lab — pierwsze kroki

1. Uruchom aplikację i włącz **Pokaż w panelu bocznym**.
2. Otwórz **Ustawienia**, sprawdź parametry instalacji i współrzędne pobrane z HA.
3. W **Źródłach danych** sprawdź diagnostykę Forecast.Solar, Open-Meteo i Solcast. Potwierdź w konfiguracji integracji, że Open-Meteo obejmuje obie połacie.
4. Poczekaj na pełne przedziały pomiarów i wcześniejsze prognozy. Bez nich aplikacja nie może ocenić dokładności dostawców.

Limit falownika ustawiono na **5500 W**. Próg napięcia **253 V** służy analizie i odrzucaniu próbek, a nie sterowaniu urządzeniem. Zmienisz go w ustawieniach.

Tryb demonstracyjny korzysta ze sztucznych danych. Aby oglądać swoją instalację, wybierz **Wróć do danych rzeczywistych**.

Zmiana ustawień rozpoczyna kalibrację od nowa. Dostępny jest eksport danych JSON. Import historii HA służy oglądaniu pomiarów, nie odtwarzaniu dawnych prognoz ani kalibracji.

Ta wersja nie tworzy encji i nie dostarcza jeszcze prognozy do panelu Energia. Pełny opis algorytmu, ograniczeń i przechowywania danych znajduje się w README repozytorium.
